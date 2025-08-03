import { CONTRACT_ADDRESSES, COMMON_TOKENS } from '@/lib/constants';

// Helper to check if token is ETH
export function isEthToken(tokenAddress: string): boolean {
  return tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
}

// Helper to get WETH address
export function getWethAddress(): string {
  return COMMON_TOKENS[0].address;
}

// Contract configurations for DCA integration
export const CONTRACT_CONFIGS = {
  TWAP_DCA: {
    address: CONTRACT_ADDRESSES.TWAP_DCA as `0x${string}`,
    abiPath: '../abis/twapAbi.json',
  },
  WETH: {
    address: COMMON_TOKENS[0].address as `0x${string}`,
    abiPath: '../abis/WETH.json',
  },
  PERMIT2: {
    address: CONTRACT_ADDRESSES.PERMIT2 as `0x${string}`,
    abiPath: '../abis/Permit2.json',
  },
  ERC20: {
    abiPath: '../abis/ERC20.json',
  },
} as const;

// Helper to get contract config
export function getContractConfig(contractName: keyof typeof CONTRACT_CONFIGS) {
  return CONTRACT_CONFIGS[contractName];
}

// Helper to get ERC20 contract config for a specific token
export function getErc20ContractConfig(tokenAddress: string) {
  return {
    address: tokenAddress as `0x${string}`,
    abiPath: '../abis/ERC20.json',
  };
} 