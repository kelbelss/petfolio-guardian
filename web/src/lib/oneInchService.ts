// src/lib/oneInchService.ts
// Drop-in 1inch service layer - simplified and focused
//
// MIGRATION EXAMPLE:
// 
// OLD (complex, multiple files):
// import { useTokenPrice } from '@/lib/hooks/usePriceFeeds';
// const ethPrice = useTokenPrice(8453, '0x4200000000000000000000000000000000000006');
// 
// NEW (simple, one file):
// import { useTokenPrice } from '@/lib/oneInchService';
// const ethPrice = useTokenPrice('0x4200000000000000000000000000000000000006');
//
// Benefits:
// - Single import instead of multiple files
// - No chain ID parameter (hardcoded to Polygon)
// - Cleaner error handling
// - Consistent API patterns

import { useQuery, type UseQueryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Configuration
const CHAIN = 8453;

// every request is proxied through Vercel
const PROXY = import.meta.env.VITE_ONEINCH_PROXY;   // e.g. https://1inch-vercel-proxy-ecru.vercel.app
if (!PROXY) throw new Error('❌ VITE_ONEINCH_PROXY env var is missing');

const HEADERS = {
  'Accept'       : 'application/json',
  'Content-Type' : 'application/json',
};

export { CHAIN };               // so other helpers can import it
export const API_HEADERS = HEADERS;

export function ix(path: string) {
  // path always begins with "/"
  return `${PROXY}${path}`;
}

// Core API functions
/** GET /quote */
export async function getQuote(src: string, dst: string, amount: string, includeGas = true, includeProtocols = true) {
  const params = new URLSearchParams({ 
    src, 
    dst, 
    amount,
    includeGas: includeGas.toString(),
    includeProtocols: includeProtocols.toString()
  });
  const url = ix(`/swap/v6.0/${CHAIN}/quote?${params}`);
  
  // Debug the API call
  console.log('🌐 1inch Quote API Call:', {
    src,
    dst,
    amount,
    url: url.toString()
  });
  
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) {
    const txt = await response.text();
    console.error('❌ Quote API error:', {
      status: response.status,
      statusText: response.statusText,
      body: txt,
      url: url.toString()
    });
    throw new Error(`Quote failed: ${response.status} ${response.statusText} - ${txt}`);
  }
  
  const result = await response.json();
  console.log('✅ 1inch Quote Response:', result);
  
  return result;
}

/** GET /swap – returns tx object ready for wallet */
/** GET /approve/allowance - check token allowance */
export async function getAllowance(tokenAddress: string, walletAddress: string) {
  const url = ix(`/approve/v6.1/${CHAIN}/allowance?tokenAddress=${tokenAddress}&walletAddress=${walletAddress}`);
  const res = await fetch(url, { headers: HEADERS });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Allowance check failed: ${res.status} – ${txt}`);
  }
  return res.json();
}

/** GET /approve/transaction - get approval transaction */
export async function getApproveTransaction(tokenAddress: string, amount: string) {
  const url = ix(`/approve/v6.1/${CHAIN}/transaction?tokenAddress=${tokenAddress}&amount=${amount}`);
  const res = await fetch(url, { headers: HEADERS });
  
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Approval transaction failed: ${res.status} – ${txt}`);
  }
  return res.json();
}

export async function getSwapTx(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const url = ix(`/swap/v6.0/${CHAIN}/swap?${qs}`);
  console.log('🌐 1inch swap URL:', url);
  console.log('📋 Swap parameters:', params);
  
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    // surface the JSON body so we know **why** it failed
    const txt = await res.text();
    console.error('❌ 1inch API error response:', {
      status: res.status,
      statusText: res.statusText,
      body: txt,
      url: url
    });
    let msg = txt;
    try { 
      const parsed = JSON.parse(txt);
      msg = parsed.description || parsed.error || txt; 
    } catch { 
      /* fallback to raw text */ 
    }
    throw new Error(`Swap failed: ${res.status} – ${msg}`);
  }
  
  const result = await res.json();
  console.log('✅ 1inch swap response:', result);
  return result;
}

