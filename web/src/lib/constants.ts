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

// Helper function to check if network supports history API
export function supportsHistoryAPI(): boolean {
  return false; // No history API support on Base
}

// Token addresses for Base chain
export const TOKEN_ADDRESSES = {
  BASE: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    WBTC: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    WETH: '0x4200000000000000000000000000000000000006',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  }
} as const;

export function getTokenAddress(token: keyof typeof TOKEN_ADDRESSES.BASE): string {
  // Always return Base addresses
  return TOKEN_ADDRESSES.BASE[token];
} 