import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRemovePortfolioToken } from '@/hooks/useSupabase';
import { useBalances, normalizeBalances, useTokens, useBulkTokenPrices, type TokenMeta } from '@/lib/oneInchService';
import { fromWei } from '@/lib/tokenUtils';
import TokenSearchModal from '@/components/TokenSearchModal';

interface PortfolioSectionProps {
    address?: string;
    user?: any;
}

export default function PortfolioSection({ address, user }: PortfolioSectionProps) {
    const { data: tokensData } = useTokens();
    const { mutateAsync: removePortfolioToken } = useRemovePortfolioToken();
    const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);

    // Use user's portfolio tokens - only show if user has custom tokens
    const portfolioTokens = user?.portfolio_tokens || [];

    // Always call hooks at the top level
    const { data: balancesData } = useBalances(address || '', portfolioTokens);
    const { data: bulkPrices } = useBulkTokenPrices(portfolioTokens);

    // Convert tokensData to array format (same as TokenSearchModal)
    const allTokens = useMemo(() => {
        if (!tokensData) return [];
        return Object.values(tokensData) as TokenMeta[];
    }, [tokensData]);

    // Only show portfolio if wallet is connected
    if (!address) {
        return (
            <Card className="bg-white border-green-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <span className="text-2xl">💰</span>
                        <span>Portfolio</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        Connect your wallet to view your portfolio
                    </div>
                </CardContent>
            </Card>
        );
    }

    // If no custom tokens, show empty portfolio
    if (portfolioTokens.length === 0) {
        return (
            <Card className="bg-white border-green-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">💰</span>
                            <span>Portfolio</span>
                            <button
                                onClick={() => setIsTokenModalOpen(true)}
                                className="ml-2 px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                                + Add Token
                            </button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        No tokens in your portfolio yet. Add some tokens to get started!
                    </div>
                </CardContent>

                <TokenSearchModal
                    isOpen={isTokenModalOpen}
                    onClose={() => setIsTokenModalOpen(false)}
                    walletAddress={address}
                    existingTokens={portfolioTokens}
                />
            </Card>
        );
    }

    const getPortfolioData = () => {

        const assets: Array<{
            symbol: string;
            name: string;
            balance: string;
            balanceUsd: number;
            icon?: string;
        }> = [];

        // Get token info from tokensData or use fallback
        const getTokenInfo = (tokenAddress: string) => {
            // Try to find token in allTokens first
            const token = allTokens.find((t: TokenMeta) =>
                t.address.toLowerCase() === tokenAddress.toLowerCase()
            );
            if (token) {
                return {
                    symbol: token.symbol,
                    name: token.name,
                    icon: token.logoURI,
                    decimals: token.decimals
                };
            }

            // Fallback token info
            const fallbackInfo = {
                '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE': { symbol: 'ETH', name: 'Ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', decimals: 18 },
                '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': { symbol: 'ETH', name: 'Ethereum', icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png', decimals: 18 },
                '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', name: 'USD Coin', icon: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png', decimals: 6 },
                '0x4200000000000000000000000000000000000006': { symbol: 'WETH', name: 'Wrapped Ether', icon: 'https://assets.coingecko.com/coins/images/2518/small/weth.png', decimals: 18 }
            };

            return fallbackInfo[tokenAddress as keyof typeof fallbackInfo] || { symbol: 'UNKNOWN', name: 'Unknown Token', icon: undefined, decimals: 18 };
        };

        // Show ALL portfolio tokens, not just ones with balance
        portfolioTokens.forEach((tokenAddress) => {
            const info = getTokenInfo(tokenAddress);

            // Get balance using the same pattern as swap pages
            let balance = '0';
            if (balancesData) {
                // The API returns a flat object, not nested under 'balances'
                const normalizedBalances = normalizeBalances(balancesData);

                const rawBalance = normalizedBalances[tokenAddress.toLowerCase()];
                if (rawBalance) {
                    balance = fromWei(rawBalance, info.decimals || 18);
                }
            }

            // Get price and calculate USD value
            let balanceUsd = 0;

            if (bulkPrices && balance !== '0') {
                const tokenPriceUsd = bulkPrices[tokenAddress.toLowerCase()];
                if (tokenPriceUsd) {
                    balanceUsd = Number(balance) * Number(tokenPriceUsd);
                }
            }



            assets.push({
                symbol: info.symbol,
                name: info.name,
                balance: balance,
                balanceUsd: balanceUsd,
                icon: info.icon
            });
        });

        // Sort by balance (highest first), then by symbol for zero balances
        assets.sort((a, b) => {
            const aBalance = parseFloat(a.balance);
            const bBalance = parseFloat(b.balance);
            if (aBalance > 0 && bBalance === 0) return -1;
            if (aBalance === 0 && bBalance > 0) return 1;
            if (aBalance > 0 && bBalance > 0) return bBalance - aBalance;
            return a.symbol.localeCompare(b.symbol);
        });

        return { assets };
    };

    const { assets } = getPortfolioData();

    return (
        <Card className="bg-white border-green-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">💰</span>
                        <span>Portfolio</span>
                        <button
                            onClick={() => setIsTokenModalOpen(true)}
                            className="ml-2 px-3 py-1 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 transition-colors"
                        >
                            + Add Token
                        </button>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Total Value</div>
                        <div className="text-2xl font-bold text-green-600">
                            ${assets.reduce((total, asset) => total + asset.balanceUsd, 0).toFixed(2)}
                        </div>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {assets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">No assets</div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {assets.map((asset, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow relative">
                                {/* Remove button */}
                                <button
                                    onClick={() => {
                                        const tokenAddress = portfolioTokens[index];
                                        if (tokenAddress) {
                                            removePortfolioToken({ walletAddress: address || '', tokenAddress });
                                        }
                                    }}
                                    className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                                    title="Remove token"
                                >
                                    ×
                                </button>
                                <div className="flex flex-col items-center text-center space-y-3">
                                    {/* Token Icon */}
                                    <div className="w-12 h-12 flex items-center justify-center">
                                        {asset.icon ? (
                                            <img
                                                src={asset.icon}
                                                alt={asset.symbol}
                                                className="w-12 h-12 rounded-full"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
                                                {asset.symbol.slice(0, 2)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Token Info */}
                                    <div className="space-y-1">
                                        <div className="font-semibold text-gray-900 text-sm">{asset.symbol}</div>
                                    </div>

                                    {/* Balance */}
                                    <div className="text-center">
                                        <div className="font-semibold text-gray-900 text-sm">
                                            {parseFloat(asset.balance).toFixed(4)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {asset.symbol}
                                        </div>
                                        {asset.balanceUsd > 0 && (
                                            <div className="text-xs text-emerald-600 font-medium mt-1">
                                                ${asset.balanceUsd.toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <TokenSearchModal
                isOpen={isTokenModalOpen}
                onClose={() => setIsTokenModalOpen(false)}
                walletAddress={address || ''}
                existingTokens={portfolioTokens}
            />
        </Card>
    );
} 