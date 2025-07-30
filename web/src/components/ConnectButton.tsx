import { Button } from '@/components/ui/button';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function ConnectButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected)
        return (
            <Button
                variant="outline"
                onClick={() => disconnect()}
                className="bg-white border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"
            >
                {address?.slice(0, 6)}…{address?.slice(-4)} (Disconnect)
            </Button>
        );

    return (
        <Button
            onClick={() => connect({ connector: connectors[0] })}
            disabled={isPending}
            className="bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all"
        >
            {isPending ? 'Connecting…' : 'Connect Wallet'}
        </Button>
    );
}
