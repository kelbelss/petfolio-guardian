
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Activity,
    Users,
    BarChart3,
} from 'lucide-react';

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

interface OrderbookProps {
    selectedToken: string;
    setSelectedToken: (token: string) => void;
    selectedQuoteToken: string;
    setSelectedQuoteToken: (token: string) => void;
    depth: string;
    setDepth: (depth: string) => void;
    orderbookData: OrderbookData | null;
    isOrderbookLoading: boolean;
    orderbookError: string | null;
    fetchOrderbook: () => void;
    tokens: Array<{ symbol: string; name: string; address: string }>;
    popularPairs: Array<{ base: string; quote: string; name: string }>;
}

export default function Orderbook({
    selectedToken,
    setSelectedToken,
    selectedQuoteToken,
    setSelectedQuoteToken,
    depth,
    setDepth,
    orderbookData,
    isOrderbookLoading,
    orderbookError,
    fetchOrderbook,
    tokens,
    popularPairs
}: OrderbookProps) {
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
    );
} 