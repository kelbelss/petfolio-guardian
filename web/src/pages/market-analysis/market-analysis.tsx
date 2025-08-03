import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3,
    Activity,
    Coins,
} from 'lucide-react';
import { useAccount } from 'wagmi';
import MarketOverview from './market-overview';
import TokenAnalysis from './token-analysis';
import Orderbook from './orderbook';
import { PriceFeedWidget } from '@/pages/dashboard/price-feed-widget';

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

export default function MarketAnalysis() {
    const { address } = useAccount();
    const [activeSection, setActiveSection] = useState('market');
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [selectedQuoteToken, setSelectedQuoteToken] = useState('USDC');
    const [timeframe, setTimeframe] = useState('24h');
    const [orderbookData, setOrderbookData] = useState<OrderbookData | null>(null);
    const [isOrderbookLoading, setIsOrderbookLoading] = useState(false);
    const [orderbookError, setOrderbookError] = useState<string | null>(null);
    const [marketData, setMarketData] = useState<{
        totalMarketCap?: string;
        totalVolume24h?: string;
        btcDominance?: string;
        ethDominance?: string;
        fearGreedIndex?: number;
        topGainers?: Array<{ symbol: string; change: string; price: string }>;
        topLosers?: Array<{ symbol: string; change: string; price: string }>;
    } | null>(null);
    const [depth, setDepth] = useState('10');

    // Token data for orderbook
    const tokens = [
        { symbol: 'ETH', name: 'Ethereum', address: '0x4200000000000000000000000000000000000006' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
        { symbol: 'DAI', name: 'Dai', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' },
        { symbol: 'USDT', name: 'Tether', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22' },
    ];

    const popularPairs = [
        { base: 'ETH', quote: 'USDC', name: 'ETH/USDC' },
        { base: 'ETH', quote: 'DAI', name: 'ETH/DAI' },
        { base: 'ETH', quote: 'USDT', name: 'ETH/USDT' },
        { base: 'WBTC', quote: 'USDC', name: 'WBTC/USDC' },
        { base: 'USDC', quote: 'DAI', name: 'USDC/DAI' },
    ];

    const [popularTokens, setPopularTokens] = useState<TokenInfo[]>([
        { symbol: 'WETH', name: 'Wrapped Ethereum', address: '0x4200000000000000000000000000000000000006', price: '$0', change: '0.0%', volume: '$0' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', price: '$0', change: '0.0%', volume: '$0' },
        { symbol: 'USDT', name: 'Tether', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', price: '$0', change: '0.0%', volume: '$0' },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', price: '$0', change: '0.0%', volume: '$0' },
        { symbol: 'DAI', name: 'Dai', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', price: '$0', change: '0.0%', volume: '$0' }
    ]);

    // Get token address based on selected token
    const getTokenAddress = (symbol: string) => {
        switch (symbol.toUpperCase()) {
            case 'ETH': return '0x4200000000000000000000000000000000000006';
            case 'USDC': return '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
            case 'DAI': return '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb';
            case 'USDT': return '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9';
            case 'WBTC': return '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22';
            default: return '0x4200000000000000000000000000000000000006';
        }
    };

    const tokenAddress = getTokenAddress(selectedToken);
    const quoteTokenAddress = getTokenAddress(selectedQuoteToken);

    // Static data for selected token
    const priceData = { price: '0' };
    const priceLoading = false;
    const tokenMetadata = { decimals: 18 };
    const metadataLoading = false;

    // Set static market data
    useEffect(() => {
        setMarketData({
            totalMarketCap: '$0',
            totalVolume24h: '$0',
            btcDominance: '0%',
            ethDominance: '0%',
            fearGreedIndex: 0,
            topGainers: [
                { symbol: 'SOL', change: '0%', price: '$0' },
                { symbol: 'AVAX', change: '0%', price: '$0' },
                { symbol: 'DOT', change: '0%', price: '$0' }
            ],
            topLosers: [
                { symbol: 'ADA', change: '0%', price: '$0' },
                { symbol: 'LINK', change: '0%', price: '$0' },
                { symbol: 'UNI', change: '0%', price: '$0' }
            ]
        });

        // Set static orderbook data
        const mockOrderbook = createMockOrderbookFromQuote({ dstAmount: '0' }, 'ETH', 'USDC');
        setOrderbookData(mockOrderbook);
    }, []);

    const scrollToSection = (sectionId: string) => {
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(sectionId);
        }
    };

    // Orderbook functions
    const fetchOrderbook = () => {
        setIsOrderbookLoading(true);
        setOrderbookError(null);

        // Simulate loading
        setTimeout(() => {
            const mockOrderbook = createMockOrderbookFromQuote({ dstAmount: '0' }, selectedToken, selectedQuoteToken);
            setOrderbookData(mockOrderbook);
            setIsOrderbookLoading(false);
        }, 1000);
    };

    const createMockOrderbookFromQuote = (quoteData: { dstAmount: string }, baseSymbol: string, quoteSymbol: string): OrderbookData => {
        // Create mock orderbook data with all zeros
        const bids: OrderbookEntry[] = [];
        const asks: OrderbookEntry[] = [];

        // Generate mock bids with zeros
        for (let i = 0; i < 5; i++) {
            bids.push({
                price: '0',
                amount: '0',
                total: '0',
                maker: '0x0000000000000000000000000000000000000000',
                expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                orderId: `bid_${i}_${Date.now()}`
            });
        }

        // Generate mock asks with zeros
        for (let i = 0; i < 5; i++) {
            asks.push({
                price: '0',
                amount: '0',
                total: '0',
                maker: '0x0000000000000000000000000000000000000000',
                expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                orderId: `ask_${i}_${Date.now()}`
            });
        }

        return {
            bids,
            asks,
            timestamp: Date.now(),
            stats: {
                totalBids: 0,
                totalAsks: 0,
                totalVolume: '0',
                spread: '0',
                lastPrice: '0'
            }
        };
    };

    return (
        <div className="min-h-screen bg-[#effdf4]">
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
                        </div>
                    </div>
                </div>
            </nav>

            {/* Market Overview Section */}
            <MarketOverview marketData={marketData} />

            {/* Token Analysis Section */}
            <TokenAnalysis
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
                timeframe={timeframe}
                setTimeframe={setTimeframe}
                popularTokens={popularTokens}
                priceData={priceData}
                priceLoading={priceLoading}
                tokenMetadata={tokenMetadata}
                metadataLoading={metadataLoading}
            />

            {/* Orderbook Section */}
            <Orderbook
                selectedToken={selectedToken}
                setSelectedToken={setSelectedToken}
                selectedQuoteToken={selectedQuoteToken}
                setSelectedQuoteToken={setSelectedQuoteToken}
                depth={depth}
                setDepth={setDepth}
                orderbookData={orderbookData}
                isOrderbookLoading={isOrderbookLoading}
                orderbookError={orderbookError}
                fetchOrderbook={fetchOrderbook}
                tokens={tokens}
                popularPairs={popularPairs}
            />

            {/* Price Feed Widget */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <PriceFeedWidget />
            </div>
        </div>
    );
} 