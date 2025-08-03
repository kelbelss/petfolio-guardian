import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DcaGuideModal } from '@/components/ui/dca-guide-modal';

export default function HowItWorks() {
    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
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
                        <CardTitle className="flex items-center gap-3 text-emerald-700 justify-center">
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
                        <CardTitle className="flex items-center gap-3 text-purple-700 justify-center">
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
                    {/* Smart Contracts */}
                    <Card className="border-blue-200 relative">
                        <div className="absolute top-4 right-4">
                            <a href="https://github.com/kelbelss/petfolio-guardian/tree/main/contracts" target="_blank" rel="noopener noreferrer">
                                <svg className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-blue-700 justify-center">
                                ⚙️ Smart Contracts
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-center">
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Smart Contracts</h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Our DCA system is powered by a suite of EVM-compatible smart contracts that plug directly into 1inch's on-chain Limit Order Protocol (LOP). At its core is a custom TwapDcaHook contract, which implements 1inch's hook interface to add time-weighted, recurring fills on any standard 1inch limit order. We use Permit2 for gas-efficient, one-transaction token approvals and transfers.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">DCA Hook Implementation</h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    When you submit a limit order, you embed an ABI-encoded TwapParams payload that tells the hook: chunk size, interval timing, slippage guards, and destination routing. On each fill, the hook checks timing, pulls tokens via Permit2, executes the swap via 1inch Aggregation Router, resets allowances, and emits the next eligible fill time.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Keeper/Bot</h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Automated keeper bots monitor the blockchain for eligible DCA orders and execute them at the specified intervals, ensuring your DCA strategy runs reliably without manual intervention.
                                </p>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Technical Benefits</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Hands-off automation with on-chain schedule enforcement</li>
                                    <li>• Gas-efficient Permit2 approvals and transfers</li>
                                    <li>• Built-in slippage protection and security measures</li>
                                    <li>• Composable integration with Aave and other DeFi protocols</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Frontend & APIs */}
                    <Card className="border-green-200 relative">
                        <div className="absolute top-4 right-4">
                            <a href="https://github.com/kelbelss/petfolio-guardian/tree/main/web" target="_blank" rel="noopener noreferrer">
                                <svg className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                            </a>
                        </div>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-green-700 justify-center">
                                🌐 Frontend & APIs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-center">
                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Successfully Implemented APIs</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• 1inch Quote API (v6.0) - Swap quotes and price estimates</li>
                                    <li>• 1inch Swap API (v6.0) - Executable swap transactions</li>
                                    <li>• 1inch Token API (v1.3) - Token metadata and lists</li>
                                    <li>• 1inch Balance API (v1.2) - User token balances</li>
                                    <li>• 1inch Price API (v1.1) - Real-time token prices</li>
                                    <li>• 1inch Gas Price API (v1.4) - Current gas prices</li>
                                    <li>• 1inch Approval APIs (v6.1) - Token allowances and approvals</li>
                                    <li>• 1inch Limit Order SDK - Order creation and management</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">Frontend Features</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• React Query for API state management</li>
                                    <li>• Real-time price feeds and updates</li>
                                    <li>• Interactive token selection and search</li>
                                    <li>• Responsive design with Tailwind CSS</li>
                                    <li>• Wallet integration with Wagmi</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-semibold text-gray-800 mb-2">User Experience</h4>
                                <ul className="text-sm text-gray-600 space-y-1">
                                    <li>• Step-by-step DCA setup wizard</li>
                                    <li>• Live portfolio tracking</li>
                                    <li>• Health monitoring system</li>
                                    <li>• Transaction history and analytics</li>
                                    <li>• Real-time notifications and alerts</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>

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
                        <CardTitle className="text-green-700 text-center">Ready to Get Started?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/dca/yield-feed" className="flex-1">
                                <Button className="w-full bg-green-600 hover:bg-green-700">
                                    🚀 Create Your First DCA
                                </Button>
                            </Link>
                            <Link to="/market-analysis" className="flex-1">
                                <Button variant="outline" className="w-full border-green-300 text-green-700 hover:bg-green-50">
                                    📊 Live Market Analytics
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
        </div>
    );
} 