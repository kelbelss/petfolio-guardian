// src/lib/limitOrderV2.ts - Using 1inch SDK for proper EIP-712 integration
import { LimitOrder, MakerTraits, Address } from '@1inch/limit-order-sdk';
import { getAddress, hexToBytes, bytesToHex, encodeAbiParameters, parseAbiParameters, type PublicClient, type WalletClient } from 'viem';
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
  const receiverAddress = new Address(params.maker); // Always use maker as receiver for DCA

  // Generate random salt for order uniqueness
  const salt = BigInt(Math.floor(Math.random() * 1_000_000_000));

  // Set order expiration (1 hour from now)
  const expiresIn = 3600n;
  const expiration = BigInt(Math.floor(Date.now() / 1000)) + expiresIn;

  // Create maker traits with expiration
  const makerTraits = MakerTraits.default().withExpiration(expiration);

  // --- START: Permit2 Signature Generation ---
  let permitSignature: `0x${string}` = "0x";
  // TEMPORARILY DISABLE PERMIT2 FOR BASIC WORKING ORDER
  console.log('⚠️ Permit2 temporarily disabled for basic working order');
  
  // if (params.enablePermit2) {
  //   try {
  //     const { buildPermit2Signature } = await import('./permit2');
  //     console.log('Attempting to build Permit2 signature...');
  //     permitSignature = await buildPermit2Signature(
  //       publicClient,
  //       walletClient,
  //       params.maker,
  //       params.makerAsset, // Token to be approved
  //       getAddress(CONTRACT_ADDRESSES.PERMIT2), // Spender is Permit2 contract
  //       makingAmount.toString(), // Amount to permit
  //       3600 // 1 hour deadline
  //     );
  //     console.log('✅ Permit2 signature generated:', permitSignature);
  //     console.log('🔍 Permit2 signature length:', permitSignature.length);
  //     console.log('🔍 Permit2 signature starts with 0x:', permitSignature.startsWith('0x'));
  //   } catch (error) {
  //     console.error('❌ Failed to generate Permit2 signature:', error);
  //     console.error('❌ Permit2 error details:', {
  //       message: error instanceof Error ? error.message : String(error),
  //       stack: error instanceof Error ? error.stack : undefined
  //     });
  //     // Decide if you want to throw or proceed without Permit2
  //     // For hackathon, proceeding might be acceptable if it's not critical
  //     permitSignature = "0x"; // Fallback to no permit
  //   }
  // }
  // --- END: Permit2 Signature Generation ---

  // Build interactions if TWAP or Aave params are provided
  let interactions: `0x${string}` = "0x";
  // TEMPORARILY DISABLE INTERACTIONS FOR BASIC WORKING ORDER
  console.log('⚠️ Interactions temporarily disabled for basic working order');
  
  // if (params.twapParams || params.aaveParams) {
  //   // TEMPORARILY DISABLE INTERACTIONS FOR TESTING
  //   console.log('⚠️ Interactions temporarily disabled for testing');
  //   interactions = "0x";
  // }

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

  const orderObject = { 
    ...typedData.message, 
    hash: orderHash,
    expiration: expiration.toString(), // Ensure expiration is included
    receiver: params.maker, // Ensure receiver is set to maker address
    // Ensure permit and interactions are included in the returned order object for Supabase
    permit: permitSignature,
    interactions: interactions,
  };
  
  console.log('🔍 Final order object debug:', {
    permit: orderObject.permit,
    permitLength: orderObject.permit ? orderObject.permit.length : 0,
    interactions: orderObject.interactions,
    interactionsLength: orderObject.interactions ? orderObject.interactions.length : 0,
    hasPermit: !!orderObject.permit && orderObject.permit !== "0x",
    hasInteractions: !!orderObject.interactions && orderObject.interactions !== "0x"
  });
  
  return { 
    order: orderObject, 
    signature,
    typedData 
  };
}

