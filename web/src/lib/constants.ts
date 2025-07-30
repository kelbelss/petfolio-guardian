// src/lib/constants.ts
// Centralized constants for the application

// Common token addresses for Ethereum mainnet
export const COMMON_TOKENS = {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
} as const;

// Fallback token metadata for when API fails
export const FALLBACK_TOKENS = [
  { symbol: 'WETH', name: 'Wrapped Ether', address: COMMON_TOKENS.WETH, decimals: 18 },
  { symbol: 'USDC', name: 'USD Coin', address: COMMON_TOKENS.USDC, decimals: 6 },
  { symbol: 'DAI', name: 'Dai Stablecoin', address: COMMON_TOKENS.DAI, decimals: 18 },
  { symbol: 'USDT', name: 'Tether USD', address: COMMON_TOKENS.USDT, decimals: 6 },
  { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: COMMON_TOKENS.WBTC, decimals: 8 },
  { symbol: 'LINK', name: 'Chainlink', address: COMMON_TOKENS.LINK, decimals: 18 },
] as const;

// Contract addresses
export const CONTRACT_ADDRESSES = {
  PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  LIMIT_ORDER_PROTOCOL: '0x1111111254EEB25477B68fb85Ed929f73A960582',
  TWAP_DCA: '0x1234567890123456789012345678901234567890',

} as const;

// Common hex values for limit orders
export const LIMIT_ORDER_CONSTANTS = {
  ZERO_TRAITS: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ANY_SENDER: '0x0000000000000000000000000000000000000000',
} as const;

// Default chain ID
export const DEFAULT_CHAIN_ID = 1; // Ethereum mainnet 