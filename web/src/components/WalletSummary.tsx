import { useAccount } from 'wagmi';
import { useBalances, useTokenPrice } from '@/lib/oneInchService';
import { COMMON_TOKENS } from '@/lib/constants';
import { fromWei } from '@/lib/utils';

export default function WalletSummary() {
    const { address } = useAccount();
    const tokenList = [COMMON_TOKENS.WETH, COMMON_TOKENS.USDC];
    const { data: balances } = useBalances(address ?? '', tokenList);
    const { data: wethUsd } = useTokenPrice(COMMON_TOKENS.WETH);

    if (!address) return null;
    if (!balances?.balances) return null;       // graceful fallback

    const wethRaw = balances.balances[COMMON_TOKENS.WETH] ?? '0';
    const weth = fromWei(wethRaw, COMMON_TOKENS.WETH);
    const usd = weth * (wethUsd?.priceUsd ?? 0);

    return (
        <div className="text-sm flex gap-4 items-center">
            <span className="font-mono">{weth.toFixed(4)} WETH</span>
            <span className="text-gray-500">${usd.toFixed(2)}</span>
        </div>
    );
} 