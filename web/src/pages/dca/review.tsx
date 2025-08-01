import { useEffect } from 'react';
import { useFeedStore } from '../../lib/feedStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';
import { useQuote } from '@/lib/oneInchService';
import { calculateDcaParameters } from '@/lib/dcaCalculations';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { toWei, getTokenDecimals } from '@/lib/utils';
import { useCreateOrder } from '@/lib/hooks/useLimitOrder';
import { CONTRACT_ADDRESSES } from '@/config/base';
import { buildPermit2Tx } from '@/lib/permit2';
import { usePublicClient, useWalletClient } from 'wagmi';

export default function DcaReview() {
    const draft = useFeedStore();
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { mutateAsync: createOrder, isPending: isLoading } = useCreateOrder();

    // Convert human chunkIn to wei
    const amountWei =
        draft.srcToken && draft.chunkIn
            ? toWei(draft.chunkIn, draft.srcToken, getTokenDecimals(draft.srcToken))
            : '0';

    // Fetch a price quote (classical swap returns dstAmount)
    const {
        data: quoteData,
        isFetching: quoteLoading,
        isError: quoteError,
    } = useQuote(
        draft.srcToken,
        draft.dstToken,
        amountWei,
        {
            enabled: Boolean(
                draft.srcToken &&
                draft.dstToken &&
                amountWei !== '0' &&
                draft.srcToken !== draft.dstToken
            ),
        }
    );

    // Debug logging
    useEffect(() => {
        console.log('🔁 DCA Review — quote hook state:', { quoteLoading, quoteError, quoteData });
    }, [quoteLoading, quoteError, quoteData]);

    // Read toTokenAmount from normalized response
    const rawAmount = quoteData?.toTokenAmount;
    useEffect(() => {
        if (rawAmount) console.log('✅ DCA Review — received rawAmount:', rawAmount);
    }, [rawAmount]);

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
    const dstDecimals = draft.dstToken
        ? getTokenDecimals(draft.dstToken)
        : 18;
    const takingHuman = Number(rawAmount) / 10 ** dstDecimals;

    // Redirect if draft incomplete
    if (!draft.srcToken || !draft.dstToken) {
        return <Navigate to="/dca/setup" replace />;
    }

    // Compute DCA parameters for display
    const dcaParams = calculateDcaParameters({
        chunkIn: draft.chunkIn,
        endDate: draft.endDate,
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

            if (!isNativeEth) {
                try {
                    toast({ title: '1️⃣ Permit 2 – sign & send' });

                    const approvalAmountWei = toWei(draft.chunkIn, draft.srcToken, getTokenDecimals(draft.srcToken));

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
                    takingHuman,
                    maker: address as `0x${string}`,
                });

                // 8) Store order metadata
                localStorage.setItem(
                    'orderMeta',
                    JSON.stringify({
                        orderHash: order.hash,
                        srcToken: order.makerAsset,
                        dstToken: order.takerAsset,
                        chunkSize: draft.chunkIn,
                        period: draft.interval,
                        createdAt: Date.now(),
                        nextFillTime: Date.now() + draft.interval * 1000,
                    })
                );

                toast({ title: 'Limit order created successfully!' });
                navigate('/dca/feeds');
            } catch (orderError) {
                console.error('Order creation failed:', orderError);
                toast({
                    title: 'Limit order creation failed',
                    description: String(orderError),
                    variant: 'destructive'
                });
            }
        } catch (err) {
            console.error('Unexpected error:', err);
            toast({ variant: 'destructive', title: 'Unexpected error', description: String(err) });
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Review DCA Order</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold">DCA Parameters</h3>
                            <p>From: {draft.srcToken}</p>
                            <p>To: {draft.dstToken}</p>
                            <p>Amount per cycle: {draft.chunkIn}</p>
                            <p>Frequency: {draft.interval} seconds</p>
                            <p>Total cycles: {dcaParams.totalCycles}</p>
                            <p>Estimated days: {dcaParams.estimatedDays}</p>
                        </div>
                    </div>
                </CardContent>

                {/* Debug info */}
                <div className="mt-4 p-4 bg-gray-50 rounded">
                    <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(
                            { rawAmount, takingHuman, quoteLoading, quoteError },
                            null,
                            2
                        )}
                    </pre>
                </div>

                <CardFooter>
                    <Button onClick={handleConfirm} className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating Order…' : 'Confirm DCA Order'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
