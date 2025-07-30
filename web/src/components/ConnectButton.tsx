import { Button } from '@/components/ui/button';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function ConnectButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected) {
        return (
            <Button
                variant="outline"
                onClick={() => disconnect()}
                className="bg-white border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"
            >
                {address?.slice(0, 6)}…{address?.slice(-4)} (Disconnect)
            </Button>
        );
    }

    const handleConnect = () => {
        if (connectors[0]) {
            connect({ connector: connectors[0] });
        }
    };

    return (
        <Button
            onClick={handleConnect}
            disabled={isPending || !connectors[0]}
            className="bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all"
        >
            {isPending ? 'Connecting…' : 'Connect Wallet'}
        </Button>
    );
}
