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
// - No chain ID parameter (hardcoded to Base)
// - Cleaner error handling
// - Consistent API patterns

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

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
export async function getQuote(src: string, dst: string, amount: string) {
  const qs = new URLSearchParams({ src, dst, amount }).toString();
  const url = ix(`/swap/v6.0/${CHAIN}/quote?${qs}`);
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) {
    throw new Error(`Quote failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/** GET /swap – returns tx object ready for wallet */
export async function getSwapTx(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const url = ix(`/swap/v6.0/${CHAIN}/swap?${qs}`);
  const res = await fetch(url, { headers: HEADERS });

  if (!res.ok) {
    // surface the JSON body so we know **why** it failed
    const txt = await res.text();
    let msg   = txt;
    try   { msg = JSON.parse(txt).description || txt; }  // 1inch returns {error,description}
    catch { /* fallback to raw text */ }
    throw new Error(`Swap failed: ${res.status} – ${msg}`);
  }
  return res.json();
}

/** GET /tokens - get token list */
export async function getTokens() {
  const url = ix(`/token/v1.2/${CHAIN}`);
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
  
  return response.json();
}

/** GET /price - get token price */
export async function getTokenPrice(tokenAddress: string) {
  const url = ix(`/price/v1.1/${CHAIN}/${tokenAddress}`);
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) {
    throw new Error(`Price failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/** GET /gas-price - get gas price */
export async function getGasPrice() {
  const url = ix(`/gas-price/v1.5/${CHAIN}`);
  const response = await fetch(url, { headers: HEADERS });
  
  if (!response.ok) {
    throw new Error(`Gas price failed: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Types
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
  fromToken: TokenMeta;
  toToken: TokenMeta;
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedGas: string;
  validUntil: number;
}

// React Query hooks
export const useQuote = (
  src: string,
  dst: string,
  amount: string,
  opts?: Partial<UseQueryOptions>
) =>
  useQuery({
    queryKey: ['quote', src, dst, amount],
    queryFn: async () => {
      const r = await getQuote(src, dst, amount);
      // Normalize response to always have toTokenAmount
      return r.toTokenAmount ? r : { ...r, toTokenAmount: r.dstAmount };
    },
    enabled: !!src && !!dst && !!amount && amount !== '0' && src !== dst,
    staleTime: 30_000,
    retry: 2,
    ...opts,
  });

export const useSwapTx = (params: Record<string, string>) =>
  useQuery({
    queryKey: ['swap', params],
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
    staleTime: 1000 * 30, // 30 seconds
    retry: 2,
  });

export const useTokenPrice = (tokenAddress: string) =>
  useQuery({
    queryKey: ['price', tokenAddress],
    queryFn: () => getTokenPrice(tokenAddress),
    enabled: !!tokenAddress,
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