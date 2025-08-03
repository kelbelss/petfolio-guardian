// src/lib/limitOrderV2.ts - Using 1inch SDK for proper EIP-712 integration
import { LimitOrder, MakerTraits, Address } from '@1inch/limit-order-sdk';
import { getAddress, type PublicClient, type WalletClient } from 'viem';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESSES } from '@/config/base';
import { toWei } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────
// 1inch SDK-based order building and signing
// ─────────────────────────────────────────────────────────────────────────

export async function buildAndSignOrderV2(
  walletClient: WalletClient,
  publicClient: PublicClient,
  params: {
    makerAsset: `0x${string}`;
    takerAsset: `0x${string}`;
    makingHuman: number; // Keep as number if it comes from draft.chunkIn
    takingHuman: string; // Change to string for precision
    maker: `0x${string}`;
    srcTokenDecimals: number; // Add this
    dstTokenDecimals: number; // Add this
    receiver?: `0x${string}`;
    twapParams?: {
      interval: number;
      chunks: number;
      chunkIn: bigint;
      minOut: bigint;
    };
    aaveParams?: {
      depositToAave: boolean;
      recipient: `0x${string}`;
      aavePool: `0x${string}`;
    };
    enablePermit2?: boolean; // Add this flag
  }
) {
  console.log('🚀 Building order with 1inch SDK...');
  
  // Convert human amounts to wei using explicit decimals
  const makingAmount = BigInt(toWei(params.makingHuman.toString(), params.srcTokenDecimals));
  const takingAmount = BigInt(toWei(params.takingHuman, params.dstTokenDecimals)); // Use takingHuman directly as string

  // Create 1inch SDK Address objects
  const makerAsset = new Address(params.makerAsset);
  const takerAsset = new Address(params.takerAsset);
  const makerAddress = new Address(params.maker);
  const receiverAddress = new Address(params.receiver || params.maker);

  // Generate random salt for order uniqueness
  const salt = BigInt(Math.floor(Math.random() * 1_000_000_000));

  // Set order expiration (1 hour from now)
  const expiresIn = 3600n;
  const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;

  // Create maker traits with expiration
  const makerTraits = MakerTraits.default().withExpiration(expiration);

  // Build interactions if TWAP or Aave params are provided
  let interactions: `0x${string}` = "0x";
  if (params.twapParams || params.aaveParams) {
    const { encodeInteractions } = await import('./interactionsEncoder');
    interactions = encodeInteractions({
      twapParams: params.twapParams,
      aaveParams: params.aaveParams,
    });
  }

  // --- START: Permit2 Signature Generation ---
  let permitSignature: `0x${string}` = "0x";
  if (params.enablePermit2) {
    try {
      const { buildPermit2Signature } = await import('./permit2');
      console.log('Attempting to build Permit2 signature...');
      permitSignature = await buildPermit2Signature(
        publicClient,
        walletClient,
        params.maker,
        params.makerAsset, // Token to be approved
        getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL), // Spender is LOP contract
        makingAmount.toString(), // Amount to permit
        3600 // 1 hour deadline
      );
      console.log('✅ Permit2 signature generated:', permitSignature);
    } catch (error) {
      console.error('❌ Failed to generate Permit2 signature:', error);
      // Decide if you want to throw or proceed without Permit2
      // For hackathon, proceeding might be acceptable if it's not critical
      permitSignature = "0x"; // Fallback to no permit
    }
  }
  // --- END: Permit2 Signature Generation ---

  console.log('📋 Order parameters:', {
    makerAsset: params.makerAsset,
    takerAsset: params.takerAsset,
    makingAmount: makingAmount.toString(),
    takingAmount: takingAmount.toString(),
    maker: params.maker,
    receiver: params.receiver || params.maker,
    salt: salt.toString(),
    expiration: expiration.toString(),
    interactionsLength: interactions.length,
    permitLength: permitSignature.length // Add permit length to logs
  });

  // Create the LimitOrder using 1inch SDK
  const order = new LimitOrder({
    makerAsset,
    takerAsset,
    makingAmount,
    takingAmount,
    maker: makerAddress,
    receiver: receiverAddress,
    salt,
  }, makerTraits);

  console.log('✅ Order created with 1inch SDK:', order);

  // Get the typed data for EIP-712 signing
  const typedData = order.getTypedData(base.id);
  
  console.log('🔐 Typed data for signing:', {
    domain: typedData.domain,
    types: Object.keys(typedData.types),
    message: typedData.message
  });

  // Sign the order using the wallet
  const signature = await walletClient.signTypedData({
    account: params.maker,
    domain: typedData.domain,
    types: typedData.types,
    primaryType: 'Order',
    message: typedData.message,
  });

  console.log('✅ Order signed successfully:', signature);

  // Get the order hash
  const orderHash = order.getOrderHash(base.id);
  
  console.log('🔍 Order hash:', orderHash);

  return { 
    order: { 
      ...typedData.message, 
      hash: orderHash,
      // Ensure permit and interactions are included in the returned order object for Supabase
      permit: permitSignature,
      interactions: interactions,
    }, 
    signature,
    typedData 
  };
}

