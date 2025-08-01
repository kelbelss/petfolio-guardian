// src/lib/wagmiConfig.ts
// Wagmi configuration

import { createConfig, http } from 'wagmi';
import { injected, metaMask } from 'wagmi/connectors';
import { LOCAL_CHAIN, LOCAL_ANVIL_RPC } from '../config/evm';
import { BASE_NETWORK } from '@/config/base';

// Wagmi configuration
export const config = createConfig({
  chains: [LOCAL_CHAIN, BASE_NETWORK],
  transports: {
    [LOCAL_CHAIN.id]: http(LOCAL_ANVIL_RPC),
    [BASE_NETWORK.id]: http(BASE_NETWORK.rpcUrls.default.http[0])
  },
  connectors: [
    injected(),
    metaMask(),
  ],
}); 