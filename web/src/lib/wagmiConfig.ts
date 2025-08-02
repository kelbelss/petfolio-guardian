// wagmi v2
import { createConfig, http } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

import { BASE_NETWORK } from '@/config/base';

export const config = createConfig({
  chains: [BASE_NETWORK],
  transports: {
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