import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import { PriceFeedWidget } from '@/components/ui/price-feed-widget';

import { useActiveOrder } from '../lib/useActiveOrder';
import { fetchAllBalances, fetchTokenMetadata } from '@/lib/oneInchTokenApi';
import type { TokenMetadataResponse } from '@/lib/oneInchTokenApi';
import { getStoredDcaOrders, formatTimeUntilNextFill } from '@/lib/dcaCancel';
import { useTokens } from '@/lib/hooks/useTokens';
import { useTokenPrice } from '@/lib/hooks/usePriceFeeds';
import { FALLBACK_TOKENS } from '@/lib/constants';
import type { TokenMeta } from '@/lib/oneInchTokenApi';
import { FeedNowSection } from '@/components/FeedNowSection';



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
    const navigate = useNavigate();
    const demo = new URLSearchParams(location.search).get('demo') === '1';
    const demoHash = '0xdemo0000000000000000000000000000000000000000000000000000000000000000';
    const storedOrderHash = useActiveOrder();
    const orderHash = demo ? demoHash : storedOrderHash;
    const { address } = useAccount();
    const chainId = useChainId();
    const [activeFeeds, setActiveFeeds] = useState<Array<{
        orderHash: string;
        srcToken: string;
        dstToken: string;
        nextFillTime?: number;
        status: string;
    }>>([]);

    // Get token data for display
    const { data: apiTokens } = useTokens();
    const allTokens = [...(apiTokens && apiTokens.length > 0 ? (apiTokens as TokenMeta[]) : FALLBACK_TOKENS)];

    useEffect(() => {
        loadActiveFeeds();
    }, []);

    const loadActiveFeeds = () => {
        const feeds = getStoredDcaOrders();
        const active = feeds.filter(feed => feed.status === 'active');
        setActiveFeeds(active.slice(0, 3)); // Show only first 3
    };

    const getTokenSymbol = (address: string): string => {
        const token = allTokens.find(t => t.address === address);
        return token?.symbol || 'Unknown';
    };

    return (
        <div className="max-w-screen-2xl mx-auto py-12">
            {/* Main Content - Hippo Left, Content Right */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Side - Hippo Section */}
                <div className="lg:col-span-2">
                    <div className="bg-gradient-to-b from-green-50 to-white rounded-2xl py-8 h-auto w-[500px] flex flex-col items-center justify-center sticky top-6">
                        <div className="w-[500px] h-[500px] mb-6">
                            <img
                                src="/src/assets/happy.PNG"
                                alt="Happy Hippo"
                                className="w-[500px] h-[500px] object-contain"
                            />
                        </div>

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
                    <FeedNowSection navigate={navigate} />

                    {/* Active DCA Feeds Widget */}
                    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-blue-700">
                                <div className="flex items-center gap-3">
                                    📊 Your Active DCA Feeds
                                </div>
                                <Link
                                    to="/dca/feeds"
                                    className="text-sm font-normal text-blue-600 hover:text-blue-800 underline"
                                >
                                    View all feeds & history
                                </Link>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activeFeeds.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-gray-500 mb-4">No active feeds</p>
                                    <Link
                                        to="/setup/feed"
                                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                                    >
                                        Create one now
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {activeFeeds.map((feed) => (
                                        <div key={feed.orderHash} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100">
                                            <div className="flex-1">
                                                <div className="font-medium text-gray-900">
                                                    {getTokenSymbol(feed.srcToken)} → {getTokenSymbol(feed.dstToken)}
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    Next fill: {formatTimeUntilNextFill(feed.nextFillTime || 0)}
                                                </div>
                                            </div>
                                            <Link
                                                to="/dca/feeds"
                                                className="text-blue-600 hover:text-blue-800 text-sm"
                                            >
                                                ⏹ Cancel
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Portfolio Section */}
                    {address && (
                        <PortfolioSection address={address} chainId={chainId} navigate={navigate} />
                    )}

                    {/* Price Feed Widget - Full Width */}
                    <div className="w-full">
                        <PriceFeedWidget />
                    </div>

                    {/* Real-Time Chart + History */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-white border border-green-200 rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow h-80">
                                <h2 className="text-2xl font-semibold text-green-600 mb-6 flex items-center space-x-2">
                                    <span>Feed History</span>
                                    <Badge className="bg-amber-50 text-amber-700 text-xs">Demo</Badge>
                                </h2>
                                <FeedHistoryChart orderHash={orderHash || demoHash} disabled={demo || !storedOrderHash} />
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white border border-green-200 rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow h-80 overflow-hidden">
                                <h2 className="text-2xl font-semibold text-green-600 mb-6 flex items-center space-x-2">
                                    <span>Feed Schedule</span>
                                    <Badge className="bg-amber-50 text-amber-700 text-xs">Demo</Badge>
                                </h2>
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



function PortfolioSection({ address, navigate }: { address: string; chainId: number; navigate: (path: string) => void }) {
    const [selectedToken, setSelectedToken] = useState<string | null>(null);
    const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
    const [selectedSwapType, setSelectedSwapType] = useState<'regular' | 'fusion' | 'recurring'>('regular');
    const [tokenBalances, setTokenBalances] = useState<Array<{
        symbol: string;
        name: string;
        balance: string;
        balanceInUnits: number;
        usdValue: number;
        logo: string;
        address: string;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Get real-time prices for major tokens on Base
    const ethPrice = useTokenPrice(8453, '0x4200000000000000000000000000000000000006'); // WETH on Base
    const usdcPrice = useTokenPrice(8453, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'); // USDC on Base
    const daiPrice = useTokenPrice(8453, '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'); // DAI on Base
    const usdtPrice = useTokenPrice(8453, '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'); // USDT on Base
    const wbtcPrice = useTokenPrice(8453, '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22'); // WBTC on Base

    // Real token balances from 1inch API
    useEffect(() => {
        async function fetchBalances() {
            try {
                setIsLoading(true);
                const balances = await fetchAllBalances(address, 8453);

                if (!balances || Object.keys(balances).length === 0) {
                    console.log('PortfolioSection: No balances found - this could mean:');
                    console.log('PortfolioSection: 1. Wallet has no tokens on Base chain');
                    console.log('PortfolioSection: 2. Balance API requires API key');
                    console.log('PortfolioSection: 3. Wrong network selected');
                    console.log('PortfolioSection: 4. API endpoint issue');
                }

                // Format balances for display
                const formattedBalances = Object.entries(balances).map(([address, balanceData]) => {
                    const balanceInUnits = parseFloat(balanceData.balance) / Math.pow(10, balanceData.decimals);
                    return {
                        symbol: balanceData.symbol,
                        name: balanceData.symbol, // Will be updated with real metadata
                        balance: balanceInUnits.toFixed(6),
                        balanceInUnits,
                        usdValue: 0, // Will be calculated with price data
                        logo: balanceData.symbol,
                        address
                    };
                });

                // Try to enhance with token metadata
                try {
                    const tokenMetadata = await fetchTokenMetadata(8453);
                    const metadataMap = new Map(tokenMetadata.map((token: TokenMetadataResponse) => [token.address.toLowerCase(), token]));

                    // Update balances with real metadata
                    const enhancedBalances = formattedBalances.map(balance => {
                        const metadata = metadataMap.get(balance.address.toLowerCase());
                        if (metadata && metadata.name && metadata.symbol) {
                            return {
                                ...balance,
                                name: metadata.name,
                                logo: metadata.symbol // Use symbol as logo
                            };
                        }
                        return balance;
                    });

                    // Calculate USD values using real-time prices for Base tokens
                    const priceMap = new Map([
                        ['0x4200000000000000000000000000000000000006', ethPrice.data?.price || 0], // WETH on Base
                        ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', usdcPrice.data?.price || 1], // USDC on Base
                        ['0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', daiPrice.data?.price || 1], // DAI on Base
                        ['0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', usdtPrice.data?.price || 1], // USDT on Base
                        ['0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', wbtcPrice.data?.price || 0], // WBTC on Base
                    ]);

                    const balancesWithPrices = enhancedBalances.map(balance => {
                        const price = priceMap.get(balance.address.toLowerCase()) || 0;
                        const usdValue = balance.balanceInUnits * parseFloat(price.toString());
                        return {
                            ...balance,
                            usdValue
                        };
                    });

                    setTokenBalances(balancesWithPrices);
                } catch (metadataError) {
                    console.error('Error fetching token metadata:', metadataError);

                    // Calculate USD values for fallback balances on Base
                    const priceMap = new Map([
                        ['0x4200000000000000000000000000000000000006', ethPrice.data?.price || 0], // WETH on Base
                        ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', usdcPrice.data?.price || 1], // USDC on Base
                        ['0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', daiPrice.data?.price || 1], // DAI on Base
                        ['0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', usdtPrice.data?.price || 1], // USDT on Base
                        ['0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22', wbtcPrice.data?.price || 0], // WBTC on Base
                    ]);

                    const balancesWithPrices = formattedBalances.map(balance => {
                        const price = priceMap.get(balance.address.toLowerCase()) || 0;
                        return {
                            ...balance,
                            usdValue: balance.balanceInUnits * parseFloat(price.toString())
                        };
                    });

                    setTokenBalances(balancesWithPrices);
                }

                // If no tokens found, use fallback data for demonstration
                if (formattedBalances.length === 0) {
                    setTokenBalances([
                        {
                            symbol: 'WETH',
                            name: 'Wrapped Ether',
                            balance: '0.0015',
                            balanceInUnits: 0.0015,
                            usdValue: 2.85,
                            logo: 'WETH',
                            address: '0x4200000000000000000000000000000000000006'
                        },
                        {
                            symbol: 'USDC',
                            name: 'USD Coin',
                            balance: '0.00',
                            balanceInUnits: 0.00,
                            usdValue: 0.00,
                            logo: 'USDC',
                            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                        },
                        {
                            symbol: 'DAI',
                            name: 'Dai',
                            balance: '0.00',
                            balanceInUnits: 0.00,
                            usdValue: 0.00,
                            logo: 'DAI',
                            address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
                        }
                    ]);
                } else {
                    setTokenBalances(formattedBalances);
                }
            } catch (error) {
                console.error('PortfolioSection: Error fetching balances:', error);
                // Fallback to mock data if API fails
                setTokenBalances([
                    {
                        symbol: 'WETH',
                        name: 'Wrapped Ether',
                        balance: '2.45',
                        balanceInUnits: 2.45,
                        usdValue: 4532.50,
                        logo: 'WETH',
                        address: '0x4200000000000000000000000000000000000006'
                    },
                    {
                        symbol: 'USDC',
                        name: 'USD Coin',
                        balance: '1250.00',
                        balanceInUnits: 1250.00,
                        usdValue: 1250.00,
                        logo: 'USDC',
                        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
                    }
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        if (address) {
            fetchBalances();
        } else {
            setIsLoading(false);
        }
    }, [address, ethPrice.data?.price, usdcPrice.data?.price, daiPrice.data?.price, usdtPrice.data?.price, wbtcPrice.data?.price]);



    const totalValue = tokenBalances.reduce((sum, token) => sum + token.usdValue, 0);

    if (isLoading) {
        return (
            <Card className="bg-white border-green-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">💰</span>
                            <span>Portfolio</span>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Loading...</div>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="text-gray-500">Loading portfolio data...</div>
                    </div>
                </CardContent>
            </Card>
        );
    }

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
                            <Button
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                                onClick={() => setSelectedSwapType('regular')}
                            >
                                ⚡ Regular Swap
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => setSelectedSwapType('fusion')}
                            >
                                🛡️ Fusion (MEV Protected)
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={() => setSelectedSwapType('recurring')}
                            >
                                🔄 Recurring Feed
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
                            <Button
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                                onClick={() => {
                                    if (selectedSwapType === 'recurring') {
                                        navigate('/setup/feed');
                                    } else {
                                        alert(`${selectedSwapType === 'regular' ? 'Regular' : 'Fusion'} swap functionality coming soon!`);
                                    }
                                }}
                            >
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
        args: [orderHash as `0x${string}`],
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FeedHistoryChart({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    // Demo data for feeding history
    const demoData = [
        { time: '9AM', amount: 0.1, token: 'ETH', happiness: 85 },
        { time: '12PM', amount: 0.15, token: 'ETH', happiness: 90 },
        { time: '3PM', amount: 0.08, token: 'ETH', happiness: 75 },
        { time: '6PM', amount: 0.12, token: 'ETH', happiness: 88 },
        { time: '9PM', amount: 0.1, token: 'ETH', happiness: 82 },
        { time: '12AM', amount: 0.05, token: 'ETH', happiness: 70 },
        { time: '3AM', amount: 0.08, token: 'ETH', happiness: 78 },
    ];

    if (disabled) {
        return (
            <div className="h-full flex">
                {/* Left side - Stats */}
                <div className="w-1/4 flex flex-col justify-start space-y-1 pt-2 pr-4">
                    <div className="bg-emerald-50 rounded p-1.5 text-center">
                        <div className="text-sm font-bold text-emerald-700">{demoData.length}</div>
                        <div className="text-xs text-gray-600">Feeds Today</div>
                    </div>
                    <div className="bg-blue-50 rounded p-1.5 text-center">
                        <div className="text-sm font-bold text-blue-700">0.68 ETH</div>
                        <div className="text-xs text-gray-600">Total Fed</div>
                    </div>
                    <div className="bg-purple-50 rounded p-1.5 text-center">
                        <div className="text-sm font-bold text-purple-700">81%</div>
                        <div className="text-xs text-gray-600">Avg Happiness</div>
                    </div>
                </div>

                {/* Right side - Chart */}
                <div className="w-3/4 flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-xs font-semibold text-gray-700">Last 24 Hours</h3>
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">Demo</span>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 relative min-h-0 max-h-48">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 w-4">
                            <span>100%</span>
                            <span>75%</span>
                            <span>50%</span>
                            <span>25%</span>
                            <span>0%</span>
                        </div>

                        {/* Chart bars */}
                        <div className="ml-4 h-full flex items-end justify-between gap-0.5">
                            {demoData.map((entry, index) => (
                                <div key={index} className="flex-1 flex flex-col items-center">
                                    <div
                                        className="w-full bg-gradient-to-t from-emerald-400 to-emerald-300 rounded-t-sm transition-all hover:from-emerald-500 hover:to-emerald-400"
                                        style={{ height: `${entry.happiness}%` }}
                                    ></div>
                                    <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-left whitespace-nowrap">
                                        {entry.time}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-lg">
            No feed history yet
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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