export async function fillOrderTxV2(
  walletClient: WalletClient,
  publicClient: PublicClient,
  order: Record<string, unknown>, 
  signature: `0x${string}`, 
  account: `0x${string}`
) {
  console.log('🚀 Starting fillOrder transaction with 1inch SDK...');
  
  try {
    // Split signature into r, s, v components
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);
    const vs = s + (v - 27).toString(16).padStart(2, '0');

    console.log('🔐 Signature components:', { r, vs, v });

    // Import the contract ABI
    const LIMIT_ORDER_ABI = await import('@/abis/LimitOrderProtocol.json');

    // --- START: Dynamic Value for Native Token Swaps ---
    let txValue = 0n;
    // Check if the makerAsset is WETH (native token on Base)
    // Ensure order.makerAsset is a string and exists
    if (order.makerAsset && typeof order.makerAsset === 'string' &&
        order.makerAsset.toLowerCase() === CONTRACT_ADDRESSES.WETH_ON_BASE.toLowerCase()) {
      txValue = BigInt(order.makingAmount as string); // Use makingAmount from the order
      console.log(`Detected WETH as makerAsset. Setting transaction value to: ${txValue.toString()}`);
    }
    // --- END: Dynamic Value for Native Token Swaps ---

    // Define the arguments for the fillOrder function
    const fillOrderArgs = [
      order, // The order struct
      r,     // r component
      vs,    // s and v combined
      order.makingAmount, // Amount to fill
      0n,    // TakerTraits (0 for default)
    ];

    const estimatedGas = await publicClient.estimateContractGas({
      account,
      address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
      abi: LIMIT_ORDER_ABI.default,
      functionName: 'fillOrder',
      args: fillOrderArgs, // Pass the correct arguments here
      value: txValue, // Use the dynamically determined value here
    });

    const finalGasLimit = estimatedGas + (estimatedGas / 5n); // Add 20% buffer

    const txHash = await walletClient.writeContract({
      account,
      address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
      abi: LIMIT_ORDER_ABI.default,
      functionName: 'fillOrder',
      args: fillOrderArgs, // And here for the actual transaction
      value: txValue, // And here for the actual transaction
      gas: finalGasLimit,
      chain: base,
    });

    console.log('✅ Order filled successfully:', txHash);
    return txHash;
  } catch (err) {
    console.error('💥 fillOrder failed:', err);
    throw new Error(`fillOrder failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function remainingV2(publicClient: PublicClient, orderHash: `0x${string}`) {
  const LIMIT_ORDER_ABI = await import('@/abis/LimitOrderProtocol.json');
  
  return publicClient.readContract({
    address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
    abi: LIMIT_ORDER_ABI.default,
    functionName: 'remaining',
    args: [orderHash]
  }) as Promise<bigint>;
}

// Test function to verify 1inch SDK integration
export async function test1inchSDK() {
  try {
    console.log('🧪 Testing 1inch SDK integration...');
    
    // Create a simple test order
    const testOrder = new LimitOrder({
      makerAsset: new Address('0x4200000000000000000000000000000000000006'), // WETH on Base
      takerAsset: new Address('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'), // USDC on Base
      makingAmount: 1000000000000000000n, // 1 WETH
      takingAmount: 2000000000n, // 2000 USDC (6 decimals)
      maker: new Address('0x0000000000000000000000000000000000000000'), // Test address
      receiver: new Address('0x0000000000000000000000000000000000000000'),
      salt: 123456789n,
    }, MakerTraits.default());

    const typedData = testOrder.getTypedData(base.id);
    const orderHash = testOrder.getOrderHash(base.id);

    console.log('✅ 1inch SDK test successful:', {
      domain: typedData.domain,
      orderHash,
      hasTypedData: !!typedData
    });

    return true;
  } catch (error) {
    console.error('❌ 1inch SDK test failed:', error);
    return false;
  }
} 