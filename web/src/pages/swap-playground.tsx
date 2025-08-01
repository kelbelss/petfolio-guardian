import { useAccount, useWalletClient } from 'wagmi';
import { useSwapTx } from '@/lib/oneInchService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

export default function SwapPlayground() {
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { toast } = useToast();

    // Hard-coded swap params for 0.003 ETH → USDC on Base
    const params = {
        src: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native ETH sentinel
        dst: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
        amount: '3000000000000000', // 0.003 ETH in wei
        from: address ?? '', // connected EOA
        slippage: '1', // 1%
        receiver: address ?? '', // mandatory on some chains
        disableEstimate: 'true', // ← add back – avoids 400 for native ETH
    };

    const { data: tx, error, isFetching } = useSwapTx(params);

    const handleSwap = async () => {
        if (!tx || !address) {
            toast({
                title: 'Cannot execute swap',
                description: !tx ? 'No transaction data' : 'Wallet not connected',
                variant: 'destructive'
            });
            return;
        }

        try {
            if (!walletClient) {
                toast({
                    title: 'Wallet not available',
                    variant: 'destructive'
                });
                return;
            }

            // Prepare transaction for native ETH swap
            const transaction = { ...tx.tx };
            transaction.value = params.amount; // Add value field for native ETH
            delete transaction.gas; // Let MetaMask estimate gas

            const hash = await walletClient.sendTransaction(transaction);
            toast({
                title: 'Swap sent!',
                description: `Transaction hash: ${hash}`
            });
        } catch (err) {
            toast({
                title: 'Swap failed',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-6 text-emerald-600">🔄 Swap Playground</h2>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Fixed Trade: 0.003 ETH → USDC</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-gray-600">
                        <p><strong>From:</strong> 0.003 ETH (Native)</p>
                        <p><strong>To:</strong> USDC (0x8335...2913)</p>
                        <p><strong>Slippage:</strong> 1%</p>
                        <p><strong>Wallet:</strong> {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}</p>
                    </div>

                    <Button
                        onClick={handleSwap}
                        disabled={!tx || isFetching || !address}
                        className="w-full"
                    >
                        {isFetching ? 'Loading...' : 'Execute Swap'}
                    </Button>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-red-600 text-sm">
                                <strong>Error:</strong> {String(error.message)}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Debug Info</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2">Swap Parameters:</h4>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {JSON.stringify(params, null, 2)}
                            </pre>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-2">Transaction Data:</h4>
                            <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                                {tx ? JSON.stringify(tx, null, 2) : 'Loading...'}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 