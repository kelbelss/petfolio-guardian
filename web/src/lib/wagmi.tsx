import { createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { WagmiProvider } from 'wagmi';
import { LOCAL_CHAIN, LOCAL_ANVIL_RPC } from '../config/evm';

// Wagmi configuration
export const config = createConfig({
  chains: [LOCAL_CHAIN],
  transports: {
    [LOCAL_CHAIN.id]: http(LOCAL_ANVIL_RPC)
  },
  connectors: [
    injected(),
    metaMask(),
  ],
});

// Web3 provider component
export function Web3Providers({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
