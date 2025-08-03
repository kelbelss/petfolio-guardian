// Aave pool addresses for Base network
export const AAVE_POOL_ADDRESSES = {
  // Main Aave V3 Pool on Base
  POOL_ADDRESSES_PROVIDER: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb' as const,
  
  // GHO pool address (commonly used for yield strategies)
  GHO_POOL: '0x4402...79F' as const, // TODO: Replace with actual GHO pool address
  
  // Default zero address for non-Aave deposits
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000' as const,
} as const;

// Gas-related constants
export const GAS_CONSTANTS = {
  // Default gas buffer for transactions (in ETH)
  DEFAULT_GAS_BUFFER: '0.001',
  
  // Estimated gas limit for typical DEX swaps
  ESTIMATED_SWAP_GAS: 150000,
  
  // Estimated gas limit for permit approvals
  ESTIMATED_PERMIT_GAS: 50000,
} as const; 