import { WagmiProvider } from 'wagmi';
import { config } from './wagmiConfig';

// Web3 provider component
export function Web3Providers({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={config}>{children}</WagmiProvider>;
}
