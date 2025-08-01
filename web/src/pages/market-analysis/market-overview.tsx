import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp,
    TrendingDown,
    BarChart3,
    Activity,
    Coins,
} from 'lucide-react';

interface MarketOverviewProps {
    marketData: {
        totalMarketCap?: string;
        totalVolume24h?: string;
        btcDominance?: string;
        ethDominance?: string;
        fearGreedIndex?: number;
        topGainers?: Array<{ symbol: string; change: string; price: string }>;
        topLosers?: Array<{ symbol: string; change: string; price: string }>;
    } | null;
}

export default function MarketOverview({ marketData }: MarketOverviewProps) {
    return (
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
                                    <p className="text-2xl font-bold">{marketData?.totalMarketCap || '$0'}</p>
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
                                    <p className="text-2xl font-bold">{marketData?.totalVolume24h || '$0'}</p>
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
                                    <p className="text-2xl font-bold">{marketData?.btcDominance || '0%'}</p>
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
                                    <p className="text-2xl font-bold">{marketData?.fearGreedIndex || 0}</p>
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
                                {marketData?.topGainers?.map((token, index: number) => (
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
                                            No data available
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
                                {marketData?.topLosers?.map((token, index: number) => (
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
                                            No data available
                                        </div>
                                    )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </section>
    );
} 