/** GET /tokens - get token list */
export async function getTokens() {
  const url = ix(`/token/v1.3/${CHAIN}`);
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) {
    throw new Error(`Tokens failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/** GET /balances - get token balances */
export async function getBalances(address: string, tokenAddrs: string[]) {
  const tokens = tokenAddrs.join(',');
  const url = ix(`/balance/v1.2/${CHAIN}/balances/${address}?tokens=${tokens}`);
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) {
    throw new Error(`Balances failed: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  return normalizeBalances(data);
}

/** GET /price - get token price */
export async function getTokenPrice(tokenAddress: string) {
  // 1inch spot-price endpoint is POST /v1.1/{chain} with a JSON body
  const url   = ix(`/price/v1.1/${CHAIN}`);
  const body  = JSON.stringify({ 
    tokens: [tokenAddress],
    currency: "USD"
  });
  
  const res   = await fetch(url, { method: 'POST', headers: HEADERS, body });
  if (!res.ok) {
    throw new Error(`Price failed: ${res.status} ${res.statusText}`);
  }
  // →  { "0x…tokenAddress": "1230000000000000000" }
  const data = await res.json() as Record<string, string>;
  return data;
}

/** GET /price - get bulk token prices */
export async function getBulkTokenPrices(tokenAddresses: string[]) {
  if (tokenAddresses.length === 0) return {};
  
  // 1inch spot-price endpoint is POST /v1.1/{chain} with a JSON body
  const url   = ix(`/price/v1.1/${CHAIN}`);
  const body  = JSON.stringify({ 
    tokens: tokenAddresses,
    currency: "USD"
  });
  
  const res   = await fetch(url, { method: 'POST', headers: HEADERS, body });
  if (!res.ok) {
    console.warn(`Bulk price failed: ${res.status} ${res.statusText}`);
    return {};
  }
  // →  { "0x…tokenAddress": "1230000000000000000" }
  const data = await res.json() as Record<string, string>;
  return data;
}

/** GET /gas-price - get current gas price */
export async function getGasPrice() {
  const url = ix(`/gas-price/v1.4/${CHAIN}`);
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) {
    throw new Error(`Gas price failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Type definitions
export interface TokenMeta {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface TokenMetadataResponse {
  [key: string]: TokenMeta;
}

export interface QuoteResponse {
  dstAmount: string; // Amount of destination token
  protocols: Array<{
    name: string;
    part: number;
    fromTokenAddress: string;
    toTokenAddress: string;
  }>;
  gas: number; // Gas estimate
}

// Helper to normalize balance data from different API response shapes
export function normalizeBalances(data: { balances?: Record<string, string> } | Array<{ tokenAddress: string; balance: string }> | Record<string, string> | null | undefined): Record<string, string> {
  if (!data) return {};
  
  // Handle { balances: Record<string, string> } format
  if (data && typeof data === 'object' && 'balances' in data && data.balances) {
    return data.balances as Record<string, string>;
  }
  
  // Handle Array<{ tokenAddress: string; balance: string }> format
  if (Array.isArray(data)) {
    return Object.fromEntries(
      data.map((item: { tokenAddress: string; balance: string }) => [
        item.tokenAddress,
        item.balance
      ])
    );
  }
  
  // Handle direct Record<string, string> format (what the API actually returns)
  if (data && typeof data === 'object' && !Array.isArray(data) && !('balances' in data)) {
    const recordData = data as Record<string, unknown>;
    // Check if all values are strings (balance values)
    const allStrings = Object.values(recordData).every(value => typeof value === 'string');
    if (allStrings) {
      return data as Record<string, string>;
    }
  }
  
  return {};
}

// React Query hooks
export const useQuote = (
  src: string,
  dst: string,
  amount: string,
  includeGas = true,
  includeProtocols = true,
  opts?: Partial<UseQueryOptions>
) =>
  useQuery({
    queryKey: ['quote', src, dst, amount, includeGas, includeProtocols],
    queryFn: () => getQuote(src, dst, amount, includeGas, includeProtocols),
    enabled: !!src && !!dst && src !== dst && !!amount && amount !== '0',
    staleTime: 1000 * 10, // 10 seconds
    retry: 2,
    ...opts,
  });

export const useSwapTx = (params: Record<string, string>) =>
  useQuery({
    queryKey: ['swap', params.src, params.dst, params.amount, params.from, params.slippage, params.receiver],
    queryFn: () => getSwapTx(params),
    enabled: Object.keys(params).length > 0,
    staleTime: 1000 * 5, // 5 seconds
    retry: 2,
  });

export const useTokens = () =>
  useQuery({
    queryKey: ['tokens', CHAIN],
    queryFn: getTokens,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });

export const useBalances = (address: string, tokenAddrs: string[]) =>
  useQuery({
    queryKey: ['balances', address, tokenAddrs],
    queryFn: () => getBalances(address, tokenAddrs),
    enabled: !!address && tokenAddrs.length > 0,
    staleTime: 1000 * 10, // 10 seconds - shorter for more responsive updates
    gcTime: 1000 * 60 * 5, // 5 minutes - keep in cache longer
    retry: 2,
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch when component mounts
    refetchOnReconnect: true, // Refetch when network reconnects
  });

export const useTokenPrice = (tokenAddress: string) =>
  useQuery({
    queryKey: ['price', tokenAddress],
    queryFn: () => getTokenPrice(tokenAddress),
    enabled: !!tokenAddress,
    staleTime: 1000 * 60, // 1 minute
    retry: 2,
  });

export const useBulkTokenPrices = (tokenAddresses: string[]) =>
  useQuery({
    queryKey: ['bulk-prices', tokenAddresses],
    queryFn: () => getBulkTokenPrices(tokenAddresses),
    enabled: tokenAddresses.length > 0,
    staleTime: 1000 * 60, // 1 minute
    retry: 2,
  });

export const useGasPrice = () =>
  useQuery({
    queryKey: ['gas-price', CHAIN],
    queryFn: getGasPrice,
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });

// Hook to get query client for manual cache invalidation
export function useBalanceCache() {
  const queryClient = useQueryClient();
  
  const invalidateBalances = useCallback((address?: string) => {
    if (address) {
      queryClient.invalidateQueries({ 
        queryKey: ['balances', address] 
      });
    } else {
      queryClient.invalidateQueries({ 
        queryKey: ['balances'] 
      });
    }
  }, [queryClient]);

  return { invalidateBalances };
} 