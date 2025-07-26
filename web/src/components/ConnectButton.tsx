import { Button } from '@/components/ui/button';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

export default function ConnectButton() {
    const { address, isConnected } = useAccount();
    const { connect, connectors, isLoading, pendingConnector } = useConnect();
    const { disconnect } = useDisconnect();

    if (isConnected)
        return (
            <Button variant="secondary" onClick={() => disconnect()}>
                {address.slice(0, 6)}…{address.slice(-4)} (Disconnect)
            </Button>
        );

    return (
        <Button
            onClick={() => connect({ connector: connectors[0] })}
            disabled={isLoading}
        >
            {isLoading && pendingConnector?.name ? 'Connecting…' : 'Connect Wallet'}
        </Button>
    );
}
