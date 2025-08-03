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
  // permit2Signature?: `0x${string}`; // REMOVED: Permit2 signature is passed separately to fillOrderTo
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
    // permit2Signature // REMOVED: No longer destructured here
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
  const interactions = `${CONTRACT_ADDRESSES.TWAP_DCA}${encodedParams.slice(2)}`;
  
  // Add explicit debug logs to confirm execution path
  console.log('--- interactionsEncoder Debug Check ---');
  console.log('Initial interactions (before any potential Permit2 append):', interactions);
  console.log('Initial interactions length:', interactions.length);
  console.log('TWAP_DCA address:', CONTRACT_ADDRESSES.TWAP_DCA);
  console.log('TWAP_DCA address length:', CONTRACT_ADDRESSES.TWAP_DCA.length);
  console.log('Encoded params:', encodedParams);
  console.log('Encoded params length:', encodedParams.length);
  console.log('Encoded params slice(2):', encodedParams.slice(2));
  console.log('Encoded params slice(2) length:', encodedParams.slice(2).length);
  
  // Make ABSOLUTELY SURE the Permit2 concatenation block below is removed/commented out
  // if (permit2Signature && permit2Signature !== "0x") {
  //   const permit2Interaction = `${CONTRACT_ADDRESSES.PERMIT2}${permit2Signature.slice(2)}`;
  //   interactions += permit2Interaction.slice(2);
  // }

  console.log('Final interactions (after potential Permit2 append check):', interactions);
  console.log('Final interactions length:', interactions.length);
  console.log('Expected length (40 chars for address + 352 chars for params + 0x):', 40 + 352 + 2);
  console.log('--- End interactionsEncoder Debug Check ---');
  
  console.log('🔍 Interactions Debug:', {
    twapDcaAddress: CONTRACT_ADDRESSES.TWAP_DCA,
    encodedParamsLength: encodedParams.length,
    encodedParams: encodedParams,
    interactionsLength: interactions.length,
    interactions: interactions,
    finalLength: interactions.length
  });
  
  // REMOVED: Do NOT add Permit2 signature to interactions. It's a separate argument in fillOrderTo.
  // if (permit2Signature && permit2Signature !== "0x") {
  //   const permit2Interaction = `${CONTRACT_ADDRESSES.PERMIT2}${permit2Signature.slice(2)}`;
  //   interactions += permit2Interaction.slice(2);
  // }
  
  return interactions as `0x${string}`;
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

/**
 * Test function to verify interactions encoding
 */
export function testInteractionsEncoding() {
  console.log('🧪 Testing interactions encoding...');
  
  const testParams = {
    twapParams: {
      interval: 3600,
      chunks: 1,
      chunkIn: 1000000000000000000n,
      minOut: 900000000000000000n,
    },
    aaveParams: {
      depositToAave: false,
      recipient: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      aavePool: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    }
  };
  
  const result = encodeInteractions(testParams);
  console.log('🧪 Test result:', {
    result,
    length: result.length,
    expectedLength: 40 + 352 + 2, // address + params + 0x
    isCorrectLength: result.length === (40 + 352 + 2)
  });
  
  return result;
} 