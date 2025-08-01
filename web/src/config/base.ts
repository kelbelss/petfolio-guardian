// src/config/base.ts
// Base network configuration - centralized token constants and RPC URLs

// ============================================================================
// NETWORK CONFIGURATION
// ============================================================================

export const BASE_NETWORK = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: [
        'https://mainnet.base.org',
        'https://base.blockpi.network/v1/rpc/public',
        'https://1rpc.io/base'
      ] 
    },
    public: { 
      http: [
        'https://mainnet.base.org',
        'https://base.blockpi.network/v1/rpc/public',
        'https://1rpc.io/base'
      ] 
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
} as const;

// ============================================================================
// TOKEN CONSTANTS
// ============================================================================

// Common token addresses for Base
export const BASE_TOKENS = {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  WETH: '0x4200000000000000000000000000000000000006',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  WBTC: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  LINK: '0x88DfaAABaf06f3a41D2606EA98BC8A660A3A3C3C',
} as const;

// WETH addresses by chain (for cross-chain compatibility)
export const WETH_BY_CHAIN = {
  1:     "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Ethereum
  8453:  BASE_TOKENS.WETH, // Base
  137:   "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // Polygon
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // Arbitrum
  10:    "0x4200000000000000000000000000000000000006", // Optimism
} as const;

// Fallback token metadata for Base when API fails
export const BASE_FALLBACK_TOKENS = [
  { 
    symbol: 'WETH', 
    name: 'Wrapped Ether', 
    address: BASE_TOKENS.WETH, 
    decimals: 18 
  },
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    address: BASE_TOKENS.USDC, 
    decimals: 6 
  },
  { 
    symbol: 'DAI', 
    name: 'Dai Stablecoin', 
    address: BASE_TOKENS.DAI, 
    decimals: 18 
  },
  { 
    symbol: 'USDT', 
    name: 'Tether USD', 
    address: BASE_TOKENS.USDT, 
    decimals: 6 
  },
  { 
    symbol: 'WBTC', 
    name: 'Wrapped Bitcoin', 
    address: BASE_TOKENS.WBTC, 
    decimals: 8 
  },
  { 
    symbol: 'LINK', 
    name: 'Chainlink', 
    address: BASE_TOKENS.LINK, 
    decimals: 18 
  },
] as const;

// ============================================================================
// CONTRACT ADDRESSES
// ============================================================================

// Production contract addresses on Base
export const BASE_CONTRACTS = {
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  LIMIT_ORDER_PROTOCOL: '0x111111125421cA6dc452d289314280a0f8842A65',
  TWAP_DCA: '0x0B5c1388D02346820E40aDa23754baD5d6702E3C', // Real deployed address
  AGGREGATION_ROUTER_V6: '0x111111125421cA6dc452d289314280a0f8842A65',
} as const;

// ============================================================================
// 1INCH SDK CONFIGURATION
// ============================================================================

export const BASE_ONEINCH_CONFIG = {
  NETWORK_ID: BASE_NETWORK.id,
  LIMIT_ORDER_PROTOCOL: BASE_CONTRACTS.LIMIT_ORDER_PROTOCOL,
  TWAP_HOOK_ADDRESS: BASE_CONTRACTS.TWAP_DCA,
} as const;

// ============================================================================
// LIMIT ORDER CONSTANTS
// ============================================================================

export const BASE_LIMIT_ORDER_CONSTANTS = {
  ZERO_TRAITS: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ANY_SENDER: '0x0000000000000000000000000000000000000000',
} as const;

// ============================================================================
// PERMIT2 CONFIGURATION
// ============================================================================

export const BASE_PERMIT2_DOMAIN = {
  name: 'Permit2',
  version: '1',
  chainId: BASE_NETWORK.id,
  verifyingContract: BASE_CONTRACTS.PERMIT2,
} as const;

// ============================================================================
// EVENT POLLING CONFIGURATION
// ============================================================================

export const BASE_EVENT_POLLING_CONFIG = {
  NEXT_FILL_POLL_MS: parseInt(import.meta.env.VITE_NEXT_FILL_POLL_MS || '30000'), // Default 30s, configurable via env
  MIN_POLL_INTERVAL: 5000, // Minimum 5s for power users
  MAX_POLL_INTERVAL: 60000, // Maximum 1 minute
} as const;

// ============================================================================
// EXPORT ALIASES FOR BACKWARD COMPATIBILITY
// ============================================================================

// Legacy exports for backward compatibility
export const COMMON_TOKENS = BASE_TOKENS;
export const FALLBACK_TOKENS = BASE_FALLBACK_TOKENS;
export const CONTRACT_ADDRESSES = BASE_CONTRACTS;
export const ONEINCH_CONFIG = BASE_ONEINCH_CONFIG;
export const LIMIT_ORDER_CONSTANTS = BASE_LIMIT_ORDER_CONSTANTS;
export const PERMIT2_DOMAIN = BASE_PERMIT2_DOMAIN;
export const EVENT_POLLING_CONFIG = BASE_EVENT_POLLING_CONFIG;
export const DEFAULT_CHAIN_ID = BASE_NETWORK.id; 