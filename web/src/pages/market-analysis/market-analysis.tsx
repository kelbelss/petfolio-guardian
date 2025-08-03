import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    BarChart3,
    Activity,
    Coins,
} from 'lucide-react';
import MarketOverview from './market-overview';
import TokenAnalysis from './token-analysis';
import Orderbook from './orderbook';
import { useBulkTokenPrices, useTokens } from '@/lib/oneInchService';

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

export default function MarketAnalysis() {
    const [activeSection, setActiveSection] = useState('market');
    const [selectedToken, setSelectedToken] = useState('ETH');
    const [selectedQuoteToken, setSelectedQuoteToken] = useState('USDC');
    const [timeframe, setTimeframe] = useState('24h');
    const [orderbookData, setOrderbookData] = useState<OrderbookData | null>(null);
    const [isOrderbookLoading, setIsOrderbookLoading] = useState(false);
    const [orderbookError, setOrderbookError] = useState<string | null>(null);
    const [depth, setDepth] = useState('10');

    // Base network token addresses
    const baseTokens = [
        { symbol: 'ETH', name: 'Ethereum', address: '0x4200000000000000000000000000000000000006' },
        { symbol: 'USDC', name: 'USD Coin', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
        { symbol: 'DAI', name: 'Dai', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb' },
        { symbol: 'USDT', name: 'Tether', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22' },
        { symbol: 'LINK', name: 'Chainlink', address: '0x88Fb150BDc53A65fe94Dea0C9BA0a6dAf8C8e1D5' },
    ];

    const popularPairs = [
        { base: 'ETH', quote: 'USDC', name: 'ETH/USDC' },
        { base: 'ETH', quote: 'DAI', name: 'ETH/DAI' },
        { base: 'ETH', quote: 'USDT', name: 'ETH/USDT' },
        { base: 'WBTC', quote: 'USDC', name: 'WBTC/USDC' },
        { base: 'USDC', quote: 'DAI', name: 'USDC/DAI' },
    ];

    // Real API calls
    // Get all token metadata and prices
    const { data: tokenList, error: tokenListError, isLoading: tokenListLoading } = useTokens();
    const tokenAddresses = baseTokens.map(token => token.address);
    const { data: bulkPrices, error: bulkPricesError, isLoading: bulkPricesLoading } = useBulkTokenPrices(tokenAddresses);

    // Debug console logs
    console.log('🔍 Debug - Token List:', tokenList);
    console.log('🔍 Debug - Bulk Prices:', bulkPrices);
    console.log('🔍 Debug - Token Addresses:', tokenAddresses);
    console.log('🔍 Debug - Base Tokens:', baseTokens);
    console.log('🔍 Debug - Token List Error:', tokenListError);
    console.log('🔍 Debug - Bulk Prices Error:', bulkPricesError);
    console.log('�� Debug - Token List Loading:', tokenListLoading);
    console.log('🔍 Debug - Bulk Prices Loading:', bulkPricesLoading);

    // Debug bulk prices in detail
    if (bulkPrices) {
        console.log('🔍 Debug - Bulk Prices Keys:', Object.keys(bulkPrices));
        Object.entries(bulkPrices).forEach(([address, price]) => {
            console.log(`🔍 Debug - Price for ${address}:`, price);
        });
    }

    // Create enriched token data with real prices and metadata
    const enrichedTokens = baseTokens.map(token => {
        // Fix case sensitivity - API returns lowercase addresses
        const lowerCaseAddress = token.address.toLowerCase();
        const price = bulkPrices?.[lowerCaseAddress] || '0';
        const metadata = tokenList?.[lowerCaseAddress];

        console.log(`🔍 Debug - Token ${token.symbol}:`, {
            address: token.address,
            lowerCaseAddress: lowerCaseAddress,
            price: price,
            metadata: metadata,
            originalName: token.name
        });

        // Handle price formatting - if price is 0, show loading or fallback
        let displayPrice = '$0.00';
        if (price !== '0' && price !== '') {
            try {
                const priceInUSD = parseFloat(price);
                displayPrice = `$${priceInUSD.toFixed(2)}`;
            } catch (e) {
                console.warn(`Failed to parse price for ${token.symbol}:`, price, e);
                displayPrice = '$0.00';
            }
        }

        return {
            ...token,
            price: displayPrice,
            change: '0.0%', // TODO: Implement 24h change
            volume: '$0.00', // TODO: Implement volume data
            logoURI: metadata?.logoURI || '',
            decimals: metadata?.decimals || 18,
            name: metadata?.name || token.name
        };
    });

    console.log('🔍 Debug - Enriched Tokens:', enrichedTokens);

    // Demo orderbook data with clear indicators
    useEffect(() => {
        const demoOrderbook: OrderbookData = {
            bids: [
                { price: '5.00', amount: '5.00', total: '25.00', maker: '0x1234...5678', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_1' },
                { price: '4.95', amount: '5.00', total: '24.75', maker: '0x2345...6789', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_2' },
                { price: '4.90', amount: '5.00', total: '24.50', maker: '0x3456...7890', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_3' },
                { price: '4.85', amount: '5.00', total: '24.25', maker: '0x4567...8901', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_4' },
                { price: '4.80', amount: '5.00', total: '24.00', maker: '0x5678...9012', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_5' },
            ],
            asks: [
                { price: '5.05', amount: '5.00', total: '25.25', maker: '0x6789...0123', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_1' },
                { price: '5.10', amount: '5.00', total: '25.50', maker: '0x7890...1234', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_2' },
                { price: '5.15', amount: '5.00', total: '25.75', maker: '0x8901...2345', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_3' },
                { price: '5.20', amount: '5.00', total: '26.00', maker: '0x9012...3456', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_4' },
                { price: '5.25', amount: '5.00', total: '26.25', maker: '0x0123...4567', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_5' },
            ],
            timestamp: Date.now(),
            stats: {
                totalBids: 5,
                totalAsks: 5,
                totalVolume: '5.00',
                spread: '5.00%',
                lastPrice: '5.00'
            }
        };
        setOrderbookData(demoOrderbook);
    }, []);

    const scrollToSection = (sectionId: string) => {
        setActiveSection(sectionId);
        const element = document.getElementById(sectionId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const fetchOrderbook = () => {
        setIsOrderbookLoading(true);
        setOrderbookError(null);

        // Demo orderbook data (no real API available)
        setTimeout(() => {
            const demoOrderbook: OrderbookData = {
                bids: [
                    { price: '5.00', amount: '5.00', total: '25.00', maker: '0x1234...5678', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_1' },
                    { price: '4.95', amount: '5.00', total: '24.75', maker: '0x2345...6789', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_2' },
                    { price: '4.90', amount: '5.00', total: '24.50', maker: '0x3456...7890', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_3' },
                    { price: '4.85', amount: '5.00', total: '24.25', maker: '0x4567...8901', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_4' },
                    { price: '4.80', amount: '5.00', total: '24.00', maker: '0x5678...9012', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_bid_5' },
                ],
                asks: [
                    { price: '5.05', amount: '5.00', total: '25.25', maker: '0x6789...0123', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_1' },
                    { price: '5.10', amount: '5.00', total: '25.50', maker: '0x7890...1234', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_2' },
                    { price: '5.15', amount: '5.00', total: '25.75', maker: '0x8901...2345', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_3' },
                    { price: '5.20', amount: '5.00', total: '26.00', maker: '0x9012...3456', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_4' },
                    { price: '5.25', amount: '5.00', total: '26.25', maker: '0x0123...4567', expires: Math.floor(Date.now() / 1000) + 3600, orderId: 'demo_ask_5' },
                ],
                timestamp: Date.now(),
                stats: {
                    totalBids: 5,
                    totalAsks: 5,
                    totalVolume: '5.00',
                    spread: '5.00%',
                    lastPrice: '5.00'
                }
            };
            setOrderbookData(demoOrderbook);
            setIsOrderbookLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-[#effdf4]">
            {/* Internal Navigation Bar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-green-200 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-8">
                            <h1 className="text-xl font-bold text-green-700">📊 Markets</h1>
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
                            {/* Base Logo */}
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-sm">B</span>
                                </div>
                                <span className="text-blue-600 font-semibold">Base</span>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                                Live Data
                            </Badge>
                            <Badge variant="outline" className="border-orange-300 text-orange-600">
                                🚧 Coming Soon
                            </Badge>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Coming Soon Badge */}
                <div className="text-center mb-0 mt-8">
                    <Badge variant="outline" className="border-orange-300 text-orange-600 text-lg px-6 py-3">
                        🚧 Coming Soon - Enhanced Market Data & Analytics
                    </Badge>
                </div>

                {/* Market Overview Section */}
                <div id="market" className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                        {/* <h2 className="text-2xl font-bold text-gray-900">Global Market Overview</h2> */}
                    </div>
                    <MarketOverview marketData={null} /> {/* marketData is not used in MarketOverview anymore */}
                </div>

                {/* Token Analysis Section */}
                <TokenAnalysis
                    selectedToken={selectedToken}
                    setSelectedToken={setSelectedToken}
                    timeframe={timeframe}
                    setTimeframe={setTimeframe}
                    popularTokens={enrichedTokens}
                />

                {/* Orderbook Section */}
                <div className="relative">
                    <div className="absolute top-4 right-4 z-10">
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-300">
                            🎭 Demo Data
                        </Badge>
                    </div>
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
                        tokens={enrichedTokens}
                        popularPairs={popularPairs}
                    />
                </div>
            </div>
        </div>
    );
} 