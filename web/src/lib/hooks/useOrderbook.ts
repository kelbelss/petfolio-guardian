// src/lib/hooks/useOrderbook.ts
// React hook for 1inch Orderbook API

import { useState, useEffect, useCallback } from 'react';
import { 
  getLimitOrders, 
  getOrdersForPair, 
  getAllValidOrders,
  calculateOrderbookStats,
  groupOrdersIntoBidsAndAsks,
  type GetLimitOrdersV4Response,
  type OrderbookApiParams,
  type OrderbookStats
} from '../oneInchOrderbookApi';

interface UseOrderbookOptions {
  chainId?: number;
  autoFetch?: boolean;
  refreshInterval?: number;
}

interface UseOrderbookReturn {
  orders: GetLimitOrdersV4Response[];
  stats: OrderbookStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchOrders: (params?: OrderbookApiParams) => Promise<void>;
  fetchOrdersForPair: (makerAsset: string, takerAsset: string, limit?: number) => Promise<void>;
  fetchAllValidOrders: (limit?: number) => Promise<void>;
}

export function useOrderbook(options: UseOrderbookOptions = {}): UseOrderbookReturn {
  const { 
    chainId = 8453, 
    autoFetch = false, 
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [orders, setOrders] = useState<GetLimitOrdersV4Response[]>([]);
  const [stats, setStats] = useState<OrderbookStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (params?: OrderbookApiParams) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedOrders = await getLimitOrders(chainId, params);
      setOrders(fetchedOrders);
      setStats(calculateOrderbookStats(fetchedOrders));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(errorMessage);
      console.error('Error fetching orders:', err);
      
      // Check if it's a rate limit error and log it specifically
      if (err instanceof Error && err.message && err.message.includes('429')) {
        console.warn('Rate limited when fetching orders, consider reducing refresh frequency');
      }
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  const fetchOrdersForPair = useCallback(async (
    makerAsset: string, 
    takerAsset: string, 
    limit: number = 100
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedOrders = await getOrdersForPair(chainId, makerAsset, takerAsset, limit);
      setOrders(fetchedOrders);
      setStats(calculateOrderbookStats(fetchedOrders));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch orders for pair';
      setError(errorMessage);
      console.error('Error fetching orders for pair:', err);
      
      // Check if it's a rate limit error and log it specifically
      if (err instanceof Error && err.message && err.message.includes('429')) {
        console.warn('Rate limited when fetching pair orders, consider reducing refresh frequency');
      }
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  const fetchAllValidOrders = useCallback(async (limit: number = 500) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedOrders = await getAllValidOrders(chainId, limit);
      setOrders(fetchedOrders);
      setStats(calculateOrderbookStats(fetchedOrders));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch valid orders';
      setError(errorMessage);
      console.error('Error fetching valid orders:', err);
      
      // Check if it's a rate limit error and log it specifically
      if (err instanceof Error && err.message && err.message.includes('429')) {
        console.warn('Rate limited when fetching valid orders, consider reducing refresh frequency');
      }
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  const refetch = useCallback(async () => {
    if (orders.length > 0) {
      // Refetch with the same parameters as the last fetch
      await fetchOrders();
    }
  }, [fetchOrders, orders.length]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchAllValidOrders();
    }
  }, [autoFetch, fetchAllValidOrders]);

  // Set up refresh interval
  useEffect(() => {
    if (!autoFetch || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoFetch, refreshInterval, refetch]);

  return {
    orders,
    stats,
    isLoading,
    error,
    refetch,
    fetchOrders,
    fetchOrdersForPair,
    fetchAllValidOrders
  };
}

// Hook for specific token pair orderbook
export function usePairOrderbook(
  makerAsset: string,
  takerAsset: string,
  options: UseOrderbookOptions = {}
) {
  const { chainId = 8453, autoFetch = true, refreshInterval = 15000 } = options;
  
  const [orders, setOrders] = useState<GetLimitOrdersV4Response[]>([]);
  const [bids, setBids] = useState<GetLimitOrdersV4Response[]>([]);
  const [asks, setAsks] = useState<GetLimitOrdersV4Response[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPairOrders = useCallback(async () => {
    if (!makerAsset || !takerAsset) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const fetchedOrders = await getOrdersForPair(chainId, makerAsset, takerAsset);
      setOrders(fetchedOrders);
      
      const { bids: fetchedBids, asks: fetchedAsks } = groupOrdersIntoBidsAndAsks(
        fetchedOrders, 
        makerAsset, 
        takerAsset
      );
      
      setBids(fetchedBids);
      setAsks(fetchedAsks);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch pair orders';
      setError(errorMessage);
      console.error('Error fetching pair orders:', err);
      
      // Check if it's a rate limit error and log it specifically
      if (err instanceof Error && err.message && err.message.includes('429')) {
        console.warn('Rate limited when fetching pair orders, consider reducing refresh frequency');
      }
    } finally {
      setIsLoading(false);
    }
  }, [chainId, makerAsset, takerAsset]);

  // Auto-fetch on mount and when assets change
  useEffect(() => {
    if (autoFetch && makerAsset && takerAsset) {
      fetchPairOrders();
    }
  }, [autoFetch, makerAsset, takerAsset, fetchPairOrders]);

  // Set up refresh interval
  useEffect(() => {
    if (!autoFetch || refreshInterval <= 0 || !makerAsset || !takerAsset) return;

    const interval = setInterval(() => {
      fetchPairOrders();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoFetch, refreshInterval, fetchPairOrders, makerAsset, takerAsset]);

  return {
    orders,
    bids,
    asks,
    isLoading,
    error,
    refetch: fetchPairOrders
  };
} 