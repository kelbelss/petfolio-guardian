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

export default function DcaReview() {
    const draft = useFeedStore();
    const { address } = useAccount();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { mutateAsync: createOrder, isLoading } = useCreateOrder();
    const amountWei =
        draft.srcToken && draft.chunkIn
            ? toWei(draft.chunkIn, draft.srcToken, getTokenDecimals(draft.srcToken))
            : '0';
    const { data: quoteQuery } = useQuote(
        draft.srcToken || '',
        draft.dstToken || '',
        amountWei
    );

    if (!draft.srcToken || !draft.dstToken) {
        return <Navigate to="/dca/setup" replace />;
    }

    const dcaParams = calculateDcaParameters({
        chunkIn: draft.chunkIn,
        endDate: draft.endDate,
        interval: draft.interval,
        slippageTolerance: draft.slippageTolerance,
        quoteAmount: quoteQuery?.toTokenAmount
    });

    async function handleConfirm() {
        try {
            const { order, signature } = await createOrder({
                makerAsset: draft.srcToken as `0x${string}`,
                takerAsset: draft.dstToken as `0x${string}`,
                makingHuman: draft.chunkIn,
                takingHuman: Number(quoteQuery?.toTokenAmount) / 10 ** (quoteQuery?.toToken?.decimals || 18),
                maker: address as `0x${string}`,
            });

            // Store to localStorage so dashboard & feeds can poll
            localStorage.setItem('orderMeta', JSON.stringify({
                orderHash: order.hash,       // builder sets this for you
                srcToken: order.makerAsset,
                dstToken: order.takerAsset,
                chunkSize: draft.chunkIn,
                period: draft.interval,
                createdAt: Date.now(),
                nextFillTime: Date.now() + draft.interval * 1000,
            }));

            // optional: immediately call preInteraction() on your TWAP hook
            // ...

            navigate('/dca/feeds');
        } catch (err) {
            toast({ variant: 'destructive', title: 'Order failed', description: String(err) });
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
                <CardFooter>
                    <Button onClick={handleConfirm} className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating Order...' : 'Confirm DCA Order'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
} 