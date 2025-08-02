import { useFeedStore } from '../../lib/feedStore';
import { useYieldFeedStore } from '../../lib/yieldFeedStore';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';
import { useQuote, useGasPrice, type QuoteResponse } from '@/lib/oneInchService';
import { calculateDcaParameters, calculateTwapParameters } from '@/lib/dcaCalculations';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { toWei, fromWei } from '@/lib/tokenUtils';
import { useCreateOrder } from '@/lib/hooks/useLimitOrder';
import { CONTRACT_ADDRESSES } from '@/config/base';
import { buildPermit2Tx } from '@/lib/permit2';
import { usePublicClient, useWalletClient } from 'wagmi';
import { usePetState } from '@/hooks/usePetState';

// Number formatting helper
const fmt = (n: number, max = 6) =>
    Intl.NumberFormat('en-US', { maximumFractionDigits: max }).format(n);

// USD helper
const usd = (val: number) => `≈ $${fmt(val, 2)}`;

// Short hash helper
const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;

// Copy to clipboard helper
const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
};

// BaseScan URL helper
const getBaseScanUrl = (address: string) => `https://basescan.org/address/${address}`;

// Interval formatting helper
const formatInterval = (seconds: number) => {
    const hours = seconds / 3600;
    if (hours >= 24) {
        const days = hours / 24;
        return `${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${hours} h`;
};

// Grid row helper
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <>
        <dt className="text-gray-600">{label}</dt>
        <dd className="font-semibold text-right truncate">{children}</dd>
    </>
);

