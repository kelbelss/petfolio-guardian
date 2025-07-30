import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    Activity,
    Coins,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    Eye,
    Clock,
    Users
} from 'lucide-react';
import { useTokenPrice, useSingleTokenMetadata, useTokenMetadata } from '@/lib/hooks/usePriceFeeds';
import { fetchAllBalances } from '@/lib/oneInchTokenApi';
import { apiFetch } from '@/lib/oneInchProxy';
import { useAccount } from 'wagmi';
import { COMMON_TOKENS } from '@/lib/constants';

interface OrderbookEntry {
    price: string;
    amount: string;
    total: string;
    maker?: string;
    expires?: number;
    orderId?: string;
}

interface OrderbookData {
    bids: OrderbookEntry[];
    asks: OrderbookEntry[];
    timestamp: number;
    stats: {
        totalBids: number;
        totalAsks: number;
        totalVolume: string;
        spread: string;
        lastPrice: string;
    };
}

interface TokenInfo {
    symbol: string;
    name: string;
    address: string;
    price: string;
    change: string;
    volume: string;
}

export default function AdvancedOrders() {
    const { address } = useAccount();
    const [activeSection, setActiveSection] = useState('market');
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [selectedQuoteToken, setSelectedQuoteToken] = useState('USDC');
    const [timeframe, setTimeframe] = useState('24h');
    const [orderbookData, setOrderbookData] = useState<OrderbookData | null>(null);
    const [isOrderbookLoading, setIsOrderbookLoading] = useState(false);
    const [orderbookError, setOrderbookError] = useState<string | null>(null);
    const [marketData, setMarketData] = useState<any>(null);
    const [depth, setDepth] = useState('10');

    // Token data for orderbook
    const tokens = [
        { symbol: 'ETH', name: 'Ethereum', address: COMMON_TOKENS.WETH },
        { symbol: 'USDC', name: 'USD Coin', address: COMMON_TOKENS.USDC },
        { symbol: 'DAI', name: 'Dai', address: COMMON_TOKENS.DAI },
        { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
    ];

    const popularPairs = [
        { base: 'ETH', quote: 'USDC', name: 'ETH/USDC' },
        { base: 'ETH', quote: 'DAI', name: 'ETH/DAI' },
        { base: 'ETH', quote: 'USDT', name: 'ETH/USDT' },
        { base: 'WBTC', quote: 'USDC', name: 'WBTC/USDC' },
        { base: 'USDC', quote: 'DAI', name: 'USDC/DAI' },
    ];
    const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([
        { symbol: 'BTC', name: 'Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', price: '$43,250', change: '+2.4%', volume: '$2.1B' },
        { symbol: 'ETH', name: 'Ethereum', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', price: '$2,650', change: '+1.8%', volume: '$1.8B' },
        { symbol: 'SOL', name: 'Solana', address: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c', price: '$98.45', change: '+12.4%', volume: '$890M' },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', price: '$1.00', change: '0.0%', volume: '$650M' },
        { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', price: '$1.00', change: '0.0%', volume: '$520M' },
        { symbol: 'AVAX', name: 'Avalanche', address: '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3', price: '$34.21', change: '+8.7%', volume: '$320M' }
    ]);

    // Real API hooks
    const { data: allTokenMetadata } = useTokenMetadata(1);
    const { data: balances } = useAccount();

    // Get token address based on selected token
    const getTokenAddress = (symbol: string) => {
        switch (symbol) {
            case 'ETH': return COMMON_TOKENS.WETH;
            case 'USDC': return COMMON_TOKENS.USDC;
            case 'DAI': return COMMON_TOKENS.DAI;
            case 'USDT': return '0xdAC17F958D2ee523a2206206994597C13D831ec7';
            case 'WBTC': return '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
            case 'UNI': return '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
            case 'LINK': return '0x514910771AF9Ca656af840dff83E8264EcF986CA';
            case 'AAVE': return '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9';
            case 'SOL': return '0xD31a59c85aE9D8edEFeC411D448f90841571b89c'; // Wrapped SOL
            case 'AVAX': return '0x85f138bfEE4ef8e540890CFb48F620571d67Eda3'; // Wrapped AVAX
            case 'DOT': return '0x43Dc80C4F4C3B3e8C3C3C3C3C3C3C3C3C3C3C3C3C'; // Placeholder
            case 'ADA': return '0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47'; // Wrapped ADA
            default: return COMMON_TOKENS.WETH;
        }
    };

    const tokenAddress = getTokenAddress(selectedToken);
    const quoteTokenAddress = getTokenAddress(selectedQuoteToken);

    // Real API calls for selected token
    const { data: priceData, isLoading: priceLoading } = useTokenPrice(1, tokenAddress);
    const { data: tokenMetadata, isLoading: metadataLoading } = useSingleTokenMetadata(1, tokenAddress);



    // Fetch market overview data and initial orderbook
    useEffect(() => {
        const fetchMarketData = async () => {
            try {
                // Simulate market data (1inch doesn't provide global market stats)
                setMarketData({
                    totalMarketCap: '$2.1T',
                    totalVolume24h: '$89.2B',
                    btcDominance: '48.2%',
                    ethDominance: '18.7%',
                    fearGreedIndex: 65,
                    topGainers: [
                        { symbol: 'SOL', change: '+12.4%', price: '$98.45' },
                        { symbol: 'AVAX', change: '+8.7%', price: '$34.21' },
                        { symbol: 'DOT', change: '+6.2%', price: '$7.89' }
                    ],
                    topLosers: [
                        { symbol: 'ADA', change: '-5.3%', price: '$0.45' },
                        { symbol: 'LINK', change: '-3.1%', price: '$14.67' },
                        { symbol: 'UNI', change: '-2.8%', price: '$8.92' }
                    ]
                });
            } catch (error) {
                console.error('Error fetching market data:', error);
            }
        };

        const fetchInitialOrderbook = async () => {
            try {
                // Fetch initial orderbook for ETH/USDC
                const baseToken = tokens.find(t => t.symbol === 'ETH');
                const quoteToken = tokens.find(t => t.symbol === 'USDC');

                if (!baseToken || !quoteToken) {
                    console.error('ETH or USDC token not found');
                    return;
                }

                // Test different market data endpoints since orderbook endpoints don't exist
                const endpoints = [
                    `/swap/v6.0/1/quote?src=${baseToken.address}&dst=${quoteToken.address}&amount=1000000000000000000`,
                    `/swap/v6.0/1/quote?src=${quoteToken.address}&dst=${baseToken.address}&amount=1000000000000000000`,
                ];

                let marketData = null;
                let workingEndpoint = '';

                for (const endpoint of endpoints) {
                    try {
                        console.log(`Testing endpoint: ${endpoint}`);
                        const response = await apiFetch(endpoint);
                        console.log(`Response from ${endpoint}:`, response);

                        if (response && response.dstAmount) {
                            marketData = response;
                            workingEndpoint = endpoint;
                            break;
                        }
                    } catch (endpointError) {
                        console.log(`Endpoint ${endpoint} failed:`, endpointError);
                        continue;
                    }
                }

                if (marketData) {
                    // Create mock orderbook data from quote response
                    const mockOrderbook = createMockOrderbookFromQuote(marketData, 'ETH', 'USDC');
                    setOrderbookData(mockOrderbook);
                    console.log(`Initial orderbook loaded from: ${workingEndpoint}`);
                } else {
                    console.error('No working market data endpoint found for initial load');
                }
            } catch (error) {
                console.error('Error fetching initial orderbook:', error);
            }
        };

        fetchMarketData();
        fetchInitialOrderbook();
    }, []);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(sectionId);
        }
    };

    const timeframes = ['1h', '4h', '24h', '7d', '30d'];

    // Orderbook functions
    const fetchOrderbook = async () => {
        setIsOrderbookLoading(true);
        setOrderbookError(null);

        try {
            const baseToken = getTokenAddress(selectedToken);
            const quoteToken = getTokenAddress(selectedQuoteToken);

            // Test different market data endpoints since orderbook endpoints don't exist
            const endpoints = [
                `/swap/v6.0/1/quote?src=${baseToken}&dst=${quoteToken}&amount=1000000000000000000`,
                `/swap/v6.0/1/quote?src=${quoteToken}&dst=${baseToken}&amount=1000000000000000000`,
            ];

            let marketData = null;
            let workingEndpoint = '';

            for (const endpoint of endpoints) {
                try {
                    console.log(`Testing endpoint: ${endpoint}`);
                    const response = await apiFetch(endpoint);
                    console.log(`Response from ${endpoint}:`, response);

                    if (response && response.dstAmount) {
                        marketData = response;
                        workingEndpoint = endpoint;
                        break;
                    }
                } catch (endpointError) {
                    console.log(`Endpoint ${endpoint} failed:`, endpointError);
                    continue;
                }
            }

            if (marketData) {
                // Create mock orderbook data from quote response
                const mockOrderbook = createMockOrderbookFromQuote(marketData, selectedToken, selectedQuoteToken);
                setOrderbookData(mockOrderbook);
                console.log(`Working endpoint: ${workingEndpoint}`);
            } else {
                throw new Error('No working market data endpoint found');
            }

        } catch (err) {
            console.error('Error fetching market data:', err);
            setOrderbookError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setIsOrderbookLoading(false);
        }
    };

    const createMockOrderbookFromQuote = (quoteData: { dstAmount: string }, baseSymbol: string, quoteSymbol: string): OrderbookData => {
        // Extract price from quote response
        const dstAmount = parseFloat(quoteData.dstAmount) / Math.pow(10, 6); // Assuming USDC decimals
        const srcAmount = 1; // 1 ETH
        const price = dstAmount / srcAmount;

        // Create mock orderbook data around the current price
        const bids: OrderbookEntry[] = [];
        const asks: OrderbookEntry[] = [];

        // Generate mock bids (slightly below current price)
        for (let i = 0; i < 5; i++) {
            const bidPrice = price * (0.99 - i * 0.001);
            const amount = (Math.random() * 10 + 1).toFixed(6);
            const maker = `0x${Math.random().toString(16).substring(2, 42)}`;
            bids.push({
                price: bidPrice.toFixed(6),
                amount,
                total: (bidPrice * parseFloat(amount)).toFixed(6),
                maker,
                expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                orderId: `bid_${i}_${Date.now()}`
            });
        }

        // Generate mock asks (slightly above current price)
        for (let i = 0; i < 5; i++) {
            const askPrice = price * (1.01 + i * 0.001);
            const amount = (Math.random() * 10 + 1).toFixed(6);
            const maker = `0x${Math.random().toString(16).substring(2, 42)}`;
            asks.push({
                price: askPrice.toFixed(6),
                amount,
                total: (askPrice * parseFloat(amount)).toFixed(6),
                maker,
                expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                orderId: `ask_${i}_${Date.now()}`
            });
        }

        // Calculate stats
        const totalBids = bids.length;
        const totalAsks = asks.length;
        const totalVolume = bids.reduce((sum, bid) => sum + parseFloat(bid.total), 0) +
            asks.reduce((sum, ask) => sum + parseFloat(ask.total), 0);
        const spread = asks.length > 0 && bids.length > 0 ?
            (parseFloat(asks[0].price) - parseFloat(bids[0].price)).toFixed(6) : '0';

        return {
            bids,
            asks,
            timestamp: Date.now(),
            stats: {
                totalBids,
                totalAsks,
                totalVolume: totalVolume.toFixed(6),
                spread,
                lastPrice: price.toFixed(6)
            }
        };
    };

    const formatPrice = (price: string, symbol: string) => {
        const num = parseFloat(price);
        if (isNaN(num)) return '$0.00';

        if (num >= 1e6) {
            return `$${(num / 1e6).toFixed(2)}M`;
        } else if (num >= 1e3) {
            return `$${(num / 1e3).toFixed(2)}K`;
        } else if (num < 0.000001) {
            return `$${num.toExponential(2)}`;
        } else if (num < 0.01) {
            return `$${num.toFixed(6)}`;
        } else if (num < 1) {
            return `$${num.toFixed(4)}`;
        } else {
            return `$${num.toFixed(2)}`;
        }
    };

    const formatAmount = (amount: string, decimals: number = 18) => {
        const num = parseFloat(amount);
        if (isNaN(num)) return '0';

        if (num >= 1e6) {
            return `${(num / 1e6).toFixed(2)}M`;
        } else if (num >= 1e3) {
            return `${(num / 1e3).toFixed(2)}K`;
        } else if (num < 0.000001) {
            return num.toExponential(2);
        } else if (num < 0.01) {
            return num.toFixed(6);
        } else if (num < 1) {
            return num.toFixed(4);
        } else {
            return num.toFixed(2);
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatExpiry = (timestamp: number) => {
        const now = Math.floor(Date.now() / 1000);
        const diff = timestamp - now;
        const minutes = Math.floor(diff / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else {
            return `${minutes}m`;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
            {/* Internal Navigation Bar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-green-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <h1 className="text-xl font-bold text-green-700">📊 Market Analytics</h1>
                            <div className="flex space-x-1">
                                <Button
                                    variant={activeSection === 'market' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => scrollToSection('market')}
                                    className={`flex items-center space-x-2 ${activeSection === 'market' ? 'bg-emerald-400 hover:bg-emerald-500' : 'hover:bg-green-50'}`}
                                >
                                    <BarChart3 className="w-4 h-4" />
                                    <span>Market Overview</span>
                                </Button>
                                <Button
                                    variant={activeSection === 'tokens' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => scrollToSection('tokens')}
                                    className={`flex items-center space-x-2 ${activeSection === 'tokens' ? 'bg-emerald-400 hover:bg-emerald-500' : 'hover:bg-green-50'}`}
                                >
                                    <Coins className="w-4 h-4" />
                                    <span>Token Analysis</span>
                                </Button>
                                <Button
                                    variant={activeSection === 'orderbook' ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => scrollToSection('orderbook')}
                                    className={`flex items-center space-x-2 ${activeSection === 'orderbook' ? 'bg-emerald-400 hover:bg-emerald-500' : 'hover:bg-green-50'}`}
                                >
                                    <Activity className="w-4 h-4" />
                                    <span>Orderbook</span>
                                </Button>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Live Data
                            </Badge>
                            <Button variant="outline" size="sm" className="border-green-200 hover:bg-green-50">
                                <Eye className="w-4 h-4 mr-2" />
                                Watchlist
                            </Button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Market Overview Section */}
            <section id="market" className="py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Global Market Overview
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Real-time cryptocurrency market data, trends, and insights to help you make informed trading decisions.
                        </p>
                    </div>

                    {/* Market Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-blue-100 text-sm font-medium">Total Market Cap</p>
                                        <p className="text-2xl font-bold">{marketData?.totalMarketCap || '$2.1T'}</p>
                                    </div>
                                    <TrendingUp className="w-8 h-8 text-blue-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-green-100 text-sm font-medium">24h Volume</p>
                                        <p className="text-2xl font-bold">{marketData?.totalVolume24h || '$89.2B'}</p>
                                    </div>
                                    <Activity className="w-8 h-8 text-green-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-orange-100 text-sm font-medium">BTC Dominance</p>
                                        <p className="text-2xl font-bold">{marketData?.btcDominance || '48.2%'}</p>
                                    </div>
                                    <Coins className="w-8 h-8 text-orange-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-purple-100 text-sm font-medium">Fear & Greed</p>
                                        <p className="text-2xl font-bold">{marketData?.fearGreedIndex || 65}</p>
                                    </div>
                                    <BarChart3 className="w-8 h-8 text-purple-200" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Top Movers */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    <span>Top Gainers (24h)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {marketData?.topGainers?.map((token: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                                    <span className="text-green-700 font-bold text-sm">{token.symbol[0]}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{token.symbol}</p>
                                                    <p className="text-sm text-gray-600">{token.price}</p>
                                                </div>
                                            </div>
                                            <Badge className="bg-green-100 text-green-800">
                                                {token.change}
                                            </Badge>
                                        </div>
                                    )) || (
                                            <div className="text-center py-8 text-gray-500">
                                                Loading market data...
                                            </div>
                                        )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <TrendingDown className="w-5 h-5 text-red-600" />
                                    <span>Top Losers (24h)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {marketData?.topLosers?.map((token: any, index: number) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                                                    <span className="text-red-700 font-bold text-sm">{token.symbol[0]}</span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{token.symbol}</p>
                                                    <p className="text-sm text-gray-600">{token.price}</p>
                                                </div>
                                            </div>
                                            <Badge variant="destructive">
                                                {token.change}
                                            </Badge>
                                        </div>
                                    )) || (
                                            <div className="text-center py-8 text-gray-500">
                                                Loading market data...
                                            </div>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Token Analysis Section */}
            <section id="tokens" className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Token Analysis
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Deep dive into individual tokens with detailed charts, metrics, and trading data.
                        </p>
                    </div>

                    {/* Token Selector and Timeframe */}
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-8 space-y-4 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center space-x-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Token</label>
                                <select
                                    value={selectedToken}
                                    onChange={(e) => setSelectedToken(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {popularTokens.map((token) => (
                                        <option key={token.symbol} value={token.symbol}>
                                            {token.symbol} - {token.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            {timeframes.map((tf) => (
                                <Button
                                    key={tf}
                                    variant={timeframe === tf ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setTimeframe(tf)}
                                >
                                    {tf}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Token Details */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Token Info Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <span className="text-blue-700 font-bold">{selectedToken[0]}</span>
                                    </div>
                                    <span>{selectedToken} Information</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Current Price</span>
                                        <span className="font-semibold">
                                            {priceLoading ? 'Loading...' : priceData?.price ? formatPrice(priceData.price, selectedToken) : '$43,250.00'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">24h Change</span>
                                        <span className="text-green-600 font-semibold">+2.4%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">24h Volume</span>
                                        <span className="font-semibold">$2.1B</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Market Cap</span>
                                        <span className="font-semibold">$847.2B</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Circulating Supply</span>
                                        <span className="font-semibold">
                                            {metadataLoading ? 'Loading...' : tokenMetadata?.decimals ?
                                                formatAmount(Math.pow(10, tokenMetadata.decimals).toString(), tokenMetadata.decimals) : '19.6M'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Chart Placeholder */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Price Chart ({timeframe})</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-80 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <BarChart3 className="w-16 h-16 text-blue-400 mx-auto mb-4" />
                                            <p className="text-gray-600 font-medium">Interactive Chart</p>
                                            <p className="text-sm text-gray-500">Price history and technical indicators</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Popular Tokens Grid */}
                    <div className="mt-12">
                        <h3 className="text-2xl font-bold text-gray-900 mb-6">Popular Tokens</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {popularTokens.map((token) => (
                                <Card key={token.symbol} className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <span className="text-blue-700 font-bold">{token.symbol[0]}</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{token.symbol}</p>
                                                    <p className="text-sm text-gray-600">{token.name}</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Price</span>
                                                <span className="font-semibold">{token.price}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">24h Change</span>
                                                <span className={`font-semibold ${token.change.startsWith('+') ? 'text-green-600' : token.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {token.change}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Volume</span>
                                                <span className="font-semibold">{token.volume}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Orderbook Section */}
            <section id="orderbook" className="py-16 bg-green-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-gray-900 mb-4">
                            Live Orderbook
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Real-time orderbook data with depth analysis and market liquidity insights.
                        </p>
                    </div>

                    {/* Orderbook Controls */}
                    <div className="flex flex-col space-y-4 mb-8">
                        {/* Popular Pairs */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Popular Pairs</label>
                            <div className="flex flex-wrap gap-2">
                                {popularPairs.map((pair) => (
                                    <Button
                                        key={pair.name}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedToken(pair.base);
                                            setSelectedQuoteToken(pair.quote);
                                        }}
                                        className={`${selectedToken === pair.base && selectedQuoteToken === pair.quote ? 'bg-green-100 border-green-500' : ''}`}
                                    >
                                        {pair.name}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Base Token</label>
                                <select
                                    value={selectedToken}
                                    onChange={(e) => setSelectedToken(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {tokens.map((token) => (
                                        <option key={token.symbol} value={token.symbol}>
                                            {token.symbol} - {token.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Quote Token</label>
                                <select
                                    value={selectedQuoteToken}
                                    onChange={(e) => setSelectedQuoteToken(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    {tokens.map((token) => (
                                        <option key={token.symbol} value={token.symbol}>
                                            {token.symbol} - {token.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Depth</label>
                                <Input
                                    type="number"
                                    value={depth}
                                    onChange={(e) => setDepth(e.target.value)}
                                    placeholder="10"
                                    min="1"
                                    max="100"
                                />
                            </div>

                            <div className="flex items-end">
                                <Button
                                    onClick={fetchOrderbook}
                                    disabled={isOrderbookLoading}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    {isOrderbookLoading ? 'Fetching...' : 'Fetch Orderbook'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {orderbookError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800">Error: {orderbookError}</p>
                        </div>
                    )}

                    {/* Error Display */}
                    {orderbookError && (
                        <Card className="border-red-200 bg-red-50 mb-8">
                            <CardContent className="p-4">
                                <div className="text-red-700">
                                    <strong>Error:</strong> {orderbookError}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Market Stats */}
                    {orderbookData && (
                        <Card className="mb-8">
                            <CardHeader>
                                <CardTitle>Market Statistics</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-green-600">{orderbookData.stats.totalBids}</div>
                                        <div className="text-sm text-gray-500">Open Bids</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-red-600">{orderbookData.stats.totalAsks}</div>
                                        <div className="text-sm text-gray-500">Open Asks</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-blue-600">
                                            ${formatAmount(orderbookData.stats.totalVolume)}
                                        </div>
                                        <div className="text-sm text-gray-500">Total Volume</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-purple-600">
                                            ${formatAmount(orderbookData.stats.spread)}
                                        </div>
                                        <div className="text-sm text-gray-500">Spread</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-emerald-600">
                                            ${formatAmount(orderbookData.stats.lastPrice)}
                                        </div>
                                        <div className="text-sm text-gray-500">Last Price</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Orderbook Display */}
                    {orderbookData && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Bids */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-green-600">Bids (Buy Orders)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-500 border-b pb-2">
                                            <div>Price</div>
                                            <div>Amount</div>
                                            <div>Total</div>
                                            <div>Expires</div>
                                            <div>Maker</div>
                                        </div>
                                        {orderbookData.bids?.slice(0, parseInt(depth)).map((bid, index) => (
                                            <div key={index} className="grid grid-cols-5 gap-2 text-xs hover:bg-gray-50 p-1 rounded">
                                                <div className="text-green-600 font-semibold">
                                                    {formatPrice(bid.price, selectedToken)}
                                                </div>
                                                <div>{formatAmount(bid.amount)}</div>
                                                <div>{formatAmount(bid.total)}</div>
                                                <div className="text-gray-500">
                                                    {bid.expires ? formatExpiry(bid.expires) : 'N/A'}
                                                </div>
                                                <div className="text-gray-500">
                                                    {bid.maker ? formatAddress(bid.maker) : 'N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Asks */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-red-600">Asks (Sell Orders)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-5 gap-2 text-xs font-medium text-gray-500 border-b pb-2">
                                            <div>Price</div>
                                            <div>Amount</div>
                                            <div>Total</div>
                                            <div>Expires</div>
                                            <div>Maker</div>
                                        </div>
                                        {orderbookData.asks?.slice(0, parseInt(depth)).map((ask, index) => (
                                            <div key={index} className="grid grid-cols-5 gap-2 text-xs hover:bg-gray-50 p-1 rounded">
                                                <div className="text-red-600 font-semibold">
                                                    {formatPrice(ask.price, selectedToken)}
                                                </div>
                                                <div>{formatAmount(ask.amount)}</div>
                                                <div>{formatAmount(ask.total)}</div>
                                                <div className="text-gray-500">
                                                    {ask.expires ? formatExpiry(ask.expires) : 'N/A'}
                                                </div>
                                                <div className="text-gray-500">
                                                    {ask.maker ? formatAddress(ask.maker) : 'N/A'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Additional Features */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Users className="w-5 h-5" />
                                    <span>Market Makers</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">Top liquidity providers and their order patterns</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <Activity className="w-5 h-5" />
                                    <span>Depth Chart</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">Visual representation of orderbook depth</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                    <BarChart3 className="w-5 h-5" />
                                    <span>Volume Analysis</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-gray-600">Trading volume patterns and liquidity analysis</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
        </div>
    );
} 