export async function fillOrderTxV2(
  walletClient: WalletClient,
  publicClient: PublicClient,
  order: Record<string, unknown>, 
  signature: `0x${string}`, 
  account: `0x${string}`,
  skipValidation = false // Add option to skip validation for testing
) {
  console.log('🚀 Starting fillOrder transaction with 1inch SDK...');
  console.log('🔍 Received order object:', order);

  try {
    // Add debugging for token balance and allowance
    const makerAsset = order.makerAsset as `0x${string}`;
    const makingAmount = BigInt(order.makingAmount as string);
    
    console.log('🔍 Checking token balance and allowance...');
    console.log('🔍 Maker asset:', makerAsset);
    console.log('🔍 Making amount:', makingAmount.toString());
    
    if (!skipValidation) {
      // Check token balance
      if (makerAsset === '0x4200000000000000000000000000000000000006') { // WETH
        const ethBalance = await publicClient.getBalance({ address: account });
        console.log('🔍 ETH balance:', ethBalance.toString());
        if (ethBalance < makingAmount) {
          throw new Error(`Insufficient ETH balance. Required: ${makingAmount.toString()}, Available: ${ethBalance.toString()}`);
        }
      } else {
        // Check ERC20 balance
        const ERC20_ABI = await import('@/abis/ERC20.json');
        const tokenBalance = await publicClient.readContract({
          address: makerAsset,
          abi: ERC20_ABI.default,
          functionName: 'balanceOf',
          args: [account]
        }) as bigint;
        console.log('🔍 Token balance:', tokenBalance.toString());
        if (tokenBalance < makingAmount) {
          throw new Error(`Insufficient token balance. Required: ${makingAmount.toString()}, Available: ${tokenBalance.toString()}`);
        }
      }
      
      // Check allowance for Limit Order Protocol
      const LIMIT_ORDER_PROTOCOL = getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL);
      const ERC20_ABI = await import('@/abis/ERC20.json');
      const allowance = await publicClient.readContract({
        address: makerAsset,
        abi: ERC20_ABI.default,
        functionName: 'allowance',
        args: [account, LIMIT_ORDER_PROTOCOL]
      }) as bigint;
      console.log('🔍 Allowance for Limit Order Protocol:', allowance.toString());
      if (allowance < makingAmount) {
        throw new Error(`Insufficient allowance. Required: ${makingAmount.toString()}, Allowed: ${allowance.toString()}`);
      }

      // Check if order is expired
      const expiration = BigInt(order.expiration as string);
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      console.log('🔍 Order expiration:', expiration.toString());
      console.log('🔍 Current time:', currentTime.toString());
      if (currentTime > expiration) {
        throw new Error(`Order has expired. Expiration: ${expiration.toString()}, Current time: ${currentTime.toString()}`);
      }

      // Check if order is valid (non-zero amounts)
      if (makingAmount === 0n) {
        throw new Error('Order has zero making amount');
      }
      const takingAmount = BigInt(order.takingAmount as string);
      if (takingAmount === 0n) {
        throw new Error('Order has zero taking amount');
      }

      console.log('✅ Order validation passed - proceeding with fill...');
    } else {
      console.log('⚠️ Skipping validation for testing...');
    }

    // Check if the account is the maker of the order
    const maker = order.maker as `0x${string}`;
    console.log('🔍 Order maker:', maker);
    console.log('🔍 Filling account:', account);
    if (maker.toLowerCase() !== account.toLowerCase()) {
      console.warn('⚠️ Warning: Order maker does not match filling account. This might be intentional for testing.');
    }

    // Add balance and allowance checks before attempting to fill
    console.log('🔍 Pre-fill validation checks...');
    
    // Check token balance
    let tokenBalance: bigint;
    if (makerAsset === '0x4200000000000000000000000000000000000006') { // WETH
      tokenBalance = await publicClient.getBalance({ address: account });
      console.log('🔍 ETH balance:', tokenBalance.toString());
    } else {
      const ERC20_ABI = await import('@/abis/ERC20.json');
      tokenBalance = await publicClient.readContract({
        address: makerAsset,
        abi: ERC20_ABI.default,
        functionName: 'balanceOf',
        args: [account]
      }) as bigint;
      console.log('🔍 Token balance:', tokenBalance.toString());
    }
    
    // Check allowance for Limit Order Protocol
    const LIMIT_ORDER_PROTOCOL = getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL);
    const ERC20_ABI = await import('@/abis/ERC20.json');
    const allowance = await publicClient.readContract({
      address: makerAsset,
      abi: ERC20_ABI.default,
      functionName: 'allowance',
      args: [account, LIMIT_ORDER_PROTOCOL]
    }) as bigint;
    console.log('🔍 Allowance for Limit Order Protocol:', allowance.toString());
    
    // Check if order is expired
    const expiration = BigInt(order.expiration as string);
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    console.log('🔍 Order expiration:', expiration.toString());
    console.log('🔍 Current time:', currentTime.toString());
    console.log('🔍 Is expired:', currentTime > expiration);
    
    // Summary of validation
    console.log('🔍 Validation Summary:', {
      hasSufficientBalance: tokenBalance >= makingAmount,
      hasSufficientAllowance: allowance >= makingAmount,
      isNotExpired: currentTime <= expiration,
      balance: tokenBalance.toString(),
      required: makingAmount.toString(),
      allowance: allowance.toString(),
      expiration: expiration.toString(),
      currentTime: currentTime.toString()
    });

    // If allowance is insufficient, try to fix it
    if (allowance < makingAmount) {
      console.log('🔧 Attempting to fix insufficient allowance...');
      console.log('🔧 Current allowance:', allowance.toString());
      console.log('🔧 Required amount:', makingAmount.toString());
      
      try {
        // Create approval transaction
        const { encodeFunctionData } = await import('viem');
        const ERC20_ABI = await import('@/abis/ERC20.json');
        const approveData = encodeFunctionData({
          abi: ERC20_ABI.default,
          functionName: 'approve',
          args: [LIMIT_ORDER_PROTOCOL, makingAmount]
        });

        console.log('🔧 Sending approval transaction...');
        const approveHash = await walletClient.sendTransaction({
          account,
          to: makerAsset,
          data: approveData,
          value: 0n,
          chain: base,
        });

        console.log('🔧 Approval transaction sent:', approveHash);
        console.log('🔧 Waiting for confirmation...');
        
        // Wait for approval confirmation
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        console.log('🔧 Approval confirmed:', approveReceipt);
        
        // Check allowance again
        const newAllowance = await publicClient.readContract({
          address: makerAsset,
          abi: ERC20_ABI.default,
          functionName: 'allowance',
          args: [account, LIMIT_ORDER_PROTOCOL]
        }) as bigint;
        
        console.log('🔧 New allowance:', newAllowance.toString());
        
        if (newAllowance < makingAmount) {
          throw new Error(`Allowance still insufficient after approval. New: ${newAllowance.toString()}, Required: ${makingAmount.toString()}`);
        }
        
        console.log('✅ Allowance fixed successfully!');
      } catch (approvalError) {
        console.error('❌ Failed to fix allowance:', approvalError);
        throw new Error(`Failed to fix allowance: ${approvalError instanceof Error ? approvalError.message : String(approvalError)}`);
      }
    }

    // Get the full signature as a Uint8Array (65 bytes: 32 for r, 32 for s, 1 for v)
    const fullSignatureBytes = hexToBytes(signature);
    
    // Extract r, s, and v components
    const r = bytesToHex(fullSignatureBytes.slice(0, 32)) as `0x${string}`;
    const s = bytesToHex(fullSignatureBytes.slice(32, 64)) as `0x${string}`;
    const v = fullSignatureBytes[64];
    
    // Combine s and v into vs (s is 32 bytes, v is 1 byte)
    // The v (recovery ID) is encoded into the last byte of s
    const sBytes = fullSignatureBytes.slice(32, 64);
    sBytes[31] = sBytes[31] | v; // OR the last byte of s with the recovery ID
    const vs = bytesToHex(sBytes) as `0x${string}`;
    
    console.log('🔐 Signature components:', {
      r,
      s,
      v,
      vs,
      fullSignature: signature
    });

    // Import the contract ABI
    const LIMIT_ORDER_ABI = await import('@/abis/LimitOrderProtocol.json');

    // --- START: Dynamic Value for Native Token Swaps ---
    let txValue = 0n;
    // Check if the makerAsset is WETH (native token on Base)
    // Ensure order.makerAsset is a string and exists
    if (order.makerAsset && typeof order.makerAsset === 'string' &&
        order.makerAsset.toLowerCase() === CONTRACT_ADDRESSES.WETH.toLowerCase()) {
      txValue = BigInt(order.makingAmount as string); // Use makingAmount from the order
      console.log(`Detected WETH as makerAsset. Setting transaction value to: ${txValue.toString()}`);
    }
    // --- END: Dynamic Value for Native Token Swaps ---

    // Ensure all order fields are properly defined and converted to BigInt
    const orderStruct = [
      (order.makerAsset as string) || '0x0000000000000000000000000000000000000000',
      (order.takerAsset as string) || '0x0000000000000000000000000000000000000000',
      BigInt((order.makingAmount as string | number | bigint) || '0'),
      BigInt((order.takingAmount as string | number | bigint) || '0'),
      (order.maker as string) || '0x0000000000000000000000000000000000000000',
      (order.receiver as string) || (order.maker as string) || '0x0000000000000000000000000000000000000000',
      BigInt((order.salt as string | number | bigint) || '0'),
      BigInt((order.expiration as string | number | bigint) || '0'),
      BigInt((order.makerTraits as string | number | bigint) || '0')
    ];

    console.log('🔍 Order struct for fillOrder:', {
      makerAsset: orderStruct[0],
      takerAsset: orderStruct[1],
      makingAmount: orderStruct[2].toString(),
      takingAmount: orderStruct[3].toString(),
      maker: orderStruct[4],
      receiver: orderStruct[5],
      salt: orderStruct[6].toString(),
      expiration: orderStruct[7].toString(),
      makerTraits: orderStruct[8].toString()
    });

    const fillOrderArgs = [
      orderStruct, // The properly structured order tuple
      r,           // r component
      vs,          // s and v combined
      BigInt((order.makingAmount as string | number | bigint) || '0'), // Amount to fill
      0n,          // TakerTraits (0 for default)
    ];

    // Check if we have a Permit2 signature and use the appropriate function
    const hasPermit2 = order.permit && order.permit !== "0x";
    const hasInteractions = order.interactions && order.interactions !== "0x";
    
    console.log('🔍 Permit2 Debug:', {
      hasPermit2,
      hasInteractions,
      permit: order.permit,
      permitLength: order.permit ? (order.permit as string).length : 0,
      interactions: order.interactions,
      interactionsLength: order.interactions ? (order.interactions as string).length : 0
    });
    
    // Use basic fillOrder since we disabled Permit2 and interactions
    console.log('🔐 Using basic fillOrder...');
    
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
  } catch (err: unknown) {
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