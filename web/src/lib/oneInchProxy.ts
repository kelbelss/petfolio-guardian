// src/lib/oneInchProxy.ts
// Centralized configuration for all 1inch API calls

import { ONEINCH_PROXY_BASE } from '../config/oneInch';

// Legacy export for backward compatibility
export const INCH_PROXY = ONEINCH_PROXY_BASE;

export const getApiHeaders = () => {
  const apiKey = import.meta.env.VITE_ONEINCH_API_KEY;
  
  if (!apiKey) {
    console.warn('1inch API key not found. Please set VITE_ONEINCH_API_KEY in your environment variables.');
  }
  
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(apiKey && { 'Authorization': `Bearer ${apiKey}` }),
  };
};

export const handleApiError = (response: Response, endpoint: string) => {
  if (!response.ok) {
    throw new Error(`1inch API error (${response.status}): ${endpoint}`);
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${ONEINCH_PROXY_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getApiHeaders(),
      ...options.headers,
    },
  });

  handleApiError(response, endpoint);
  return response.json();
}; 