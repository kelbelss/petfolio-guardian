import { parseUnits, formatUnits } from 'viem';

// Token metadata cache - populated once at app start
let tokenMetaCache: Record<string, { symbol: string; decimals: number }> = {};

// Initialize token metadata cache
export async function initializeTokenMeta() {
  try {
    const PROXY = import.meta.env.VITE_ONEINCH_PROXY;
    if (!PROXY) throw new Error('❌ VITE_ONEINCH_PROXY env var is missing');

    
    const response = await fetch(`${PROXY}/token/v1.2/8453`);
    const data = await response.json();
    tokenMetaCache = data;
    tokenMetaCache['0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'] = { symbol: 'ETH', decimals: 18 };
    

  } catch (error) {
    console.error('Failed to initialize token metadata:', error);
  }
}

// Safe helper for ANY token amount (balances, swap amounts)
export const toFloat = (raw: string, address: string): number => {
  try {
    const decimals = tokenMetaCache[address]?.decimals ?? 18; // fallback
    return Number(formatUnits(BigInt(raw), decimals));
  } catch (error) {
    console.error('toFloat error:', error);
    return 0;
  }
};

// Safe helper for the price endpoint (always 18 decimals)
export const toUsd = (rawPriceWei: string): number => {
  try {
    return Number(formatUnits(BigInt(rawPriceWei), 18));
  } catch (error) {
    console.error('toUsd error:', error);
    return 0;
  }
};

export const toCanonical = (token: string): string => {
  if (token === '' || token.toLowerCase() === 'eth') {
    return '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'; // Use mixed case like working test page
  }
  return token.toLowerCase();
};

export const fromWei = (amount: string, decimals: number): string => {
  try {
    return formatUnits(BigInt(amount), decimals);
  } catch (error) {
    console.error('fromWei error:', error);
    return '0';
  }
};

// Helper to normalize amount for parseUnits (handles leading dot)
const normalizeForParseUnits = (amount: string): string => {
  if (!amount || amount === '') return '0';
  return amount.startsWith('.') ? '0' + amount : amount;
};

export const toWei = (amount: string, decimals: number): string => {
  try {
    // Guard against empty string and normalize leading dot
    if (!amount || amount === '') {
      return '0';
    }
    
    const normalized = normalizeForParseUnits(amount);
    return parseUnits(normalized, decimals).toString();
  } catch (error) {
    console.error('toWei error:', error);
    return '0';
  }
};

export const sanitize = (v: string): string => {
  return v.replace(/[^0-9.]/g, '').slice(0, 24);
};

export const NATIVE_TOKEN = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

// 1inch price API uses 18 decimals for USD prices
// TODO: Verify this is correct - if stablecoins show as $0.29 instead of $1.00, 
// we may need to use 15 decimals (10n ** 15n) instead
export const PRICE_DECIMALS = 18n;

export const priceFrom1inch = (raw: string): number => {
  return Number(raw);
};

// Fixed price decoder that properly handles 1inch API response formats
export const decodeUsd = (p: Record<string, string> | undefined, tokenAddress?: string): number => {
  if (!p || !tokenAddress) {
    return 0;
  }

  const mapValue = p[tokenAddress];
  if (!mapValue) {
    return 0;
  }

  return priceFrom1inch(mapValue);
}; 