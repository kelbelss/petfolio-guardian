import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import { PriceFeedWidget } from '@/components/ui/price-feed-widget';
import { PortfolioAnalytics } from '@/components/ui/portfolio-analytics';
import { formatEther, parseEther } from 'viem';
import { useActiveOrder } from '../lib/useActiveOrder';

type TwapDcaExecutedArgs = {
    orderHash: string;
    chunkIn: bigint;
    minOut: bigint;
    nextFillTime: bigint;
};

// Contract configuration for TWAP DCA
const HOOK_ADDRESS = CONTRACT_ADDRESSES.TWAP_DCA;
const HOOK_ABI = [
    {
        inputs: [{ name: 'orderHash', type: 'bytes32' }],
        name: 'nextFillTime',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'orderHash', type: 'bytes32' }],
        name: 'intervalSecs',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
] as const;

export default function Dashboard() {
    const location = useLocation();
    const demo = new URLSearchParams(location.search).get('demo') === '1';
    const demoHash = '0xdemo0000000000000000000000000000000000000000000000000000000000000000';
    const storedOrderHash = useActiveOrder();
    const orderHash = demo ? demoHash : storedOrderHash;
    const { address } = useAccount();

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Main Content - Hippo Left, Content Right */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                {/* Left Side - Large Hippo Section */}
                <div className="lg:col-span-2">
                    <div className="bg-gradient-to-b from-green-50 to-white rounded-2xl p-12 h-full flex flex-col items-center justify-center">
                        <div className="w-96 h-96 mb-8">
                            <img
                                src="/src/assets/happy.PNG"
                                alt="Happy Hippo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-5xl font-bold text-green-600 mb-4">Hippo</h1>
                        <p className="text-xl text-gray-600 text-center">Your loyal DCA companion</p>
                    </div>
                </div>

                {/* Right Side - Dashboard Content */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Vitals Bar Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <VitalCard
                            icon="🍽️"
                            title="Hunger"
                            value={orderHash ? <Countdown orderHash={orderHash} /> : "Demo mode"}
                        />
                        <VitalCard
                            icon="⚕️"
                            title="Health"
                            value={orderHash ? <PetHappinessBar orderHash={orderHash} /> : "Demo mode"}
                        />
                        <VitalCard
                            icon="💰"
                            title="Growth"
                            value={orderHash ? "Level 1 - 25% vested" : "Demo mode"}
                        />
                    </div>

                    {/* Feed Now Section */}
                    <FeedNowSection />

                    {/* Portfolio Section */}
                    {address && (
                        <PortfolioSection address={address} />
                    )}

                    {/* Price Feed Widget */}
                    <div className="flex justify-start">
                        <div className="w-1/2">
                            <PriceFeedWidget />
                        </div>
                    </div>

                    {/* Real-Time Chart + History */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-white border border-green-200 rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                                <h2 className="text-2xl font-semibold text-green-600 mb-6">Feed History</h2>
                                <FeedHistoryChart orderHash={orderHash || demoHash} disabled={!orderHash} />
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white border border-green-200 rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow h-80 overflow-hidden">
                                <h2 className="text-2xl font-semibold text-green-600 mb-6">History (last 20 fills)</h2>
                                <div className="overflow-y-auto h-full">
                                    <HistoryList orderHash={orderHash || demoHash} disabled={!orderHash} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    {orderHash && (
                        <div className="flex justify-start">
                            <CancelButton orderHash={orderHash} onCancel={() => sessionStorage.removeItem('orderHash')} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function FeedNowSection() {
    const [selectedOption, setSelectedOption] = useState<'regular' | 'fusion' | 'mev-protect'>('regular');
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const swapOptions = [
        {
            id: 'regular',
            title: 'Regular',
            description: 'Instant DEX swap, classic path',
            icon: '⚡',
            estimatedTime: '~30 seconds',
            estimatedGas: '~150,000 gas',
            explanation: 'Standard swap through 1inch aggregator. Fastest execution with competitive pricing.',
            price: '$1,850.75',
            output: '0.054 ETH'
        },
        {
            id: 'fusion',
            title: 'Fusion',
            description: 'Intent-based, MEV-protected, better price',
            icon: '🛡️',
            estimatedTime: '~2-5 minutes',
            estimatedGas: '~80,000 gas',
            explanation: 'MEV-protected intent-based swap. Slower but better price execution and protection.',
            price: '$1,849.50',
            output: '0.0541 ETH'
        },
        {
            id: 'mev-protect',
            title: 'MEV Protect',
            description: 'Regular swap via Web3 API protection',
            icon: '🔒',
            estimatedTime: '~1-2 minutes',
            estimatedGas: '~120,000 gas',
            explanation: 'Standard swap submitted through Web3 API for MEV protection.',
            price: '$1,850.25',
            output: '0.054 ETH'
        }
    ];

    const handleFeedNow = async () => {
        setIsLoading(true);
        // Simulate swap execution
        setTimeout(() => {
            setIsLoading(false);
            alert(`${swapOptions.find(opt => opt.id === selectedOption)?.title} swap executed!`);
        }, 2000);
    };

    return (
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader
                className="cursor-pointer hover:bg-green-100/50 transition-colors duration-200"
                onClick={() => setIsOpen(!isOpen)}
            >
                <CardTitle className="flex items-center justify-between text-green-700">
                    <div className="flex items-center gap-3">
                        🍽️ Feed Now
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-normal text-green-600">
                            {isOpen ? 'Click to collapse' : 'Click to expand'}
                        </span>
                        <svg
                            className={`w-5 h-5 text-green-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </CardTitle>
            </CardHeader>
            {isOpen && (
                <CardContent>
                    <div className="space-y-6">
                        {/* Swap Options */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Swap Method</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {swapOptions.map((option) => (
                                    <div
                                        key={option.id}
                                        className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${selectedOption === option.id
                                            ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        onClick={() => setSelectedOption(option.id as 'regular' | 'fusion' | 'mev-protect')}
                                    >
                                        {/* Radio Button */}
                                        <div className="absolute top-3 right-3">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedOption === option.id
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : 'border-gray-300'
                                                }`}>
                                                {selectedOption === option.id && (
                                                    <div className="w-2 h-2 bg-white rounded-full"></div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Option Content */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">{option.icon}</span>
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{option.title}</h4>
                                                    <p className="text-sm text-gray-600">{option.description}</p>
                                                </div>
                                            </div>

                                            {/* Quote */}
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-sm text-gray-600">Price:</span>
                                                    <span className="font-semibold text-gray-900">{option.price}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-gray-600">You'll receive:</span>
                                                    <span className="font-semibold text-emerald-600">{option.output}</span>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="space-y-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Est. Time:</span>
                                                    <span className="font-medium">{option.estimatedTime}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-600">Est. Gas:</span>
                                                    <span className="font-medium">{option.estimatedGas}</span>
                                                </div>
                                            </div>

                                            {/* Explanation */}
                                            <p className="text-xs text-gray-500 leading-relaxed">
                                                {option.explanation}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                            <Button
                                onClick={handleFeedNow}
                                disabled={isLoading}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3"
                            >
                                {isLoading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Feeding...
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        🍽️ Feed Now
                                    </div>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                asChild
                            >
                                <Link to="/setup/feed">
                                    🔄 Recurring Feed
                                </Link>
                            </Button>
                        </div>
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

function PortfolioSection({ address }: { address: string }) {
    const [selectedToken, setSelectedToken] = useState<string | null>(null);
    const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);

    // Mock token balances data
    const tokenBalances = [
        {
            symbol: 'ETH',
            name: 'Ethereum',
            balance: '2.45',
            usdValue: 4532.50,
            logo: '🔵',
            address: '0x0000000000000000000000000000000000000000'
        },
        {
            symbol: 'USDC',
            name: 'USD Coin',
            balance: '1250.00',
            usdValue: 1250.00,
            logo: '🔵',
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
        },
        {
            symbol: 'DAI',
            name: 'Dai',
            balance: '500.00',
            usdValue: 500.00,
            logo: '🟡',
            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        },
        {
            symbol: 'USDT',
            name: 'Tether',
            balance: '750.00',
            usdValue: 750.00,
            logo: '🟢',
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
        },
        {
            symbol: 'WBTC',
            name: 'Wrapped Bitcoin',
            balance: '0.15',
            usdValue: 6750.00,
            logo: '🟠',
            address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
        },
        {
            symbol: 'UNI',
            name: 'Uniswap',
            balance: '25.50',
            usdValue: 1275.00,
            logo: '🟣',
            address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
        }
    ];

    const totalValue = tokenBalances.reduce((sum, token) => sum + token.usdValue, 0);

    const handleFeedPet = (token: typeof tokenBalances[0]) => {
        setSelectedToken(token.symbol);
        setIsFeedModalOpen(true);
    };

    return (
        <>
            <Card className="bg-white border-green-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">💰</span>
                            <span>Portfolio</span>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Total Value</div>
                            <div className="text-2xl font-bold text-green-600">
                                ${totalValue.toLocaleString()}
                            </div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <div className="flex gap-4 min-w-max">
                            {tokenBalances.map((token) => (
                                <div key={token.symbol} className="bg-gray-50 rounded-lg p-4 border border-gray-200 w-64 flex-shrink-0">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                {token.logo}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{token.symbol}</div>
                                                <div className="text-xs text-gray-500">{token.name}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Balance:</span>
                                            <span className="font-medium">{token.balance}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Value:</span>
                                            <span className="font-semibold text-green-600">
                                                ${token.usdValue.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleFeedPet(token)}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm py-2"
                                    >
                                        🍽️ Feed {token.symbol}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Feed Pet Modal */}
            {selectedToken && (
                <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center ${isFeedModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-200`}>
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
                        <div className="text-center mb-6">
                            <div className="text-4xl mb-2">🍽️</div>
                            <h3 className="text-xl font-bold text-gray-900">Feed Pet with {selectedToken}</h3>
                            <p className="text-gray-600">Choose how to swap your {selectedToken} for pet food</p>
                        </div>

                        <div className="space-y-3 mb-6">
                            <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                                ⚡ Regular Swap
                            </Button>
                            <Button variant="outline" className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                                🛡️ Fusion (MEV Protected)
                            </Button>
                            <Button variant="outline" className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                                🔒 MEV Protect
                            </Button>
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setIsFeedModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600">
                                Feed Pet
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function VitalCard({ icon, title, value }: { icon: string; title: string; value: React.ReactNode }) {
    return (
        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{icon}</span>
                <h3 className="text-xl font-semibold text-green-600">{title}</h3>
            </div>
            <div className="text-lg text-gray-700">
                {value}
            </div>
        </div>
    );
}

function Countdown({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    const { data: nextFill, isLoading } = useReadContract({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        functionName: 'nextFillTime',
        args: [orderHash],
        query: { enabled: !!orderHash && !disabled },
    });
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!nextFill || disabled) return;
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            setSecondsLeft(Number(nextFill) - now);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [nextFill, disabled]);

    if (disabled) {
        return <span className="text-gray-500">Demo mode</span>;
    }

    if (isLoading) return <span className="text-gray-500">Loading...</span>;
    if (secondsLeft === null) return <span className="text-gray-500">No fill time available</span>;

    const isLate = secondsLeft < 0;
    const hours = Math.floor(Math.abs(secondsLeft) / 3600);
    const minutes = Math.floor((Math.abs(secondsLeft) % 3600) / 60);
    const seconds = Math.abs(secondsLeft) % 60;

    return (
        <span className={`font-mono ${isLate ? 'text-red-400' : 'text-emerald-600'}`}>
            {isLate ? 'Overdue!' : `Next snack in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
        </span>
    );
}

function PetHappinessBar({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    if (disabled) {
        return <span className="text-gray-500">Demo mode</span>;
    }
    return (
        <div className="space-y-2">
            <div className="h-2 rounded bg-gray-200 overflow-hidden">
                <div className="h-full bg-emerald-400 w-3/4"></div>
            </div>
            <span className="text-xs text-gray-600">HF 75% – Doctor Armed</span>
        </div>
    );
}

function FeedHistoryChart({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    if (disabled) {
        return (
            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-lg">
                Demo mode - Start a DCA to see real feed history
            </div>
        );
    }
    return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-lg">
            No feed history yet
        </div>
    );
}

function HistoryList({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    if (disabled) {
        return (
            <div className="space-y-2">
                <div className="text-gray-500 text-sm">Demo mode - Start a DCA to see real transaction history</div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-mono">#1</span>
                    <span>In: 0.1 ETH Out: 0.095 USDC</span>
                    <span className="text-emerald-500">demo</span>
                </div>
            </div>
        );
    }
    return <div className="text-gray-500 text-sm">No fills yet.</div>;
}

function CancelButton({ orderHash, onCancel, disabled }: { orderHash: string; onCancel: () => void; disabled?: boolean }) {
    return (
        <Button
            onClick={onCancel}
            disabled={disabled}
            className="bg-red-200 hover:bg-red-300 text-red-700 border-red-300 shadow-sm hover:shadow-md transition-all"
        >
            Cancel Order
        </Button>
    );
}