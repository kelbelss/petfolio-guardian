import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CONTRACT_ADDRESSES } from '@/lib/constants';
import { PriceFeedWidget } from '@/components/ui/price-feed-widget';
import { formatEther } from 'viem';
import { useActiveOrder } from '../lib/useActiveOrder';
import { fetchAllBalances, fetchTokenMetadata } from '@/lib/oneInchTokenApi';
import type { TokenMetadataResponse } from '@/lib/oneInchTokenApi';



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
                    <FeedNowSection />

                    {/* Portfolio Section */}
                    {address && (
                        <PortfolioSection address={address} />
                    )}

                    {/* Price Feed Widget - Full Width */}
                    <div className="w-full">
                        <PriceFeedWidget />
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

    // Token selection state
    const [fromToken, setFromToken] = useState('USDC');
    const [toToken, setToToken] = useState('ETH');
    const [amount, setAmount] = useState('');
    const [quote, setQuote] = useState<{ price: string; output: string } | null>(null);
    const [isQuoteLoading, setIsQuoteLoading] = useState(false);

    // Common tokens for selection
    const commonTokens = [
        { symbol: 'ETH', name: 'Ethereum', address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
        { symbol: 'DAI', name: 'Dai', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' },
        { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599' },
        { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984' },
    ];

    const swapOptions = [
        {
            id: 'regular',
            title: 'Regular',
            description: 'Instant DEX swap, classic path',
            icon: '⚡',
            estimatedTime: '~30 seconds',
            estimatedGas: '~150,000 gas',
            explanation: 'Standard swap through 1inch aggregator. Fastest execution with competitive pricing.'
        },
        {
            id: 'fusion',
            title: 'Fusion',
            description: 'Intent-based, MEV-protected, better price',
            icon: '🛡️',
            estimatedTime: '~2-5 minutes',
            estimatedGas: '~80,000 gas',
            explanation: 'MEV-protected intent-based swap. Slower but better price execution and protection.'
        },
        {
            id: 'mev-protect',
            title: 'MEV Protect',
            description: 'Regular swap via Web3 API protection',
            icon: '🔒',
            estimatedTime: '~1-2 minutes',
            estimatedGas: '~120,000 gas',
            explanation: 'Standard swap submitted through Web3 API for MEV protection.'
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
                        {/* Token Selection */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Tokens</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* From Token */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-700">From Token</label>
                                    <div className="relative">
                                        <select
                                            value={fromToken}
                                            onChange={(e) => setFromToken(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        >
                                            {commonTokens.map((token) => (
                                                <option key={token.symbol} value={token.symbol}>
                                                    {token.symbol} - {token.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Amount"
                                            value={amount}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setAmount('100')}
                                            className="px-3"
                                        >
                                            Max
                                        </Button>
                                    </div>
                                </div>

                                {/* To Token */}
                                <div className="space-y-3">
                                    <label className="text-sm font-medium text-gray-700">To Token</label>
                                    <div className="relative">
                                        <select
                                            value={toToken}
                                            onChange={(e) => setToToken(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        >
                                            {commonTokens.map((token) => (
                                                <option key={token.symbol} value={token.symbol}>
                                                    {token.symbol} - {token.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="text-sm text-gray-600">
                                            You'll receive: <span className="font-semibold text-emerald-600">
                                                {quote ? quote.output : '0.00'} {toToken}
                                            </span>
                                        </div>
                                        {quote && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Price: {quote.price}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Get Quote Button */}
                            <div className="mt-4">
                                <Button
                                    onClick={async () => {
                                        if (amount && fromToken !== toToken) {
                                            setIsQuoteLoading(true);
                                            try {
                                                // Get token addresses
                                                const fromTokenData = commonTokens.find(t => t.symbol === fromToken);
                                                const toTokenData = commonTokens.find(t => t.symbol === toToken);

                                                if (fromTokenData && toTokenData) {
                                                    // Convert amount to wei (assuming 18 decimals for simplicity)
                                                    const amountInWei = (parseFloat(amount) * Math.pow(10, 18)).toString();

                                                    // Fetch real quote from 1inch API
                                                    const response = await fetch(`https://1inch-vercel-proxy-ecru.vercel.app/swap/v6.0/1/quote?src=${fromTokenData.address}&dst=${toTokenData.address}&amount=${amountInWei}`);
                                                    const quoteData = await response.json();

                                                    if (quoteData.toTokenAmount) {
                                                        // Convert from wei to human readable
                                                        const outputAmount = parseFloat(quoteData.toTokenAmount) / Math.pow(10, quoteData.toToken.decimals);
                                                        const inputAmount = parseFloat(quoteData.fromTokenAmount) / Math.pow(10, quoteData.fromToken.decimals);
                                                        const price = (inputAmount / outputAmount).toFixed(2);

                                                        setQuote({
                                                            price: `$${price}`,
                                                            output: outputAmount.toFixed(6)
                                                        });
                                                    } else {
                                                        // Fallback to reasonable estimate
                                                        const ethPrice = 1850; // Approximate ETH price
                                                        const outputAmount = fromToken === 'ETH' ?
                                                            parseFloat(amount) * ethPrice :
                                                            parseFloat(amount) / ethPrice;
                                                        setQuote({
                                                            price: `$${ethPrice}`,
                                                            output: outputAmount.toFixed(6)
                                                        });
                                                    }
                                                }
                                            } catch (error) {
                                                console.error('Error fetching quote:', error);
                                                // Fallback to reasonable estimate
                                                const ethPrice = 1850;
                                                const outputAmount = fromToken === 'ETH' ?
                                                    parseFloat(amount) * ethPrice :
                                                    parseFloat(amount) / ethPrice;
                                                setQuote({
                                                    price: `$${ethPrice}`,
                                                    output: outputAmount.toFixed(6)
                                                });
                                            } finally {
                                                setIsQuoteLoading(false);
                                            }
                                        }
                                    }}
                                    disabled={!amount || fromToken === toToken || isQuoteLoading}
                                    variant="outline"
                                    className="w-full"
                                >
                                    {isQuoteLoading ? 'Getting Quote...' : 'Get Quote'}
                                </Button>
                            </div>
                        </div>

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
    const [tokenBalances, setTokenBalances] = useState<Array<{
        symbol: string;
        name: string;
        balance: string;
        usdValue: number;
        logo: string;
        address: string;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Real token balances from 1inch API
    useEffect(() => {
        async function fetchBalances() {
            try {
                setIsLoading(true);
                console.log('Fetching balances for address:', address);



                const balances = await fetchAllBalances(address, 1);
                console.log('Received balances:', balances);
                console.log('Balances type:', typeof balances);
                console.log('Balances keys:', Object.keys(balances));
                console.log('Balances length:', Object.keys(balances).length);

                // Convert balances to our format
                const formattedBalances = Object.entries(balances).map(([tokenAddress, balanceData]) => {
                    const data = balanceData as { symbol: string; balance: string; decimals: number };

                    // Format balance based on token decimals
                    let formattedBalance: string;
                    if (data.decimals === 6) {
                        // For 6-decimal tokens (USDC, USDT), show 2 decimal places
                        const balanceInUnits = parseFloat(data.balance) / Math.pow(10, data.decimals);
                        formattedBalance = balanceInUnits.toFixed(2);
                    } else {
                        // For 18-decimal tokens (ETH, DAI), use formatEther
                        formattedBalance = formatEther(BigInt(data.balance));
                    }

                    return {
                        symbol: data.symbol,
                        name: data.symbol, // We'll get real name from metadata later
                        balance: formattedBalance,
                        usdValue: 0, // We'll calculate this with price data
                        logo: data.symbol, // Use symbol as logo
                        address: tokenAddress
                    };
                });

                // Fetch token metadata for better names and logos
                try {
                    const tokenMetadata = await fetchTokenMetadata(1);
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

                    setTokenBalances(enhancedBalances);
                } catch (metadataError) {
                    console.error('Error fetching token metadata:', metadataError);
                    setTokenBalances(formattedBalances);
                }

                console.log('Formatted balances:', formattedBalances);

                // If no tokens found, use fallback data for demonstration
                if (formattedBalances.length === 0) {
                    console.log('No tokens found, using fallback data');
                    setTokenBalances([
                        {
                            symbol: 'ETH',
                            name: 'Ethereum',
                            balance: '0.0015',
                            usdValue: 2.85,
                            logo: 'ETH',
                            address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
                        },
                        {
                            symbol: 'USDC',
                            name: 'USD Coin',
                            balance: '0.00',
                            usdValue: 0.00,
                            logo: 'USDC',
                            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
                        },
                        {
                            symbol: 'DAI',
                            name: 'Dai',
                            balance: '0.00',
                            usdValue: 0.00,
                            logo: 'DAI',
                            address: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
                        }
                    ]);
                } else {
                    setTokenBalances(formattedBalances);
                }
            } catch (error) {
                console.error('Error fetching balances:', error);
                // Fallback to mock data if API fails
                setTokenBalances([
                    {
                        symbol: 'ETH',
                        name: 'Ethereum',
                        balance: '2.45',
                        usdValue: 4532.50,
                        logo: 'ETH',
                        address: '0x0000000000000000000000000000000000000000'
                    },
                    {
                        symbol: 'USDC',
                        name: 'USD Coin',
                        balance: '1250.00',
                        usdValue: 1250.00,
                        logo: 'USDC',
                        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
                    }
                ]);
            } finally {
                setIsLoading(false);
            }
        }

        if (address) {
            console.log('Wallet connected, fetching balances...');
            fetchBalances();
        } else {
            console.log('No wallet connected, showing loading state');
            setIsLoading(false);
        }
    }, [address]);



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