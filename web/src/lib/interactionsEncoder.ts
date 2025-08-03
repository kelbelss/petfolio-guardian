import { encodeAbiParameters, parseAbiParameters } from 'viem';
import { CONTRACT_ADDRESSES } from '@/config/base';

// TWAP parameters interface
export interface TwapParams {
  interval: number;        // Time between chunks in seconds
  chunks: number;          // Total number of chunks
  chunkIn: bigint;         // Amount per chunk
  minOut: bigint;          // Minimum output per chunk
}

// Aave integration parameters
export interface AaveParams {
  depositToAave: boolean;  // Whether to deposit to Aave after swap
  recipient: `0x${string}`; // Recipient address for Aave deposit
  aavePool: `0x${string}`;  // Aave pool address
}

// Full interactions parameters
export interface InteractionsParams {
  twapParams?: TwapParams;
  aaveParams?: AaveParams;
}

/**
 * Encode interactions data for the new 15-field struct
 * Includes TWAP parameters and Aave integration
 */
export function encodeInteractions(params: InteractionsParams): `0x${string}` {
  const {
    twapParams,
    aaveParams = {
      depositToAave: false,
      recipient: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      aavePool: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    }
  } = params;

  // Default TWAP params if not provided
  const defaultTwapParams: TwapParams = {
    interval: 3600, // 1 hour default
    chunks: 1,      // Single chunk default
    chunkIn: 0n,    // No chunking default
    minOut: 0n,     // No minimum output default
  };

  const finalTwapParams = twapParams || defaultTwapParams;

  // Encode the 15-field struct
  // Format: [hook address][encoded params]
  const encodedParams = encodeAbiParameters(
    parseAbiParameters(
      // TWAP parameters (4 fields)
      "uint64 interval,uint64 chunks,uint256 chunkIn,uint256 minOut," +
      // Aave parameters (3 fields)  
      "bool depositToAave,address recipient,address aavePool"
    ),
    [
      // TWAP params
      BigInt(finalTwapParams.interval),
      BigInt(finalTwapParams.chunks),
      finalTwapParams.chunkIn,
      finalTwapParams.minOut,
      // Aave params
      aaveParams.depositToAave,
      aaveParams.recipient,
      aaveParams.aavePool,
    ]
  );

  // Prefix with hook address - TWAP_DCA is the correct hook receiver
  const hookAddress = CONTRACT_ADDRESSES.TWAP_DCA;
  return `${hookAddress}${encodedParams.slice(2)}` as `0x${string}`;
}

/**
 * Encode TWAP-specific interactions
 */
export function encodeTwapInteractions(twapParams: TwapParams): `0x${string}` {
  return encodeInteractions({ twapParams });
}

/**
 * Encode Aave-specific interactions
 */
export function encodeAaveInteractions(aaveParams: AaveParams): `0x${string}` {
  return encodeInteractions({ aaveParams });
}

/**
 * Encode both TWAP and Aave interactions
 */
export function encodeTwapAaveInteractions(
  twapParams: TwapParams,
  aaveParams: AaveParams
): `0x${string}` {
  return encodeInteractions({ twapParams, aaveParams });
}

/**
 * Create default interactions (no TWAP, no Aave)
 */
export function encodeDefaultInteractions(): `0x${string}` {
  return encodeInteractions({});
} 