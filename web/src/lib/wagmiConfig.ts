// wagmi v2
import { createConfig, http } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

import { LOCAL_CHAIN, LOCAL_ANVIL_RPC } from '@/config/evm';
import { BASE_NETWORK } from '@/config/base';

export const config = createConfig({
  chains: [LOCAL_CHAIN, BASE_NETWORK],
  transports: {
    [LOCAL_CHAIN.id]: http(LOCAL_ANVIL_RPC),
    [BASE_NETWORK.id]: http(BASE_NETWORK.rpcUrls.default.http[0]),
  },
  /* ────────────────────────────────────────────────────────────────
     metaMask() already extends `injected()`. We only need metaMask.
     In wagmi v2, shimDisconnect is handled differently.
  ───────────────────────────────────────────────────────────────── */
  connectors: [
    metaMask(),
  ],
}); 