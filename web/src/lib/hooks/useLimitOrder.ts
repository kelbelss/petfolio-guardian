import { useQuery, useMutation } from '@tanstack/react-query';
import { buildAndSignOrder, fillOrderTx, remaining } from '@/lib/limitOrder';
import { createWalletClient, custom, maxUint256 } from 'viem';
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
  predicates: `0x${string}`;
  interactions: `0x${string}`;
};

/** read remaining() every 30 s */
export const useRemaining = (hash?: `0x${string}`) =>
  useQuery({
    queryKey : ['remaining', hash],
    queryFn  : () => remaining(hash!),
    enabled  : !!hash,
    refetchInterval: 30_000,
  });

/** create + sign order */
export const useCreateOrder = () =>
  useMutation({
    mutationFn: buildAndSignOrder,
  });

/** fill an order (or a TWAP chunk) */
export const useFillOrder = () =>
  useMutation({
    mutationFn: ({ order, signature, account }: { order: OrderStruct; signature: `0x${string}`; account: `0x${string}` }) =>
      fillOrderTx(order, signature, account),
  });

const client = createWalletClient({
  chain: base,
  transport: custom(window.ethereum!)
});

/** approve ERC-20 for LimitOrderProtocol */
export const useApprove = () =>
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

/** cancel a limit order on-chain */
export const useCancelOrder = () =>
  useMutation({
    mutationFn: async (orderHash: `0x${string}`) => {
      // TODO: Implement proper cancel functionality
      // For now, just return a placeholder
      
      throw new Error('Cancel functionality not yet implemented');
    },
  }); 