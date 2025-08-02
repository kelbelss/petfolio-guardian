import { useFeedStore } from '../../lib/feedStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';
import { useQuote, type QuoteResponse } from '@/lib/oneInchService';
import { calculateDcaParameters, calculateTwapParameters } from '@/lib/dcaCalculations';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { toWei, fromWei } from '@/lib/tokenUtils';
import { useCreateOrder } from '@/lib/hooks/useLimitOrder';
import { CONTRACT_ADDRESSES } from '@/config/base';
import { buildPermit2Tx } from '@/lib/permit2';
import { usePublicClient, useWalletClient } from 'wagmi';
import { usePetState } from '@/hooks/usePetState';

export default function TokenDcaReview() {
    const draft = useFeedStore();
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { mutateAsync: createOrder, isPending: isLoading } = useCreateOrder();
    const { feedDCACreation } = usePetState();

    // Convert human chunkIn to wei
    const amountWei = draft.srcToken && draft.chunkIn
        ? toWei(draft.chunkIn.toString(), 18) // Assuming 18 decimals for now
        : '0';

    // Fetch a price quote
    const {
        data: quoteData,
        isFetching: quoteLoading,
        isError: quoteError,
    } = useQuote(
        draft.srcToken || '',
        draft.dstToken || '',
        amountWei,
        true, // includeGas
        true, // includeProtocols
        {
            enabled: Boolean(
                draft.srcToken &&
                draft.dstToken &&
                amountWei !== '0' &&
                draft.srcToken !== draft.dstToken
            ),
        }
    );

    // Read dstAmount from the new API response format
    const rawAmount = (quoteData as QuoteResponse)?.dstAmount;

    // Loading & error states
    if (quoteLoading) {
        return <div className="p-6 text-center">Loading price quote…</div>;
    }
    if (quoteError || !rawAmount) {
        return (
            <div className="p-6 text-center text-red-600">
                Error fetching quote. Please try again.
            </div>
        );
    }

    // Convert to human units
    const takingHuman = fromWei(rawAmount, 18); // Assuming 18 decimals for destination token

    // Redirect if draft incomplete
    if (!draft.srcToken || !draft.dstToken) {
        return <Navigate to="/yield-feed/token" replace />;
    }

    // Compute DCA parameters for display
    const dcaParams = calculateDcaParameters({
        chunkIn: draft.chunkIn,
        endDate: draft.endDate,
        totalAmount: draft.totalAmount,
        interval: draft.interval,
        slippageTolerance: draft.slippageTolerance,
        quoteAmount: rawAmount,
    });

    // Compute TWAP parameters for the new contract structure
    const twapParams = calculateTwapParameters({
        chunkIn: draft.chunkIn,
        endDate: draft.endDate,
        totalAmount: draft.totalAmount,
        interval: draft.interval,
        slippageTolerance: draft.slippageTolerance,
        quoteAmount: rawAmount,
    });

    // Confirm handler: build and store limit order
    async function handleConfirm() {
        if (!walletClient || !address) {
            toast({ title: 'Wallet not connected', variant: 'destructive' });
            return;
        }

        try {
            // 1) Check if native ETH (no approval needed)
            const isNativeEth = draft.srcToken.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

            if (!isNativeEth && publicClient) {
                try {
                    toast({ title: '1️⃣ Permit 2 – sign & send' });

                    const approvalAmountWei = toWei(draft.chunkIn.toString(), 18);

                    const permitTx = await buildPermit2Tx(
                        publicClient,
                        walletClient,
                        address as `0x${string}`,
                        draft.srcToken as `0x${string}`,
                        CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL,
                        approvalAmountWei
                    );

                    const hash = await walletClient.sendTransaction(permitTx);
                    toast({ description: `Permit tx sent\n${hash.slice(0, 10)}…` });

                    // Wait for transaction receipt before proceeding
                    const receipt = await publicClient.waitForTransactionReceipt({ hash });
                    if (receipt.status === 'reverted') {
                        throw new Error(`Permit2 transaction failed: ${hash}`);
                    }

                    toast({ description: `Permit tx confirmed\n${hash.slice(0, 10)}…` });
                } catch (permitError) {
                    console.error('Permit2 failed:', permitError);
                    toast({
                        title: 'Permit2 approval failed',
                        description: String(permitError),
                        variant: 'destructive'
                    });
                    return; // Don't proceed with order creation
                }
            }

            // 7) Create the limit order
            try {
                toast({ title: '2️⃣ Creating limit order…' });

                const { order } = await createOrder({
                    makerAsset: draft.srcToken as `0x${string}`,
                    takerAsset: draft.dstToken as `0x${string}`,
                    makingHuman: draft.chunkIn,
                    takingHuman: Number(takingHuman),
                    maker: address as `0x${string}`,
                    // Add TWAP parameters for the new contract structure
                    twapParams: {
                        interval: twapParams.twapParams.interval,
                        chunks: twapParams.twapParams.chunks,
                        chunkIn: twapParams.twapParams.chunkIn,
                        minOut: twapParams.twapParams.minOut,
                    },
                });

                // 8) Store order metadata
                const orderMeta = {
                    orderHash: order.hash,
                    srcToken: order.makerAsset,
                    dstToken: order.takerAsset,
                    chunkSize: draft.chunkIn,
                    period: draft.interval,
                    createdAt: Date.now(),
                    nextFillTime: Date.now() + draft.interval * 1000,
                    endDate: draft.endDate,
                    stopCondition: draft.stopCondition,
                    totalAmount: draft.totalAmount,
                };

                localStorage.setItem('orderMeta', JSON.stringify(orderMeta));

                // 9) Update pet state
                feedDCACreation(order.hash, `${draft.srcToken}-${draft.dstToken}`);

                toast({
                    title: '✅ DCA Feed Created!',
                    description: `Order ${order.hash.slice(0, 10)}… created successfully`
                });

                // 10) Navigate to dashboard
                navigate('/');
            } catch (orderError) {
                console.error('Order creation failed:', orderError);
                toast({
                    title: 'Order creation failed',
                    description: String(orderError),
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Transaction failed:', error);
            toast({
                title: 'Transaction failed',
                description: String(error),
                variant: 'destructive'
            });
        }
    }

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-emerald-700 mb-2">Review Token DCA Strategy</h1>
                    <p className="text-gray-600 text-lg">Confirm your automated token purchase strategy</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Strategy Summary */}
                    <Card className="border-emerald-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-700">Strategy Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Source Token:</span>
                                <span className="font-semibold">{draft.srcToken}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Destination Token:</span>
                                <span className="font-semibold">{draft.dstToken}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount per Purchase:</span>
                                <span className="font-semibold">{draft.chunkIn}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Interval:</span>
                                <span className="font-semibold">{draft.interval / 3600} hours</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Stop Condition:</span>
                                <span className="font-semibold capitalize">{draft.stopCondition.replace('-', ' ')}</span>
                            </div>
                            {draft.stopCondition === 'end-date' && draft.endDate && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">End Date:</span>
                                    <span className="font-semibold">{new Date(draft.endDate).toLocaleDateString()}</span>
                                </div>
                            )}
                            {draft.stopCondition === 'total-amount' && draft.totalAmount && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Total Amount:</span>
                                    <span className="font-semibold">{draft.totalAmount}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Execution Details */}
                    <Card className="border-emerald-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-700">Execution Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Cycles:</span>
                                <span className="font-semibold">{dcaParams.totalCycles}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Estimated Duration:</span>
                                <span className="font-semibold">{dcaParams.estimatedDays} days</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Total Amount to DCA:</span>
                                <span className="font-semibold">${dcaParams.totalAmountToDca.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Min Output per Fill:</span>
                                <span className="font-semibold">{fromWei(dcaParams.minOutPerFill, 18)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Current Quote:</span>
                                <span className="font-semibold">{takingHuman}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <CardFooter className="flex justify-between pt-8">
                    <Button
                        variant="outline"
                        onClick={() => navigate('/yield-feed/token-dca')}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                        ← Back to Setup
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700"
                    >
                        {isLoading ? 'Creating Order...' : 'Create DCA Strategy'}
                    </Button>
                </CardFooter>
            </div>
        </div>
    );
} 