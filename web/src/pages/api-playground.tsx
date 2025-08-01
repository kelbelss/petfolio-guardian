import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import {
    useQuote,
    useSwapTx,
    useBalances,
    useTokenPrice,
    useGasPrice,
    useTokens,
} from '@/lib/oneInchService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { toWei, getTokenDecimals } from '@/lib/utils';

export default function ApiPlayground() {
    /* ------------------------------------------------------------------ */
    /* state & hooks                                                      */
    /* ------------------------------------------------------------------ */
    const { address } = useAccount();
    const { toast } = useToast();

    // form inputs
    const [src, setSrc] = useState('0x4200000000000000000000000000000000000006'); // WETH
    const [dst, setDst] = useState('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // USDC
    const [human, setHuman] = useState(0.01);                                          // ETH
    const [slip, setSlip] = useState(1);                                             // %

    /* token list -------------------------------------------------------- */
    const { data: tokenMap } = useTokens();
    // const tokens: TokenMeta[] = useMemo(
    //     () => tokenMap ? Object.values(tokenMap) : [],
    //     [tokenMap]
    // );

    /* quote ------------------------------------------------------------- */
    const amountWei = useMemo(
        () => src ? toWei(human, src, getTokenDecimals(src)) : '0',
        [human, src]
    );
    const { data: quote, isFetching: qFetch } = useQuote(src, dst, amountWei);

    /* balances / price / gas ------------------------------------------- */
    const tokenAddrs = [src, dst];
    const { data: bals } = useBalances(address ?? '', tokenAddrs);
    const { data: price } = useTokenPrice(src);
    const { data: gas } = useGasPrice();

    /* swap TX ----------------------------------------------------------- */
    const [swapParams, setSwapParams] = useState<Record<string, string>>({});
    const {
        data: swapTx,
        isFetching: sFetch,
        refetch: fetchSwap,
    } = useSwapTx(swapParams);

    const buildSwapParams = () => {
        if (!address) {
            toast({ title: 'Connect wallet first', variant: 'destructive' });
            return;
        }
        setSwapParams({
            src,
            dst,
            amount: amountWei,
            from: address,
            slippage: slip.toString(),
            receiver: address,         // 👈 mandatory on some chains
            disableEstimate: 'true',   // 👈 gets rid of most 400s in dev
        });
        fetchSwap();
    };

    /* ------------------------------------------------------------------ */
    /* helpers                                                            */
    /* ------------------------------------------------------------------ */
    const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

    /* ------------------------------------------------------------------ */
    /* render                                                             */
    /* ------------------------------------------------------------------ */
    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-6 text-emerald-600">🧪 API Playground</h2>

            {/* — Inputs */}
            <Card className="mb-8">
                <CardHeader><CardTitle>Params</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label>Source Token (address)</Label>
                        <Input value={src} onChange={e => setSrc(e.target.value)} />
                    </div>
                    <div>
                        <Label>Destination Token (address)</Label>
                        <Input value={dst} onChange={e => setDst(e.target.value)} />
                    </div>
                    <div>
                        <Label>Amount (human units)</Label>
                        <Input type="number" step="0.0001" min="0"
                            value={human}
                            onChange={e => setHuman(Number(e.target.value))} />
                    </div>
                    <div>
                        <Label>Slippage %</Label>
                        <Input type="number" min="0" max="100"
                            value={slip}
                            onChange={e => setSlip(Number(e.target.value))} />
                    </div>
                    <div className="sm:col-span-2 flex gap-4">
                        <Button onClick={() => { }} disabled>1️⃣ Load Tokens (list auto)</Button>
                        <Button onClick={buildSwapParams} disabled={sFetch || !address}>
                            2️⃣ Get Swap TX
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* — Responses */}
            <Card>
                <CardHeader><CardTitle>Live Responses</CardTitle></CardHeader>
                <CardContent className="space-y-6 text-sm">
                    <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                        <strong>Quote</strong> {qFetch ? '…' : quote ? '✅' : '—'}
                        {quote && String(JSON.stringify(quote, null, 2))}
                    </pre>
                    <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                        <strong>Swap TX</strong> {sFetch ? '…' : swapTx ? '✅' : '—'}
                        {swapTx && String(JSON.stringify(swapTx, null, 2))}
                    </pre>
                    <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                        <strong>Balances</strong>
                        {bals && String(JSON.stringify(bals, null, 2))}
                    </pre>
                    <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                        <strong>Gas Price</strong>
                        {gas && String(JSON.stringify(gas, null, 2))}
                    </pre>
                    <pre className="p-4 bg-gray-50 rounded overflow-x-auto">
                        <strong>Spot Price ({short(src)})</strong>
                        {price && String(JSON.stringify(price, null, 2))}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
} 