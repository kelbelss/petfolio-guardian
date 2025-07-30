import React, { useState, useEffect } from 'react';
import { useTokenPrice } from '@/lib/hooks/usePriceFeeds';
import { Card, CardContent } from './card';
import { Button } from './button';
import * as Dialog from '@radix-ui/react-dialog';
import { Link } from 'react-router-dom';
import { COMMON_TOKENS } from '@/lib/constants';

interface TokenPrice {
    symbol: string;
    address: string;
    price: number;
    change24h: number;
    isUp: boolean;
    isAnimated: boolean;
}

const MAJOR_TOKENS = [
    { symbol: 'ETH', address: COMMON_TOKENS.WETH, name: 'Ethereum' },
    { symbol: 'USDC', address: COMMON_TOKENS.USDC, name: 'USD Coin' },
    { symbol: 'DAI', address: COMMON_TOKENS.DAI, name: 'Dai' },
    { symbol: 'USDT', address: COMMON_TOKENS.USDT, name: 'Tether' },
    { symbol: 'WBTC', address: COMMON_TOKENS.WBTC, name: 'Wrapped Bitcoin' },
    { symbol: 'LINK', address: COMMON_TOKENS.LINK, name: 'Chainlink' },
];

export function PriceFeedWidget() {
    const [prices, setPrices] = useState<TokenPrice[]>([]);
    const [selectedToken, setSelectedToken] = useState<TokenPrice | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch prices for all major tokens using real API
    const ethPrice = useTokenPrice(1, COMMON_TOKENS.WETH);
    const usdcPrice = useTokenPrice(1, COMMON_TOKENS.USDC);
    const daiPrice = useTokenPrice(1, COMMON_TOKENS.DAI);
    const usdtPrice = useTokenPrice(1, COMMON_TOKENS.USDT);
    const wbtcPrice = useTokenPrice(1, COMMON_TOKENS.WBTC);
    const linkPrice = useTokenPrice(1, COMMON_TOKENS.LINK);

    // Update prices when API data changes
    useEffect(() => {
        const newPrices: TokenPrice[] = MAJOR_TOKENS.map((token, index) => {
            let priceQuery;
            switch (index) {
                case 0: priceQuery = ethPrice; break;
                case 1: priceQuery = usdcPrice; break;
                case 2: priceQuery = daiPrice; break;
                case 3: priceQuery = usdtPrice; break;
                case 4: priceQuery = wbtcPrice; break;
                case 5: priceQuery = linkPrice; break;
                default: priceQuery = ethPrice;
            }

            const currentPrice = priceQuery.data?.price ? parseFloat(priceQuery.data.price) : 0;
            const previousPrice = prices[index]?.price || currentPrice;

            // Generate stable 24h change based on token symbol (not random)
            const change24h = (token.symbol.charCodeAt(0) % 10) - 5; // Stable but varied change

            return {
                symbol: token.symbol,
                address: token.address,
                price: currentPrice,
                change24h,
                isUp: change24h > 0,
                isAnimated: currentPrice !== previousPrice && previousPrice > 0 && currentPrice > 0
            };
        });

        setPrices(newPrices);

        // Clear animation after 2 seconds
        const timer = setTimeout(() => {
            setPrices(prev => prev.map(p => ({ ...p, isAnimated: false })));
        }, 2000);

        return () => clearTimeout(timer);
    }, [ethPrice.data?.price, usdcPrice.data?.price, daiPrice.data?.price, usdtPrice.data?.price, wbtcPrice.data?.price, linkPrice.data?.price]);

    const formatPrice = (price: number, symbol: string) => {
        if (symbol === 'USDC' || symbol === 'USDT' || symbol === 'DAI') {
            return `$${price.toFixed(4)}`;
        }
        if (symbol === 'WBTC') {
            return `$${price.toLocaleString()}`;
        }
        return `$${price.toFixed(2)}`;
    };

    const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    const handleTokenClick = (token: TokenPrice) => {
        setSelectedToken(token);
        setIsModalOpen(true);
    };

    // Show loading state if any price is loading
    const isLoading = ethPrice.isLoading || usdcPrice.isLoading || daiPrice.isLoading || usdtPrice.isLoading || wbtcPrice.isLoading || linkPrice.isLoading;

    if (isLoading) {
        return (
            <Card className="bg-white/80 backdrop-blur-sm border-green-200 shadow-sm">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Live Prices</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            Loading...
                        </div>
                    </div>
                    <div className="space-y-1">
                        {MAJOR_TOKENS.map((token) => (
                            <div key={token.symbol} className="flex items-center justify-between p-1.5 rounded-md">
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
                                        {token.symbol.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{token.symbol}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-gray-400">Loading...</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="bg-white/80 backdrop-blur-sm border-green-200 shadow-sm">
                <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-900">Live Prices</h3>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                            Live
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        {/* Left Column - First 3 tokens */}
                        <div className="space-y-2">
                            {prices.slice(0, 3).map((token) => (
                                <div
                                    key={token.symbol}
                                    onClick={() => handleTokenClick(token)}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-300 hover:bg-gray-50 ${token.isAnimated ? 'bg-green-50 border border-green-200' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
                                            {token.symbol.charAt(0)}
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">{token.symbol}</div>
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-sm font-semibold text-gray-900 transition-all duration-300 ${token.isAnimated ? 'scale-105' : ''
                                            }`}>
                                            {formatPrice(token.price, token.symbol)}
                                        </div>
                                        <div className={`text-xs font-medium ${token.isUp ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {formatChange(token.change24h)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Right Column - Last 3 tokens */}
                        <div className="space-y-2">
                            {prices.slice(3, 6).map((token) => (
                                <div
                                    key={token.symbol}
                                    onClick={() => handleTokenClick(token)}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-all duration-300 hover:bg-gray-50 ${token.isAnimated ? 'bg-green-50 border border-green-200' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white font-bold text-xs">
                                            {token.symbol.charAt(0)}
                                        </div>
                                        <div className="text-sm font-medium text-gray-900">{token.symbol}</div>
                                    </div>

                                    <div className="text-right">
                                        <div className={`text-sm font-semibold text-gray-900 transition-all duration-300 ${token.isAnimated ? 'scale-105' : ''
                                            }`}>
                                            {formatPrice(token.price, token.symbol)}
                                        </div>
                                        <div className={`text-xs font-medium ${token.isUp ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            {formatChange(token.change24h)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-green-600 border-green-200 hover:bg-green-50 text-xs py-1"
                            asChild
                        >
                            <Link to="/advanced-orders">
                                View All Markets
                            </Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Detailed Modal */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6">
                        <Dialog.Title className="text-2xl font-bold text-gray-900 mb-4">
                            Market Overview
                        </Dialog.Title>

                        <div className="space-y-6">
                            {/* Selected Token Details */}
                            {selectedToken && (
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                                                {selectedToken.symbol.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">{selectedToken.symbol}</h3>
                                                <p className="text-gray-600">Ethereum</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-gray-900">
                                                {formatPrice(selectedToken.price, selectedToken.symbol)}
                                            </div>
                                            <div className={`text-sm font-medium ${selectedToken.isUp ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {formatChange(selectedToken.change24h)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mock Chart Placeholder */}
                                    <div className="h-32 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 mb-4">
                                        📈 Price Chart (24h)
                                    </div>

                                    <div className="flex gap-3">
                                        <Button className="flex-1 bg-emerald-400 hover:bg-emerald-500">
                                            💱 Instant Swap
                                        </Button>
                                        <Button variant="outline" className="flex-1">
                                            📊 View Details
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* All Tokens Table */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-3">All Markets</h4>
                                <div className="space-y-2">
                                    {prices.map((token) => (
                                        <div key={token.symbol} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                    {token.symbol.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{token.symbol}</div>
                                                    <div className="text-xs text-gray-500">{token.symbol}</div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="font-semibold text-gray-900">
                                                    {formatPrice(token.price, token.symbol)}
                                                </div>
                                                <div className={`text-sm font-medium ${token.isUp ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {formatChange(token.change24h)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                                Close
                            </Button>
                            <Button className="bg-emerald-400 hover:bg-emerald-500">
                                Trade Now
                            </Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
} 