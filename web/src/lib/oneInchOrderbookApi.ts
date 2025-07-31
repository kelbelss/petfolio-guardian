// src/lib/oneInchOrderbookApi.ts
// 1inch Orderbook API service for limit orders

import { ONEINCH_ENDPOINTS } from '../config/oneInch';
import { apiFetch } from './oneInchProxy';

export interface LimitOrderV4Data {
  makerAsset: string;
  takerAsset: string;
  maker: string;
  receiver?: string;
  makingAmount: string;
  takingAmount: string;
  salt: string;
  extension?: string;
  makerTraits?: string;
  makerRate: string;
  takerRate: string;
  isMakerContract: boolean;
  orderInvalidReason: string;
}

export interface GetLimitOrdersV4Response {
  signature: string;
  orderHash: string;
  createDateTime: string;
  remainingMakerAmount: string;
  makerBalance: string;
  makerAllowance: string;
  data: LimitOrderV4Data;
}

export interface OrderbookApiParams {
  page?: number;
  limit?: number;
  statuses?: string;
  sortBy?: string;
  takerAsset?: string;
  makerAsset?: string;
}

export interface OrderbookStats {
  totalOrders: number;
  validOrders: number;
  invalidOrders: number;
  totalVolume: string;
  averagePrice: string;
  lastUpdated: string;
}

/**
 * Fetch limit orders from 1inch Orderbook API
 */
export async function getLimitOrders(
  chainId: number = 8453, // Default to Base
  params: OrderbookApiParams = {}
): Promise<GetLimitOrdersV4Response[]> {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.statuses) queryParams.append('statuses', params.statuses);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.takerAsset) queryParams.append('takerAsset', params.takerAsset);
    if (params.makerAsset) queryParams.append('makerAsset', params.makerAsset);

    const endpoint = `${ONEINCH_ENDPOINTS.orderbook(chainId)}?${queryParams.toString()}`;
    const response = await apiFetch(endpoint, 15000) as GetLimitOrdersV4Response[]; // Cache orderbook data for 15 seconds
    
    return response || [];
  } catch (error) {
    console.error('Error fetching limit orders:', error);
    throw new Error(`Failed to fetch limit orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get orders for a specific token pair
 */
export async function getOrdersForPair(
  chainId: number = 8453,
  makerAsset: string,
  takerAsset: string,
  limit: number = 100
): Promise<GetLimitOrdersV4Response[]> {
  return getLimitOrders(chainId, {
    makerAsset,
    takerAsset,
    limit,
    statuses: '1,2,3' // All statuses
  });
}

/**
 * Get all valid orders for a chain
 */
export async function getAllValidOrders(
  chainId: number = 8453,
  limit: number = 500
): Promise<GetLimitOrdersV4Response[]> {
  return getLimitOrders(chainId, {
    limit,
    statuses: '1' // Only valid orders
  });
}

/**
 * Calculate orderbook statistics
 */
export function calculateOrderbookStats(orders: GetLimitOrdersV4Response[]): OrderbookStats {
  const validOrders = orders.filter(order => order.data.orderInvalidReason === '');
  const invalidOrders = orders.filter(order => order.data.orderInvalidReason !== '');
  
  const totalVolume = orders.reduce((sum, order) => {
    return sum + parseFloat(order.data.makingAmount);
  }, 0);

  const averagePrice = orders.length > 0 
    ? orders.reduce((sum, order) => {
        const price = parseFloat(order.data.takerRate) / parseFloat(order.data.makerRate);
        return sum + price;
      }, 0) / orders.length
    : 0;

  return {
    totalOrders: orders.length,
    validOrders: validOrders.length,
    invalidOrders: invalidOrders.length,
    totalVolume: totalVolume.toString(),
    averagePrice: averagePrice.toString(),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Filter orders by token address
 */
export function filterOrdersByToken(
  orders: GetLimitOrdersV4Response[],
  tokenAddress: string
): GetLimitOrdersV4Response[] {
  return orders.filter(order => 
    order.data.makerAsset.toLowerCase() === tokenAddress.toLowerCase() ||
    order.data.takerAsset.toLowerCase() === tokenAddress.toLowerCase()
  );
}

/**
 * Sort orders by price (ascending for bids, descending for asks)
 */
export function sortOrdersByPrice(
  orders: GetLimitOrdersV4Response[],
  isBid: boolean = true
): GetLimitOrdersV4Response[] {
  return [...orders].sort((a, b) => {
    const priceA = parseFloat(a.data.takerRate) / parseFloat(a.data.makerRate);
    const priceB = parseFloat(b.data.takerRate) / parseFloat(b.data.makerRate);
    
    return isBid ? priceB - priceA : priceA - priceB; // Bids: highest first, Asks: lowest first
  });
}

/**
 * Group orders into bids and asks for a specific pair
 */
export function groupOrdersIntoBidsAndAsks(
  orders: GetLimitOrdersV4Response[],
  baseToken: string,
  quoteToken: string
): {
  bids: GetLimitOrdersV4Response[];
  asks: GetLimitOrdersV4Response[];
} {
  const bids: GetLimitOrdersV4Response[] = [];
  const asks: GetLimitOrdersV4Response[] = [];

  orders.forEach(order => {
    // If maker is selling base token for quote token, it's a bid (buy order)
    if (order.data.makerAsset.toLowerCase() === baseToken.toLowerCase() &&
        order.data.takerAsset.toLowerCase() === quoteToken.toLowerCase()) {
      bids.push(order);
    }
    // If maker is selling quote token for base token, it's an ask (sell order)
    else if (order.data.makerAsset.toLowerCase() === quoteToken.toLowerCase() &&
             order.data.takerAsset.toLowerCase() === baseToken.toLowerCase()) {
      asks.push(order);
    }
  });

  return {
    bids: sortOrdersByPrice(bids, true),
    asks: sortOrdersByPrice(asks, false)
  };
} 