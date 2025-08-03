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
// TOKEN ADDRESSES (Base Mainnet)
// ============================================================================

export const BASE_TOKENS = {
  // Native token
  ETH: '0x4200000000000000000000000000000000000006', // WETH on Base
  
  // Major tokens
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  WBTC: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  UNI: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
  
  // DeFi tokens
  AAVE: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  LINK: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  CRV: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  
  // Stablecoins
  FRAX: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
  LUSD: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
} as const;

// ============================================================================
// CONTRACT ADDRESSES
// ============================================================================

export const CONTRACT_ADDRESSES = {
  // Limit Order Protocol (1inch Router)
  LIMIT_ORDER_PROTOCOL: '0x111111125421ca6dC452d289314280a0f8842A65' as `0x${string}`,
  
  // Your custom contracts (update these with your deployed addresses)
  TWAP_DCA: '0x0B5c1388D02346820E40aDa23754baD5d6702E3C' as `0x${string}`,
  
  // Universal contracts
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3' as `0x${string}`,
  WETH: BASE_TOKENS.ETH,
  WETH_ON_BASE: BASE_TOKENS.ETH, // Explicit WETH address for Base
} as const;

// ============================================================================
// 1INCH API CONFIGURATION
// ============================================================================

export const ONEINCH_CONFIG = {
  CHAIN_ID: 8453, // Base
  API_BASE_URL: 'https://api.1inch.dev',
  ROUTER_ADDRESS: CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL,
} as const;

// ============================================================================
// LIMIT ORDER CONSTANTS
// ============================================================================

export const LIMIT_ORDER_CONSTANTS = {
  ORDER_TYPE_HASH: '0x0991b33aefc2c2d1e56f8ef3622ec8e80979a0713fc9c4e1497740efcf809939',
  DOMAIN_NAME: '1inch Limit Order Protocol',
  DOMAIN_VERSION: '4',
  DOMAIN_SEPARATOR: '0x0991b33aefc2c2d1e56f8ef3622ec8e80979a0713fc9c4e1497740efcf809939',
} as const;

// ============================================================================
// PERMIT2 CONFIGURATION
// ============================================================================

export const PERMIT2_DOMAIN = {
  name: 'Permit2',
  version: '1',
  chainId: 8453,
  verifyingContract: CONTRACT_ADDRESSES.PERMIT2,
} as const;

// ============================================================================
// EVENT POLLING CONFIGURATION
// ============================================================================

export const EVENT_POLLING_CONFIG = {
  DEFAULT_BLOCK_RANGE: 1000,
  MAX_BLOCK_RANGE: 10000,
  POLLING_INTERVAL: 1000, // 1 second
} as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CHAIN_ID = 8453; // Base

// ============================================================================
// COMMON TOKENS FOR UI
// ============================================================================

export const COMMON_TOKENS = [
  { symbol: 'ETH', address: BASE_TOKENS.ETH, name: 'Ethereum', decimals: 18 },
  { symbol: 'USDC', address: BASE_TOKENS.USDC, name: 'USD Coin', decimals: 6 },
  { symbol: 'DAI', address: BASE_TOKENS.DAI, name: 'Dai', decimals: 18 },
  { symbol: 'USDT', address: BASE_TOKENS.USDT, name: 'Tether', decimals: 6 },
  { symbol: 'WBTC', address: BASE_TOKENS.WBTC, name: 'Wrapped Bitcoin', decimals: 8 },
  { symbol: 'UNI', address: BASE_TOKENS.UNI, name: 'Uniswap', decimals: 18 },
] as const;

// ============================================================================
// FALLBACK TOKENS (if API fails)
// ============================================================================

export const FALLBACK_TOKENS = COMMON_TOKENS;

// ============================================================================
// WETH ADDRESSES BY CHAIN
// ============================================================================

// WETH addresses by chain (for cross-chain compatibility)
export const WETH_BY_CHAIN = {
  1:     "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // Ethereum
  8453:  "0x4200000000000000000000000000000000000006", // Base
  137:   "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // Polygon
  42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // Arbitrum
  10:    "0x4200000000000000000000000000000000000006", // Optimism
} as const; 