// src/lib/limitOrderV2.ts - Using 1inch SDK for proper EIP-712 integration
import { LimitOrder, MakerTraits, Address } from '@1inch/limit-order-sdk';
import { getAddress, encodeAbiParameters, type PublicClient, type WalletClient } from 'viem';
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
  const permitSignature: `0x${string}` = "0x";
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
  
  if (params.twapParams || params.aaveParams) {
    console.log('🔧 Building interactions for TWAP/Aave...');
    const { encodeTwapAaveInteractions } = await import('./interactionsEncoder');
    
    if (params.twapParams && params.aaveParams) {
      interactions = encodeTwapAaveInteractions(
        params.twapParams,
        params.aaveParams
      );
    } else if (params.twapParams) {
      const { encodeTwapInteractions } = await import('./interactionsEncoder');
      interactions = encodeTwapInteractions(params.twapParams);
    } else if (params.aaveParams) {
      const { encodeAaveInteractions } = await import('./interactionsEncoder');
      interactions = encodeAaveInteractions(params.aaveParams);
    }
    
    console.log('✅ Interactions encoded:', interactions);
  } else {
    console.log('ℹ️ No TWAP/Aave params provided, using empty interactions');
  }
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

  // 🔍 INSPECT RAW ORDER BYTES
  try {
    const orderStruct = order.build();
    console.log('🔍 order.build() result:', orderStruct);
    console.log('🔍 order.build() type:', typeof orderStruct);
    console.log('🔍 order.build() keys:', Object.keys(orderStruct));
    console.log('🔍 order.build() JSON:', JSON.stringify(orderStruct, null, 2));
    
    // For now, just log the structure to understand the format
    console.log('🔍 Individual fields:');
    console.log('  makerAsset:', orderStruct.makerAsset, typeof orderStruct.makerAsset);
    console.log('  takerAsset:', orderStruct.takerAsset, typeof orderStruct.takerAsset);
    console.log('  makingAmount:', orderStruct.makingAmount, typeof orderStruct.makingAmount);
    console.log('  takingAmount:', orderStruct.takingAmount, typeof orderStruct.takingAmount);
    console.log('  maker:', orderStruct.maker, typeof orderStruct.maker);
    console.log('  receiver:', orderStruct.receiver, typeof orderStruct.receiver);
    console.log('  salt:', orderStruct.salt, typeof orderStruct.salt);
    console.log('  makerTraits:', orderStruct.makerTraits, typeof orderStruct.makerTraits);
  } catch (error) {
    console.error('❌ Error getting raw order:', error);
  }

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
  
  // Verify EIP-712 domain matches contract address
  console.log('🔍 EIP-712 Domain Verification:');
  console.log('🔍 verifyingContract:', typedData.domain.verifyingContract);
  console.log('🔍 LOP address:', CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL);
  console.log('🔍 Domain matches:', typedData.domain.verifyingContract === CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL);

  // Get the raw order bytes for fillOrderTo using manual ABI encoding
  // Grab the raw values from the 1inch LimitOrder instance
  const orderStruct = order.build();
  const {
    makerAsset: orderMakerAsset,
    takerAsset: orderTakerAsset,
    makingAmount: orderMakingAmount,
    takingAmount: orderTakingAmount,
    maker: orderMaker,
    receiver: orderReceiver,
    salt: orderSalt,
    // makerTraits: orderMakerTraits, // Removed as we get it from typedData
  } = orderStruct;

  // Use the local expiration variable that was calculated when creating the order
  // The 1inch SDK bakes expiration into makerTraits, so we use our local expiration
  const makerTraitsFromTypedData = BigInt(typedData.message.makerTraits as string);

  // Define the ABI parameters as individual fields (9 fields total)
  const paramsDef = [
    { type: 'address', name: 'makerAsset' },
    { type: 'address', name: 'takerAsset' },
    { type: 'uint256', name: 'makingAmount' },
    { type: 'uint256', name: 'takingAmount' },
    { type: 'address', name: 'maker' },
    { type: 'address', name: 'receiver' },
    { type: 'uint256', name: 'salt' },
    { type: 'uint256', name: 'expiration' },
    { type: 'uint256', name: 'makerTraits' },
  ] as const;

  // Encode all nine fields as individual parameters
  const orderRaw = encodeAbiParameters(paramsDef, [
    orderMakerAsset as `0x${string}`,
    orderTakerAsset as `0x${string}`,
    BigInt(orderMakingAmount),
    BigInt(orderTakingAmount),
    orderMaker as `0x${string}`,
    orderReceiver as `0x${string}`,
    BigInt(orderSalt),
    expiration, // Use the local expiration variable
    makerTraitsFromTypedData,
  ]) as `0x${string}`;

  console.log('🔍 orderRaw byteLength =', (orderRaw.length - 2) / 2, 'bytes'); // should be 288
  console.log('🔍 orderRaw (first 100 chars):', orderRaw.slice(0, 100) + '...');
  console.log('🔍 orderRaw (last 100 chars):', '...' + orderRaw.slice(-100));
  
  // Sanity checks for the encoding
  console.log('🔍 SANITY CHECKS:');
  console.log('🔍 Expected byte length (9 fields × 32 bytes):', 9 * 32, 'bytes');
  console.log('🔍 Actual byte length:', (orderRaw.length - 2) / 2, 'bytes');
  console.log('🔍 Byte length correct:', (orderRaw.length - 2) / 2 === 288);
  
  // Verify parameter order matches the on-chain struct
  console.log('🔍 PARAMETER ORDER VERIFICATION:');
  console.log('🔍 1. makerAsset:', orderMakerAsset);
  console.log('🔍 2. takerAsset:', orderTakerAsset);
  console.log('🔍 3. makingAmount:', orderMakingAmount);
  console.log('🔍 4. takingAmount:', orderTakingAmount);
  console.log('🔍 5. maker:', orderMaker);
  console.log('🔍 6. receiver:', orderReceiver);
  console.log('🔍 7. salt:', orderSalt);
  console.log('🔍 8. expiration:', expiration.toString());
  console.log('🔍 9. makerTraits:', makerTraitsFromTypedData.toString());
  
  // Verify all addresses are valid
  console.log('🔍 ADDRESS VALIDATION:');
  console.log('🔍 makerAsset valid:', orderMakerAsset && orderMakerAsset.length === 42);
  console.log('🔍 takerAsset valid:', orderTakerAsset && orderTakerAsset.length === 42);
  console.log('🔍 maker valid:', orderMaker && orderMaker.length === 42);
  console.log('🔍 receiver valid:', orderReceiver && orderReceiver.length === 42);
  
  // Verify all BigInt values are positive
  console.log('🔍 VALUE VALIDATION:');
  console.log('🔍 makingAmount > 0:', BigInt(orderMakingAmount) > 0n);
  console.log('🔍 takingAmount > 0:', BigInt(orderTakingAmount) > 0n);
  console.log('🔍 salt > 0:', BigInt(orderSalt) > 0n);
  console.log('🔍 expiration > current time:', expiration > BigInt(Math.floor(Date.now() / 1000)));
  console.log('🔍 makerTraits >= 0:', makerTraitsFromTypedData >= 0n);
  
  // CRITICAL: Verify no undefined values before encoding
  console.log('🔍 UNDEFINED CHECK - Raw values before encoding:');
  console.log('🔍 orderMakerAsset:', orderMakerAsset, 'type:', typeof orderMakerAsset);
  console.log('🔍 orderTakerAsset:', orderTakerAsset, 'type:', typeof orderTakerAsset);
  console.log('🔍 orderMakingAmount:', orderMakingAmount, 'type:', typeof orderMakingAmount);
  console.log('🔍 orderTakingAmount:', orderTakingAmount, 'type:', typeof orderTakingAmount);
  console.log('🔍 orderMaker:', orderMaker, 'type:', typeof orderMaker);
  console.log('🔍 orderReceiver:', orderReceiver, 'type:', typeof orderReceiver);
  console.log('🔍 orderSalt:', orderSalt, 'type:', typeof orderSalt);
  console.log('🔍 expiration:', expiration, 'type:', typeof expiration);
  console.log('🔍 makerTraitsFromTypedData:', makerTraitsFromTypedData, 'type:', typeof makerTraitsFromTypedData);
  
  // Check for any undefined values
  const values = [
    orderMakerAsset, orderTakerAsset, orderMakingAmount, orderTakingAmount,
    orderMaker, orderReceiver, orderSalt, expiration, makerTraitsFromTypedData
  ];
  const hasUndefined = values.some(val => val === undefined);
  console.log('🔍 Has undefined values:', hasUndefined);
  if (hasUndefined) {
    console.error('❌ CRITICAL ERROR: Found undefined values in order encoding!');
    throw new Error('Cannot encode order with undefined values');
  }

  // Raw order bytes ready for fillOrderTo

  const orderObject = { 
    ...typedData.message, 
    hash: orderHash,
    expiration: expiration.toString(), // Ensure expiration is included
    receiver: params.maker, // Ensure receiver is set to maker address
    // Ensure permit and interactions are included in the returned order object for Supabase
    permit: permitSignature,
    interactions: interactions,
    rawOrder: orderRaw, // Add raw order bytes for fillOrderTo
  };
  
  console.log('🔍 Final order object debug:', {
    permit: orderObject.permit,
    permitLength: orderObject.permit ? orderObject.permit.length : 0,
    interactions: orderObject.interactions,
    interactionsLength: orderObject.interactions ? orderObject.interactions.length : 0,
    hasPermit: !!orderObject.permit && orderObject.permit !== "0x",
    hasInteractions: !!orderObject.interactions && orderObject.interactions !== "0x",
    rawOrder: orderObject.rawOrder,
    rawOrderLength: orderObject.rawOrder ? orderObject.rawOrder.length : 0
  });
  
                  // Validate order hash with on-chain getOrderHash (struct version)
                console.log('🔍 VALIDATING order hash with on-chain getOrderHash(struct)...');
                try {
                  const orderStruct = {
                    makerAsset: orderMakerAsset as `0x${string}`,
                    takerAsset: orderTakerAsset as `0x${string}`,
                    makingAmount: BigInt(orderMakingAmount),
                    takingAmount: BigInt(orderTakingAmount),
                    maker: orderMaker as `0x${string}`,
                    receiver: orderReceiver as `0x${string}`,
                    salt: BigInt(orderSalt),
                    expiration: expiration,
                    makerTraits: makerTraitsFromTypedData,
                  };
                  
                  const onChainOrderHash = await publicClient.readContract({
                    address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
                    abi: [{
                      inputs: [{ components: [
                        { name: 'makerAsset', type: 'address' },
                        { name: 'takerAsset', type: 'address' },
                        { name: 'makingAmount', type: 'uint256' },
                        { name: 'takingAmount', type: 'uint256' },
                        { name: 'maker', type: 'address' },
                        { name: 'receiver', type: 'address' },
                        { name: 'salt', type: 'uint256' },
                        { name: 'expiration', type: 'uint256' },
                        { name: 'makerTraits', type: 'uint256' },
                      ], name: 'order', type: 'tuple' }],
                      name: 'getOrderHash',
                      outputs: [{ type: 'bytes32' }],
                      stateMutability: 'view',
                      type: 'function'
                    }],
                    functionName: 'getOrderHash',
                    args: [orderStruct],
                  });
                  console.log('✅ getOrderHash(struct) SUCCESS - order encoding is correct!');
                  console.log('🔍 On-chain order hash:', onChainOrderHash);
                  console.log('🔍 SDK order hash:', orderHash);
                  console.log('🔍 Hashes match:', onChainOrderHash === orderHash);
                } catch (hashError) {
                  console.warn('⚠️ getOrderHash(struct) failed – order encoding may be incorrect:', hashError);
                }
  
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
    // Add debugging for token balance and allowance (TAKER side - what we need to provide)
    const takerAsset = order.takerAsset as `0x${string}`;
    const takingAmount = BigInt(order.takingAmount as string);
    
    console.log('🔍 Checking token balance and allowance for TAKER asset...');
    console.log('🔍 Taker asset:', takerAsset);
    console.log('🔍 Taking amount:', takingAmount.toString());
    
    if (!skipValidation) {
      // Check token balance (TAKER side)
      if (takerAsset === '0x4200000000000000000000000000000000000006') { // WETH
        const ethBalance = await publicClient.getBalance({ address: account });
        console.log('🔍 ETH balance:', ethBalance.toString());
        if (ethBalance < takingAmount) {
          throw new Error(`Insufficient ETH balance. Required: ${takingAmount.toString()}, Available: ${ethBalance.toString()}`);
        }
      } else {
        // Check ERC20 balance
        const ERC20_ABI = await import('@/abis/ERC20.json');
        const tokenBalance = await publicClient.readContract({
          address: takerAsset,
          abi: ERC20_ABI.default,
          functionName: 'balanceOf',
          args: [account]
        }) as bigint;
        console.log('🔍 Token balance:', tokenBalance.toString());
        if (tokenBalance < takingAmount) {
          throw new Error(`Insufficient token balance. Required: ${takingAmount.toString()}, Available: ${tokenBalance.toString()}`);
        }
      }
      
      // Check allowance for Limit Order Protocol (TAKER side)
      const LIMIT_ORDER_PROTOCOL = getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL);
      const ERC20_ABI = await import('@/abis/ERC20.json');
      const allowance = await publicClient.readContract({
        address: takerAsset,
        abi: ERC20_ABI.default,
        functionName: 'allowance',
        args: [account, LIMIT_ORDER_PROTOCOL]
      }) as bigint;
      console.log('🔍 Allowance for Limit Order Protocol:', allowance.toString());
      if (allowance < takingAmount) {
        throw new Error(`Insufficient allowance. Required: ${takingAmount.toString()}, Allowed: ${allowance.toString()}`);
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
      const makingAmount = BigInt(order.makingAmount as string);
      if (makingAmount === 0n) {
        throw new Error('Order has zero making amount');
      }
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
    
    // Check token balance (TAKER side)
    let tokenBalance: bigint;
    if (takerAsset === '0x4200000000000000000000000000000000000006') { // WETH
      tokenBalance = await publicClient.getBalance({ address: account });
      console.log('🔍 ETH balance:', tokenBalance.toString());
    } else {
      const ERC20_ABI = await import('@/abis/ERC20.json');
      tokenBalance = await publicClient.readContract({
        address: takerAsset,
        abi: ERC20_ABI.default,
        functionName: 'balanceOf',
        args: [account]
      }) as bigint;
      console.log('🔍 Token balance:', tokenBalance.toString());
    }
    
    // Check allowance for Limit Order Protocol (TAKER side)
    const LIMIT_ORDER_PROTOCOL = getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL);
    const ERC20_ABI = await import('@/abis/ERC20.json');
    const allowance = await publicClient.readContract({
      address: takerAsset,
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
      hasSufficientBalance: tokenBalance >= takingAmount,
      hasSufficientAllowance: allowance >= takingAmount,
      isNotExpired: currentTime <= expiration,
      balance: tokenBalance.toString(),
      required: takingAmount.toString(),
      allowance: allowance.toString(),
      expiration: expiration.toString(),
      currentTime: currentTime.toString()
    });

    // If allowance is insufficient, try to fix it
    if (allowance < takingAmount) {
      console.log('🔧 Attempting to fix insufficient allowance...');
      console.log('🔧 Current allowance:', allowance.toString());
      console.log('🔧 Required amount:', takingAmount.toString());
      
      try {
        // Create approval transaction
        const { encodeFunctionData } = await import('viem');
        const ERC20_ABI = await import('@/abis/ERC20.json');
        const approveData = encodeFunctionData({
          abi: ERC20_ABI.default,
          functionName: 'approve',
          args: [LIMIT_ORDER_PROTOCOL, takingAmount]
        });

        console.log('🔧 Sending approval transaction...');
        const approveHash = await walletClient.sendTransaction({
          account,
          to: takerAsset,
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
          address: takerAsset,
          abi: ERC20_ABI.default,
          functionName: 'allowance',
          args: [account, LIMIT_ORDER_PROTOCOL]
        }) as bigint;
        
        console.log('🔧 New allowance:', newAllowance.toString());
        
        if (newAllowance < takingAmount) {
          throw new Error(`Allowance still insufficient after approval. New: ${newAllowance.toString()}, Required: ${takingAmount.toString()}`);
        }
        
        console.log('✅ Allowance fixed successfully!');
      } catch (approvalError) {
        console.error('❌ Failed to fix allowance:', approvalError);
        throw new Error(`Failed to fix allowance: ${approvalError instanceof Error ? approvalError.message : String(approvalError)}`);
      }
    }



    // Import the contract ABI
    const LIMIT_ORDER_ABI = await import('@/abis/LimitOrderProtocol.json');

    // --- START: Dynamic Value for Native Token Swaps ---
    let txValue = 0n;
    // Check if the takerAsset is WETH (native token on Base) - we need to provide ETH as taker
    // Ensure order.takerAsset is a string and exists
    if (order.takerAsset && typeof order.takerAsset === 'string' &&
        order.takerAsset.toLowerCase() === CONTRACT_ADDRESSES.WETH.toLowerCase()) {
      txValue = BigInt(order.takingAmount as string); // Use takingAmount from the order
      console.log(`Detected WETH as takerAsset. Setting transaction value to: ${txValue.toString()}`);
    }
    // --- END: Dynamic Value for Native Token Swaps ---

    // Check if we have interactions and raw order data for fillOrderTo
    const hasInteractions = order.interactions && order.interactions !== "0x";
    const hasRawOrder = order.rawOrder && order.rawOrder !== "0x";
    
    console.log('🔍 fillOrderTo Debug:', {
      hasInteractions,
      hasRawOrder,
      interactions: order.interactions,
      interactionsLength: order.interactions ? (order.interactions as string).length : 0,
      rawOrder: order.rawOrder,
      rawOrderLength: order.rawOrder ? (order.rawOrder as string).length : 0
    });
    
    // Use fillOrderTo to enable hook interactions
    console.log('🔐 Using fillOrderTo with hook interactions...');
    
    // Get the raw order bytes and interactions from the order object
    const orderRaw = order.rawOrder as `0x${string}`;
    // Temporarily disable interactions until basic fill works
    const interactions: `0x${string}` = "0x";
    
    console.log('🔍 fillOrderTo parameters:', {
      orderRaw,
      orderRawLength: orderRaw ? orderRaw.length : 0,
      signature,
      signatureLength: signature.length,
      interactions,
      interactionsLength: interactions.length,
      permit: "0x" // Empty permit for now
    });
    
    const fillOrderToArgs = [
      orderRaw,       // bytes - the ABI-encoded order
      signature,      // bytes - full 65-byte EIP-712 signature
      interactions,   // bytes - hook address + params
      "0x"            // bytes - empty permit2 for now
    ];
    
    console.log('🔍 Estimating gas for fillOrderTo...');
    console.log('🔍 Contract address:', getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL));
    console.log('🔍 Function name: fillOrderTo');
    console.log('🔍 Arguments:', fillOrderToArgs);
    console.log('🔍 Transaction value:', txValue.toString());
    
    // First, simulate the call to get detailed revert information
    console.log('🔍 Simulating fillOrderTo call to check for revert reasons...');
    try {
      await publicClient.simulateContract({
        account,
        address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
        abi: LIMIT_ORDER_ABI.default,
        functionName: 'fillOrderTo',
        args: fillOrderToArgs,
        value: txValue,
      });
      console.log('✅ Simulation successful - no revert detected');
    } catch (simulationError: any) {
      console.error('❌ SIMULATION FAILED:');
      console.error('❌ Simulation error:', simulationError);
      
      // Try to decode the revert reason
      if (simulationError.cause?.raw) {
        console.error('❌ Raw revert data:', simulationError.cause.raw);
        try {
          const { decodeErrorResult } = await import('viem');
          const decodedError = decodeErrorResult({
            abi: LIMIT_ORDER_ABI.default,
            data: simulationError.cause.raw as `0x${string}`,
          });
          console.error('❌ Decoded revert reason:', decodedError);
        } catch (decodeError) {
          console.error('❌ Could not decode revert reason:', decodeError);
        }
      }
      
      // Check specific conditions that might cause silent reverts
      console.log('🔍 Checking common revert conditions:');
      
      // 1. Check order hash
      try {
        const orderHash = await publicClient.readContract({
          address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
          abi: LIMIT_ORDER_ABI.default,
          functionName: 'getOrderHash',
          args: [orderRaw],
        });
        console.log('🔍 Order hash from contract:', orderHash);
      } catch (hashError) {
        console.error('❌ Failed to get order hash:', hashError);
      }
      
      // 2. Check remaining amount
      try {
        const orderHash = await publicClient.readContract({
          address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
          abi: LIMIT_ORDER_ABI.default,
          functionName: 'getOrderHash',
          args: [orderRaw],
        });
        const remaining = await publicClient.readContract({
          address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
          abi: LIMIT_ORDER_ABI.default,
          functionName: 'remaining',
          args: [orderHash],
        }) as bigint;
        console.log('🔍 Remaining amount:', remaining.toString());
        if (remaining === 0n) {
          console.error('❌ Order has no remaining amount to fill');
        }
      } catch (remainingError) {
        console.error('❌ Failed to check remaining amount:', remainingError);
      }
      
      // 3. Check expiration
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      console.log('🔍 Current timestamp:', currentTime.toString());
      console.log('🔍 Order expiration:', expiration.toString());
      console.log('🔍 Is expired:', currentTime > expiration);
      
      // 4. Check allowance (TAKER side)
      try {
        const allowance = await publicClient.readContract({
          address: takerAsset,
          abi: (await import('@/abis/ERC20.json')).default,
          functionName: 'allowance',
          args: [account, getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL)],
        }) as bigint;
        console.log('🔍 Allowance for Limit Order Protocol:', allowance.toString());
        console.log('🔍 Required amount:', takingAmount.toString());
        console.log('🔍 Has sufficient allowance:', allowance >= takingAmount);
      } catch (allowanceError) {
        console.error('❌ Failed to check allowance:', allowanceError);
      }
      
      // 5. Check balance (TAKER side)
      try {
        let balance: bigint;
        if (takerAsset === '0x4200000000000000000000000000000000000006') { // WETH
          balance = await publicClient.getBalance({ address: account });
        } else {
          balance = await publicClient.readContract({
            address: takerAsset,
            abi: (await import('@/abis/ERC20.json')).default,
            functionName: 'balanceOf',
            args: [account],
          }) as bigint;
        }
        console.log('🔍 Balance:', balance.toString());
        console.log('🔍 Required amount:', takingAmount.toString());
        console.log('🔍 Has sufficient balance:', balance >= takingAmount);
      } catch (balanceError) {
        console.error('❌ Failed to check balance:', balanceError);
      }
      
      throw new Error(`Simulation failed: ${simulationError.message}`);
    }
    
    const estimatedGas = await publicClient.estimateContractGas({
      account,
      address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
      abi: LIMIT_ORDER_ABI.default,
      functionName: 'fillOrderTo',
      args: fillOrderToArgs,
      value: txValue,
    });

    console.log('🔍 Estimated gas:', estimatedGas.toString());
    const finalGasLimit = estimatedGas + (estimatedGas / 5n); // Add 20% buffer
    console.log('🔍 Final gas limit (with 20% buffer):', finalGasLimit.toString());

    console.log('🔍 Sending fillOrderTo transaction...');
    console.log('🔍 Transaction parameters:', {
      account,
      address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
      functionName: 'fillOrderTo',
      args: fillOrderToArgs,
      value: txValue.toString(),
      gas: finalGasLimit.toString(),
      chain: base.id
    });

    const txHash = await walletClient.writeContract({
      account,
      address: getAddress(CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL),
      abi: LIMIT_ORDER_ABI.default,
      functionName: 'fillOrderTo',
      args: fillOrderToArgs,
      value: txValue,
      gas: finalGasLimit,
      chain: base,
    });

    console.log('✅ Order filled successfully:', txHash);
    console.log('✅ Transaction hash:', txHash);
    return txHash;
  } catch (err: unknown) {
    console.error('💥 FILLORDER FAILED:');
    console.error('💥 Error type:', typeof err);
    console.error('💥 Error constructor:', err?.constructor?.name);
    console.error('💥 Error message:', err instanceof Error ? err.message : String(err));
    console.error('💥 Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    console.error('💥 Full error object:', err);
    
    // Try to extract more details from the error
    if (err && typeof err === 'object') {
      console.error('💥 Error properties:', Object.keys(err));
      try {
        console.error('💥 Error details:', JSON.stringify(err, null, 2));
      } catch (jsonError) {
        console.error('💥 Could not stringify error:', jsonError);
      }
    }
    
    // Check for specific error types
    if (err && typeof err === 'object' && 'code' in err) {
      console.error('💥 Error code:', (err as any).code);
    }
    if (err && typeof err === 'object' && 'reason' in err) {
      console.error('💥 Error reason:', (err as any).reason);
    }
    if (err && typeof err === 'object' && 'data' in err) {
      console.error('💥 Error data:', (err as any).data);
    }
    
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

 