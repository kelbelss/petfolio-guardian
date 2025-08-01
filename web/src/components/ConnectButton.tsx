import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';

export default function ConnectButton() {
    /* live connection state -------------------------------------------------- */
    const { address, isConnected } = useAccount();

    /* wagmi actions ----------------------------------------------------------- */
    const { connect, connectors, isPending } = useConnect();
    const { disconnect } = useDisconnect();

    /* single MetaMask connector (the one we added in config) ------------------ */
    const metaMask = connectors[0];

    /* UI: not connected ------------------------------------------------------- */
    if (!isConnected) {
        return (
            <Button
                onClick={() => connect({ connector: metaMask })}
                disabled={isPending}
                className="bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all"
            >
                {isPending ? 'Connecting…' : 'Connect Wallet'}
            </Button>
        );
    }

    /* UI: connected ----------------------------------------------------------- */
    return (
        <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            <Button
                variant="outline"
                onClick={() => disconnect()}
                className="bg-white border-green-200 text-green-600 hover:bg-green-50 hover:border-green-300"
            >
                Disconnect
            </Button>
        </div>
    );
}
