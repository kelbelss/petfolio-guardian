import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseUnits, formatUnits } from 'viem'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// src/lib/utils.ts
// Utility functions for the application

import { COMMON_TOKENS, FALLBACK_TOKENS } from './constants';

// Token decimal mapping for Base network
const TOKEN_DECIMALS: Record<string, number> = {
  [COMMON_TOKENS[0].address]: 18, // ETH
  [COMMON_TOKENS[1].address]: 6,  // USDC
  [COMMON_TOKENS[2].address]: 18, // DAI
  [COMMON_TOKENS[3].address]: 6,  // USDT
  [COMMON_TOKENS[4].address]: 8,  // WBTC
  [COMMON_TOKENS[5].address]: 18, // UNI
};

/**
 * Get token decimals for a given token address
 */
export function getTokenDecimals(tokenAddress: string): number {
  // Check if we have the token in our mapping
  if (TOKEN_DECIMALS[tokenAddress.toLowerCase()]) {
    return TOKEN_DECIMALS[tokenAddress.toLowerCase()];
  }
  
  // Fallback to FALLBACK_TOKENS
  const fallbackToken = FALLBACK_TOKENS.find(
    token => token.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  
  return fallbackToken?.decimals || 18; // Default to 18 if not found
}

/**
 * Convert human-readable amount to wei (token's smallest unit)
 */
export function toWei(amount: string | number, decimals: number): string {
  try {
    // Ensure amount is a string to handle large numbers and scientific notation
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    // Use parseUnits from viem for proper decimal handling
    return parseUnits(amountStr, decimals).toString();
  } catch (error) {
    console.error('Error in toWei conversion:', error);
    return '0';
  }
}

/**
 * Convert wei (token's smallest unit) to human-readable amount
 */
export function fromWei(weiAmount: string | number, decimals: number): string {
  try {
    // Ensure amount is a BigInt for formatUnits
    const amountBigInt = typeof weiAmount === 'string' ? BigInt(weiAmount) : BigInt(weiAmount);
    return formatUnits(amountBigInt, decimals);
  } catch (error) {
    console.error('Error in fromWei conversion:', error);
    return '0';
  }
}



/**
 * Get token symbol from address
 */
export function getTokenSymbol(tokenAddress: string): string {
  if (!tokenAddress || typeof tokenAddress !== 'string') {
    return 'Unknown';
  }
  
  const fallbackToken = FALLBACK_TOKENS.find(
    token => token.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return fallbackToken?.symbol || 'Unknown';
}

/**
 * Get token name from address
 */
export function getTokenName(tokenAddress: string): string {
  const fallbackToken = FALLBACK_TOKENS.find(
    token => token.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  return fallbackToken?.name || 'Unknown Token';
}

/**
 * Format address for display (shortened)
 */
export function formatAddress(address: string): string {
  if (!address) return 'Unknown';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Calculate price from two token amounts
 */
export function calculatePrice(
  baseAmount: string | number,
  quoteAmount: string | number,
  baseDecimals: number = 18,
  quoteDecimals: number = 6
): number {
  const base = typeof baseAmount === 'string' ? parseFloat(baseAmount) : baseAmount;
  const quote = typeof quoteAmount === 'string' ? parseFloat(quoteAmount) : quoteAmount;
  
  const baseHuman = base / Math.pow(10, baseDecimals);
  const quoteHuman = quote / Math.pow(10, quoteDecimals);
  
  return quoteHuman / baseHuman;
}

/**
 * Validate if a string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry utility for async operations
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await sleep(delay * attempt); // Exponential backoff
    }
  }
  
  throw lastError!;
}

/**
 * Safely check if a string includes a substring
 * Prevents "Cannot read properties of undefined (reading 'includes')" errors
 */
export function safeIncludes(str: string | undefined | null, searchString: string): boolean {
  return str ? str.includes(searchString) : false;
}

/**
 * Safely check if a string includes any of the provided substrings
 */
export function safeIncludesAny(str: string | undefined | null, searchStrings: string[]): boolean {
  if (!str) return false;
  return searchStrings.some(searchString => str.includes(searchString));
}
