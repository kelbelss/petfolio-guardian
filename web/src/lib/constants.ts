// src/lib/constants.ts
// Multi-network constants and utilities

// Import Base-specific constants
export {
  COMMON_TOKENS,
  FALLBACK_TOKENS,
  CONTRACT_ADDRESSES,
  ONEINCH_CONFIG,
  LIMIT_ORDER_CONSTANTS,
  PERMIT2_DOMAIN,
  EVENT_POLLING_CONFIG,
  DEFAULT_CHAIN_ID,
  WETH_BY_CHAIN,
} from '@/config/base';

// Network/Chain Constants
export const NETWORKS = {
  BASE: 8453,
} as const;

export const DEFAULT_NETWORK = NETWORKS.BASE; // Default to Base

// Network names for display
export const NETWORK_NAMES: Record<number, string> = {
  [NETWORKS.BASE]: 'Base',
};

// Helper function to get network name
export function getNetworkName(chainId: number): string {
  return NETWORK_NAMES[chainId] || `Chain ${chainId}`;
}

// Helper function to check if chain is supported
export function isSupportedChain(chainId: number): boolean {
  return Object.values(NETWORKS).includes(chainId as typeof NETWORKS[keyof typeof NETWORKS]);
}

// Helper function to get default RPC URL for a chain
export function getDefaultRpcUrl(chainId: number): string {
  switch (chainId) {
    case NETWORKS.BASE:
      return 'https://mainnet.base.org';
    default:
      throw new Error(`No default RPC URL for chain ${chainId}`);
  }
}

// Helper function to get block explorer URL for a chain
export function getBlockExplorerUrl(chainId: number): string {
  switch (chainId) {
    case NETWORKS.BASE:
      return 'https://basescan.org';
    default:
      throw new Error(`No block explorer URL for chain ${chainId}`);
  }
}

// Helper function to get block explorer URL for an address
export function getBlockExplorerAddressUrl(chainId: number, address: string): string {
  const baseUrl = getBlockExplorerUrl(chainId);
  return `${baseUrl}/address/${address}`;
}

// Helper function to get block explorer URL for a transaction
export function getBlockExplorerTxUrl(chainId: number, txHash: string): string {
  const baseUrl = getBlockExplorerUrl(chainId);
  return `${baseUrl}/tx/${txHash}`;
} 