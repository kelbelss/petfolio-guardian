import { useFeedStore } from '../../lib/feedStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignTypedData, useWriteContract } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { fetchQuote } from '../../lib/oneInch';
import { parseEther, formatEther } from 'viem';

// Placeholder values for domain/types/value
const PERMIT2_DOMAIN = { name: 'Permit2', version: '1', chainId: 1, verifyingContract: '0x0000000000000000000000000000000000000001' as `0x${string}` };
const PERMIT2_TYPES = { Permit: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }] };
const PERMIT2_VALUE = { owner: '0x...', spender: '0x...', value: 1 };

const LOP_DOMAIN = { name: 'LimitOrderProtocol', version: '1', chainId: 1, verifyingContract: '0x0000000000000000000000000000000000000002' as `0x${string}` };
const ORDER_TYPES = { Order: [{ name: 'maker', type: 'address' }, { name: 'taker', type: 'address' }, { name: 'amount', type: 'uint256' }] };
const ORDER_VALUE = { maker: '0x...', taker: '0x...', amount: 1 };

const TWAP_ROUTER = '0xRouter';
const routerAbi = [
    { name: 'fillOrder', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'order', type: 'tuple' }, { name: 'makerSig', type: 'bytes' }, { name: 'chunkIn', type: 'uint256' }, { name: 'interaction', type: 'bytes' }], outputs: [] }
];

function formatInterval(seconds: number) {
    if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
    return `${Math.round(seconds / 86400)} days`;
}

export default function ReviewFeed() {
    const draft = useFeedStore();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<'idle' | 'permit' | 'order' | 'tx' | 'done' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);
    const navigate = useNavigate();

    // Calculate chunkIn and slices for summary (placeholder logic)
    const chunkIn = draft.total ? (draft.total / 4).toFixed(2) : '0';
    const intervalLabel = formatInterval(draft.interval);
    const slices = 4; // Placeholder for now

    // 1inch quote
    const quoteQuery = useQuery({
        queryKey: ['quote', draft.srcToken, draft.dstToken, chunkIn],
        queryFn: () => fetchQuote(draft.srcToken, draft.dstToken, parseEther(chunkIn).toString()),
        enabled: !!draft.srcToken && !!draft.dstToken && !!chunkIn && chunkIn !== '0',
        retry: 1,
    });
    const toTokenAmount = quoteQuery.data?.toTokenAmount;
    const estimatedGas1inch = quoteQuery.data?.estimatedGas;
    const minOut = useMemo(() => toTokenAmount ? (BigInt(toTokenAmount) * 99n / 100n).toString() : undefined, [toTokenAmount]);

    // Store minOut in wizard store for later use
    if (minOut && draft.minOut !== minOut) {
        useFeedStore.setState({ ...draft, minOut });
    }

    // Gas estimate (placeholder, should use viem's estimateGas for fillOrder)
    // For now, just use estimatedGas1inch as a fallback
    const gasEth = estimatedGas1inch ? formatEther(BigInt(estimatedGas1inch)) : undefined;
    // TODO: Replace with viem estimateGas for fillOrder

    // Disable Start if neither quote nor gas estimate is available
    const canStart = !!toTokenAmount || !!gasEth;

    const { signTypedDataAsync: signPermitAsync } = useSignTypedData();
    const { signTypedDataAsync: signOrderAsync } = useSignTypedData();
    const { writeContractAsync } = useWriteContract();

    async function handleSignAndSend() {
        setStatus('permit');
        setError(null);
        try {
            // 1. Sign Permit2
            await signPermitAsync({
                domain: PERMIT2_DOMAIN,
                types: PERMIT2_TYPES,
                primaryType: 'Permit',
                message: PERMIT2_VALUE,
            });
            setStatus('order');
            // 2. Sign LimitOrder
            const orderSig = await signOrderAsync({
                domain: LOP_DOMAIN,
                types: ORDER_TYPES,
                primaryType: 'Order',
                message: ORDER_VALUE,
            });
            setStatus('tx');
            // 3. Write contract
            const tx = await writeContractAsync({
                address: TWAP_ROUTER,
                abi: routerAbi,
                functionName: 'fillOrder',
                args: [ORDER_VALUE, orderSig, chunkIn, '0x'],
            });
            setTxHash(tx);
            setStatus('done');
            setOpen(false);
            // Navigate to dashboard, passing orderHash (tx)
            navigate('/', { state: { orderHash: tx } });
        } catch (err: unknown) {
            setError((err as Error)?.message || 'Error');
            setStatus('error');
        }
    }

    return (
        <div className="max-w-3xl w-full mx-auto px-4 py-6">
            <h2 className="text-2xl font-bold mb-6">Review Feed</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div>Swap <b>{chunkIn}</b> USDC → <b>{draft.dstToken || '...'}</b> every <b>{intervalLabel}</b> for <b>{slices}</b> occurrences.</div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Dialog.Root open={open} onOpenChange={setOpen}>
                        <Dialog.Trigger asChild>
                            <Button disabled={!canStart}>Start</Button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
                            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded bg-white p-6 shadow-lg">
                                <Dialog.Title className="text-lg font-bold mb-4">Signature Required</Dialog.Title>
                                <div className="mb-4">
                                    {status === 'idle' && <Button onClick={handleSignAndSend}>Sign & Start</Button>}
                                    {status === 'permit' && <SpinnerWithText text="Signing Permit…" />}
                                    {status === 'order' && <SpinnerWithText text="Signing Order…" />}
                                    {status === 'tx' && <SpinnerWithText text="Broadcasting Tx…" />}
                                    {status === 'done' && <div className="text-green-600">Order broadcast! Tx: {txHash}</div>}
                                    {status === 'error' && <div className="text-red-600">{error}</div>}
                                </div>
                                <Dialog.Close asChild>
                                    <Button variant="outline">Cancel</Button>
                                </Dialog.Close>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </CardFooter>
            </Card>
            {/* Advanced box */}
            <div className="mt-4 p-4 rounded bg-gray-900 text-gray-400 text-sm">
                <div className="font-semibold mb-2">Advanced</div>
                {quoteQuery.isLoading && <SpinnerWithText text="Fetching quote…" />}
                {quoteQuery.isError && (
                    <div className="flex items-center gap-2 text-red-500">
                        Failed to fetch quote. <button onClick={() => quoteQuery.refetch()} className="underline">Retry</button>
                    </div>
                )}
                {toTokenAmount && (
                    <div>1 slice ≈ {Number(formatEther(BigInt(toTokenAmount))).toFixed(4)} ETH</div>
                )}
                {gasEth && (
                    <div>Est. gas: {Number(gasEth).toFixed(6)} ETH</div>
                )}
                {!toTokenAmount && !gasEth && !quoteQuery.isLoading && (
                    <div>No quote or gas estimate available.</div>
                )}
            </div>
        </div>
    );
}

function SpinnerWithText({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2">
            <svg className="animate-spin h-5 w-5 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>{text}</span>
        </div>
    );
} 