// Token address component with copy and explorer links
const TokenAddress = ({ address }: { address: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const success = await copyToClipboard(address);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex items-center gap-2 ml-6">
            <span className="truncate max-w-[160px] cursor-help font-mono text-base" title={address}>
                {shortHash(address)}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={handleCopy}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy address"
                >
                    {copied ? (
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
                <a
                    href={getBaseScanUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View on BaseScan"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </div>
        </div>
    );
};

export default function TokenDcaReview() {
    const feedDraft = useFeedStore();
    const yieldDraft = useYieldFeedStore();

    // Use the appropriate draft based on explicit mode check and data availability
    const draft = yieldDraft.mode === 'friend' ? yieldDraft : feedDraft;



    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { mutateAsync: createOrder, isPending: isLoading } = useCreateOrder();
    const { feedDCACreation } = usePetState();

    // Get gas price for fee estimation
    const { data: gasPriceData } = useGasPrice();



    // Convert human chunkIn to wei - back to simple approach
    const amountWei = draft.srcToken && draft.chunkIn
        ? toWei(draft.chunkIn.toString(), 18) // Back to 18 decimals
        : '0';

    // Check if same token transfer
    const isSameToken = draft.srcToken === draft.dstToken;

    // Fetch a price quote (skip for same token transfers)
    const quoteEnabled = Boolean(
        draft.srcToken &&
        draft.dstToken &&
        amountWei !== '0' &&
        !isSameToken
    );

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
            enabled: quoteEnabled,
            retry: 3,
            retryDelay: 1000,
        }
    );

    // Read dstAmount from the new API response format
    const rawAmount = (quoteData as QuoteResponse)?.dstAmount;
    const quoteResponse = quoteData as QuoteResponse;

    // Debug quote response




    // Loading & error states (skip for same token transfers)
    if (!isSameToken) {
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
    }

    // Convert to human units (for same token, use chunkIn as takingHuman)
    const takingHuman = isSameToken ? draft.chunkIn : fromWei(rawAmount, 18);

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
        slippageTolerance: isSameToken ? 0 : draft.slippageTolerance, // Set minSlippage = 0 for same token
        quoteAmount: isSameToken ? amountWei : rawAmount, // Use chunkIn as quoteAmount for same token
    });

    // Compute TWAP parameters for the new contract structure
    const twapParams = calculateTwapParameters({
        chunkIn: draft.chunkIn,
        endDate: draft.endDate,
        totalAmount: draft.totalAmount,
        interval: draft.interval,
        slippageTolerance: isSameToken ? 0 : draft.slippageTolerance, // Set minSlippage = 0 for same token
        quoteAmount: isSameToken ? amountWei : rawAmount, // Use chunkIn as quoteAmount for same token
        depositToAave: false, // Always false for friend mode
        recipient: draft.mode === 'friend' ? draft.recipient as `0x${string}` : address as `0x${string}`,
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
                    toast({ description: `Permit tx sent\n${shortHash(hash)}` });

                    // Wait for transaction receipt before proceeding
                    const receipt = await publicClient.waitForTransactionReceipt({ hash });
                    if (receipt.status === 'reverted') {
                        throw new Error(`Permit2 transaction failed: ${hash}`);
                    }

                    toast({ description: `Permit tx confirmed\n${shortHash(hash)}` });
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
                    // Add Aave parameters for recipient handling
                    aaveParams: {
                        depositToAave: false, // Always false for friend mode
                        recipient: draft.mode === 'friend' ? draft.recipient as `0x${string}` : address as `0x${string}`,
                        aavePool: '0x0000000000000000000000000000000000000000' as `0x${string}`,
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
                    description: `Order ${shortHash(order.hash)} created successfully`
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
                    <h1 className="text-4xl font-bold text-emerald-700 mb-2">
                        Review {draft.mode === 'friend' ? 'Friend DCA' : draft.mode === 'general' ? 'General Yield' : draft.mode === 'aave' ? 'Aave Yield' : 'Token DCA'} Strategy
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Confirm your automated {draft.mode === 'friend' ? 'friend DCA' : draft.mode === 'general' ? 'yield farming' : draft.mode === 'aave' ? 'Aave yield' : 'token purchase'} strategy
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">
                    {/* Strategy Summary */}
                    <Card className="border-emerald-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-700">Strategy Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-[auto,1fr] gap-y-2 gap-x-4 text-sm">
                                <Row label="Source Token">
                                    <TokenAddress address={draft.srcToken} />
                                </Row>
                                <Row label="Destination Token">
                                    <TokenAddress address={draft.dstToken} />
                                </Row>
                                <Row label="Amount per Purchase">
                                    {fmt(draft.chunkIn)}
                                </Row>
                                <Row label="Interval">
                                    {formatInterval(draft.interval)}
                                </Row>
                                <Row label="Stop Condition">
                                    <span className="capitalize">{draft.stopCondition.replace('-', ' ')}</span>
                                </Row>
                                {draft.stopCondition === 'end-date' && draft.endDate && (
                                    <Row label="End Date">
                                        {new Date(draft.endDate).toLocaleDateString()}
                                    </Row>
                                )}
                                {draft.stopCondition === 'total-amount' && draft.totalAmount && (
                                    <Row label="Total Amount">
                                        {fmt(draft.totalAmount)}
                                    </Row>
                                )}
                                <Row label="Slippage Tolerance">
                                    {isSameToken ? '0% (Same token transfer)' : `${draft.slippageTolerance}%`}
                                </Row>
                                {/* Show recipient for friend mode */}
                                {draft.mode === 'friend' && draft.recipient && (
                                    <Row label="Recipient">
                                        <TokenAddress address={draft.recipient} />
                                    </Row>
                                )}
                                {draft.mode !== 'friend' && (
                                    <Row label="Recipient">
                                        <span className="opacity-50">Self (default)</span>
                                    </Row>
                                )}
                                <Row label="Deposit to Aave">
                                    <span className="opacity-50">No</span>
                                </Row>
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Execution Details */}
                    <Card className="border-emerald-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-700">Execution Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-[auto,1fr] gap-y-2 gap-x-4 text-sm">
                                <Row label="Total Cycles">
                                    {dcaParams.totalCycles}
                                </Row>
                                <Row label="Estimated Duration">
                                    {dcaParams.estimatedDays} days
                                </Row>
                                <Row label="Total Amount to DCA">
                                    {usd(dcaParams.totalAmountToDca)}
                                </Row>
                                <Row label="Min Output per Fill">
                                    {fmt(Number(fromWei(dcaParams.minOutPerFill, 18)))}
                                </Row>
                                <Row label="TWAP Min Output">
                                    {fmt(Number(fromWei(twapParams.twapParams.minOut.toString(), 18)))}
                                </Row>
                                <Row label="Current Quote">
                                    {isSameToken ? `${fmt(Number(takingHuman))} (Same token transfer)` : fmt(Number(takingHuman))}
                                </Row>
                                {!isSameToken && quoteResponse?.protocols && quoteResponse.protocols.length > 0 && (
                                    <Row label="Route">
                                        {quoteResponse.protocols.map((protocol, index) =>
                                            `${protocol.name} ${Math.round(protocol.part * 100)}%${index < quoteResponse.protocols.length - 1 ? ', ' : ''}`
                                        ).join('')}
                                    </Row>
                                )}
                                {gasPriceData && (
                                    <Row label="Est. Gas Fee">
                                        {usd((gasPriceData * 150000) / 1e18)}
                                    </Row>
                                )}
                                <Row label="Allowance Status">
                                    <span className="text-green-600">✓ Approved</span>
                                </Row>
                            </dl>
                        </CardContent>
                    </Card>
                </div>

                <CardFooter className="flex justify-between pt-8">
                    <Button
                        variant="outline"
                        onClick={() => navigate(
                            draft.mode === 'friend' ? '/dca/friend' :
                                draft.mode === 'general' ? '/yield-feed/general-yield' :
                                    draft.mode === 'aave' ? '/yield-feed/aave-yield' :
                                        '/yield-feed/token-dca'
                        )}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                        ← Back to Setup
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Creating Order...' : `Create ${draft.mode === 'friend' ? 'Friend DCA' : draft.mode === 'general' ? 'General Yield' : draft.mode === 'aave' ? 'Aave Yield' : 'DCA'} Strategy`}
                    </Button>
                </CardFooter>
            </div>
        </div>
    );
} 