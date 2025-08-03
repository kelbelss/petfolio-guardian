import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DcaGuideModal } from '@/components/ui/dca-guide-modal';

export default function HowItWorks() {
    return (
        <div className="max-w-6xl mx-auto py-12 px-6">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-green-600 mb-4">
                    🐾 How Petfolio Guardian Works
                </h1>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    A brilliant platform that combines automated DCA trading with virtual pet care.
                    Feed your digital pet whilst building your crypto portfolio through dollar-cost averaging.
                </p>
            </div>

            {/* Quick Start Section */}
            <Card className="mb-8 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-emerald-700">
                        🚀 Quick Start Guide
                        <DcaGuideModal
                            trigger={
                                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-300 hover:bg-emerald-100">
                                    📖 Detailed DCA Guide
                                </Button>
                            }
                        />
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="text-center">
                            <div className="text-3xl mb-2">1️⃣</div>
                            <h3 className="font-semibold text-gray-800 mb-2">Connect Wallet</h3>
                            <p className="text-sm text-gray-600">Connect your Web3 wallet to access your tokens and balances</p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-2">2️⃣</div>
                            <h3 className="font-semibold text-gray-800 mb-2">Set Up DCA</h3>
                            <p className="text-sm text-gray-600">Configure your dollar-cost averaging strategy with token pairs and intervals</p>
                        </div>
                        <div className="text-center">
                            <div className="text-3xl mb-2">3️⃣</div>
                            <h3 className="font-semibold text-gray-800 mb-2">Feed Your Pet</h3>
                            <p className="text-sm text-gray-600">Watch your pet's happiness grow as your DCA orders execute automatically</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Health Reward System */}
            <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-purple-700">
                        🏆 Health Reward System
                        <Badge variant="secondary" className="text-xs">New!</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <p className="text-gray-700 mb-4">
                            Your pet's health is directly tied to your trading activity! Different types of trades give different health rewards.
                            The more complex and social your trading, the happier your pet becomes. Brilliant, isn't it?
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                            <div className="text-center">
                                <div className="text-2xl mb-2">📈</div>
                                <h4 className="font-bold text-yellow-800 mb-1">DCA Yield</h4>
                                <div className="text-3xl font-bold text-yellow-600 mb-2">+3.0</div>
                                <p className="text-xs text-yellow-700 mb-2">Highest Reward</p>
                                <p className="text-xs text-gray-600">
                                    Complex yield strategies with 13 different options. Your pet loves sophisticated trading!
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                            <div className="text-center">
                                <div className="text-2xl mb-2">🤝</div>
                                <h4 className="font-bold text-blue-800 mb-1">DCA to Friend</h4>
                                <div className="text-3xl font-bold text-blue-600 mb-2">+2.0</div>
                                <p className="text-xs text-blue-700 mb-2">Social Bonus</p>
                                <p className="text-xs text-gray-600">
                                    Help your mates with their investments. Sharing is caring, and your pet knows it!
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                            <div className="text-center">
                                <div className="text-2xl mb-2">👤</div>
                                <h4 className="font-bold text-green-800 mb-1">DCA to Self</h4>
                                <div className="text-3xl font-bold text-green-600 mb-2">+1.5</div>
                                <p className="text-xs text-green-700 mb-2">Standard</p>
                                <p className="text-xs text-gray-600">
                                    Regular self-investment. Your pet appreciates consistent, responsible trading.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-4">
                            <div className="text-center">
                                <div className="text-2xl mb-2">⚡</div>
                                <h4 className="font-bold text-gray-800 mb-1">Instant Swap</h4>
                                <div className="text-3xl font-bold text-gray-600 mb-2">+1.0</div>
                                <p className="text-xs text-gray-700 mb-2">Quick Trade</p>
                                <p className="text-xs text-gray-600">
                                    One-off trades. Better than nothing, but your pet prefers regular feeding!
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-amber-600 text-lg">💡</span>
                            <div className="text-sm text-amber-800">
                                <div className="font-medium mb-1">Health Decay System</div>
                                <p>
                                    Your pet loses 0.5 health every 6 hours without activity. Keep them happy with regular trading!
                                    Health ranges from 0 (very sad) to 10 (absolutely chuffed).
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Core Concepts */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* DCA Trading */}
                <Card className="border-blue-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-blue-700">
                            📈 DCA Trading System
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">What is DCA?</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Dollar-Cost Averaging (DCA) is an investment strategy where you invest a fixed amount
                                at regular intervals, regardless of market conditions. This reduces the impact of
                                volatility and can lead to better long-term returns.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">How It Works</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Choose source and destination tokens (e.g., ETH → USDC)</li>
                                <li>• Set amount per trade and frequency (hourly, daily, weekly)</li>
                                <li>• Define stop conditions (end date or total amount)</li>
                                <li>• Orders execute automatically at specified intervals</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Benefits</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Reduces emotional trading decisions</li>
                                <li>• Smooths out market volatility</li>
                                <li>• Builds consistent investment habits</li>
                                <li>• Lower average cost over time</li>
                            </ul>
                        </div>

                        <Link to="/dca/token-dca">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                Start DCA Trading
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* Pet Care System */}
                <Card className="border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-purple-700">
                            🐾 Virtual Pet Care
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Pet Happiness System</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                Your virtual pet's happiness is directly tied to your DCA trading activity.
                                Each successful trade feeds your pet and increases their happiness level.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Happiness Metrics</h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• <strong>Hunger:</strong> Countdown to next DCA execution</li>
                                <li>• <strong>Health:</strong> Overall pet happiness based on trading consistency</li>
                                <li>• <strong>Growth:</strong> Portfolio performance and vesting progress</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-2">Pet States</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-green-50 p-2 rounded">
                                    <span className="font-semibold text-green-700">Happy</span>
                                    <p className="text-green-600">Regular feeding</p>
                                </div>
                                <div className="bg-yellow-50 p-2 rounded">
                                    <span className="font-semibold text-yellow-700">Hungry</span>
                                    <p className="text-yellow-600">Missed feeds</p>
                                </div>
                                <div className="bg-red-50 p-2 rounded">
                                    <span className="font-semibold text-red-700">Unwell</span>
                                    <p className="text-red-600">Long gaps</p>
                                </div>
                                <div className="bg-blue-50 p-2 rounded">
                                    <span className="font-semibold text-blue-700">Growing</span>
                                    <p className="text-blue-600">Consistent gains</p>
                                </div>
                            </div>
                        </div>

                        <Link to="/">
                            <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                View Your Pet
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Technical Details */}
            <Card className="mb-8 border-gray-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-gray-700">
                        ⚙️ Technical Architecture
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                🔗 Smart Contracts
                                <Badge variant="secondary" className="text-xs">DeFi</Badge>
                            </h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 1inch Limit Order Protocol</li>
                                <li>• Custom TWAP DCA Hook</li>
                                <li>• Permit2 for gas efficiency</li>
                                <li>• MEV-protected swaps</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                📊 APIs & Data
                                <Badge variant="secondary" className="text-xs">Real-time</Badge>
                            </h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• 1inch Price Feeds</li>
                                <li>• Real-time token balances</li>
                                <li>• Gas price optimization</li>
                                <li>• Portfolio tracking</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                🛡️ Security
                                <Badge variant="secondary" className="text-xs">Audited</Badge>
                            </h4>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Non-custodial design</li>
                                <li>• Wallet signature required</li>
                                <li>• Slippage protection</li>
                                <li>• Order cancellation</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Features Overview */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <Card className="text-center border-green-200">
                    <CardContent className="pt-6">
                        <div className="text-3xl mb-3">📱</div>
                        <h3 className="font-semibold text-gray-800 mb-2">User-Friendly</h3>
                        <p className="text-sm text-gray-600">Intuitive interface with step-by-step guidance</p>
                    </CardContent>
                </Card>

                <Card className="text-center border-blue-200">
                    <CardContent className="pt-6">
                        <div className="text-3xl mb-3">⚡</div>
                        <h3 className="font-semibold text-gray-800 mb-2">Gas Optimized</h3>
                        <p className="text-sm text-gray-600">Permit2 approvals and batch transactions</p>
                    </CardContent>
                </Card>

                <Card className="text-center border-purple-200">
                    <CardContent className="pt-6">
                        <div className="text-3xl mb-3">🔄</div>
                        <h3 className="font-semibold text-gray-800 mb-2">Automated</h3>
                        <p className="text-sm text-gray-600">Set it and forget it DCA execution</p>
                    </CardContent>
                </Card>

                <Card className="text-center border-orange-200">
                    <CardContent className="pt-6">
                        <div className="text-3xl mb-3">📊</div>
                        <h3 className="font-semibold text-gray-800 mb-2">Analytics</h3>
                        <p className="text-sm text-gray-600">Track performance and pet happiness</p>
                    </CardContent>
                </Card>
            </div>

            {/* Getting Started */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                    <CardTitle className="text-green-700">Ready to Get Started?</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link to="/dca/token-dca" className="flex-1">
                            <Button className="w-full bg-green-600 hover:bg-green-700">
                                🚀 Create Your First DCA
                            </Button>
                        </Link>
                        <Link to="/dca/feeds" className="flex-1">
                            <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                                📊 View Example Feeds
                            </Button>
                        </Link>
                        <Link to="/" className="flex-1">
                            <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                                🐾 Meet Your Pet
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 