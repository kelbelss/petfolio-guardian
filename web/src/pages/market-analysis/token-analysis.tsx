import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BarChart3,
    ArrowUpRight,
} from 'lucide-react';

interface TokenInfo {
    symbol: string;
    name: string;
    address: string;
    price: string;
    change: string;
    volume: string;
}

interface TokenAnalysisProps {
    selectedToken: string;
    setSelectedToken: (token: string) => void;
    timeframe: string;
    setTimeframe: (timeframe: string) => void;
    popularTokens: TokenInfo[];
}

export default function TokenAnalysis({
    selectedToken,
    setSelectedToken,
    timeframe,
    setTimeframe,
    popularTokens,
}: TokenAnalysisProps) {
    const timeframes = ['1h', '4h', '24h', '7d', '30d'];

    return (
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
                                        $0.00
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">24h Change</span>
                                    <span className="text-green-600 font-semibold">0%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">24h Volume</span>
                                    <span className="font-semibold">$0</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Market Cap</span>
                                    <span className="font-semibold">$0</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Circulating Supply</span>
                                    <span className="font-semibold">
                                        0
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
    );
} 