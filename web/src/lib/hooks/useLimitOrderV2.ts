// src/lib/hooks/useLimitOrderV2.ts - Using 1inch SDK for proper EIP-712 integration
import { useQuery, useMutation } from '@tanstack/react-query';
import { buildAndSignOrderV2, fillOrderTxV2, remainingV2, test1inchSDK } from '@/lib/limitOrderV2';
import { createWalletClient, custom, maxUint256, type WalletClient, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import ERC20_ABI from '@/abis/ERC20.json';
import { CONTRACT_ADDRESSES } from '@/config/base';

// Import the OrderStruct type from limitOrder.ts
type OrderStruct = {
  maker: `0x${string}`;
  receiver: `0x${string}`;
  makerAsset: `0x${string}`;
  takerAsset: `0x${string}`;
  makingAmount: bigint;
  takingAmount: bigint;
  salt: bigint;
  permit: `0x${string}`;
  predicate: `0x${string}`; // Changed from 'predicates' to 'predicate'
  interactions: `0x${string}`;
  hash?: `0x${string}`; // Add hash as optional, as it's added by buildAndSignOrderV2
};

/** read remaining() every 30 s */
export const useRemainingV2 = (publicClient: PublicClient, hash?: `0x${string}`) =>
  useQuery({
    queryKey: ['remainingV2', hash],
    queryFn: () => remainingV2(publicClient, hash!),
    enabled: !!hash,
    refetchInterval: 30_000,
  });

/** create + sign order using 1inch SDK */
export const useCreateOrderV2 = () =>
  useMutation({
    mutationFn: ({ walletClient, publicClient, ...params }: {
      walletClient: WalletClient;
      publicClient: PublicClient;
      makerAsset: `0x${string}`;
      takerAsset: `0x${string}`;
      makingHuman: number;
      takingHuman: string; // Changed to string for precision
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
    }) => buildAndSignOrderV2(walletClient, publicClient, params),
  });

/** fill an order (or a TWAP chunk) using 1inch SDK */
export const useFillOrderV2 = () =>
  useMutation({
    mutationFn: ({ walletClient, publicClient, order, signature, account }: { 
      walletClient: WalletClient;
      publicClient: PublicClient;
      order: OrderStruct; 
      signature: `0x${string}`; 
      account: `0x${string}` 
    }) => fillOrderTxV2(walletClient, publicClient, order, signature, account),
  });

const client = createWalletClient({
  chain: base,
  transport: custom(window.ethereum!)
});

/** approve ERC-20 for LimitOrderProtocol */
export const useApproveV2 = () =>
  useMutation({
    mutationFn: async ({ tokenAddress, account }: { tokenAddress: `0x${string}`; account: `0x${string}` }) =>
      client.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL, maxUint256],
        account,
      }),
  });

/** test 1inch SDK integration */
export const useTest1inchSDK = () =>
  useMutation({
    mutationFn: test1inchSDK,
  });

/** cancel a limit order on-chain */
export const useCancelOrderV2 = () =>
  useMutation({
    mutationFn: async (orderHash: `0x${string}`) => {
      // TODO: Implement proper cancel functionality
      // This would require:
      // 1. Calling the cancel function on the limit order contract
      // 2. Updating the feed status in Supabase
      // 3. Handling gas estimation and transaction confirmation
      // For now, just return a placeholder
      console.log('Cancel order:', orderHash); // Use the parameter to avoid warning
      throw new Error('Cancel functionality not yet implemented');
    },
  }); 