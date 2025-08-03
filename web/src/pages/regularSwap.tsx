import React, { useReducer, useMemo, useEffect, useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTokens, useBalances, useTokenPrice, useQuote, type TokenMeta, type QuoteResponse, normalizeBalances, getSwapTx, getAllowance, getApproveTransaction } from '@/lib/oneInchService';
import { toWei, fromWei, toCanonical, NATIVE_TOKEN, decodeUsd } from '@/lib/tokenUtils';
import { COMMON_TOKENS } from '@/lib/constants';
import TokenInput from '@/components/TokenInput/TokenInput';
import SettingsDrawer from '@/components/SettingsDrawer';
import { ErrorBanner } from '@/components/ErrorBanner';
import ConnectButton from '@/components/ConnectButton';
import { useDebounce } from '@/hooks/useDebounce';
import { useCreateFeed } from '@/hooks/useSupabase';
import { formatUnits } from 'viem';
import { useFeedStore } from '@/lib/feedStore';

// Types
interface SwapState {
    fromToken: TokenMeta | null;
    toToken: TokenMeta | null;
    fromAmount: string;
    toAmount: string;
    slippage: number;
}

// Initial state
const initialState: SwapState = {
    fromToken: null,
    toToken: null,
    fromAmount: '',
    toAmount: '',
    slippage: 1.0, // Standard slippage (1%)
};

// Reducer
type SwapAction =
    | { type: 'SET_FROM_TOKEN'; payload: TokenMeta }
    | { type: 'SET_TO_TOKEN'; payload: TokenMeta }
    | { type: 'SET_FROM_AMOUNT'; payload: string }
    | { type: 'SET_TO_AMOUNT'; payload: string }
    | { type: 'SET_SLIPPAGE'; payload: number }
    | { type: 'RESET' };

function swapReducer(state: SwapState, action: SwapAction): SwapState {
    switch (action.type) {
        case 'SET_FROM_TOKEN':
            return { ...state, fromToken: action.payload };
        case 'SET_TO_TOKEN':
            return { ...state, toToken: action.payload };
        case 'SET_FROM_AMOUNT':
            return { ...state, fromAmount: action.payload };
        case 'SET_TO_AMOUNT':
            return { ...state, toAmount: action.payload };
        case 'SET_SLIPPAGE':
            return { ...state, slippage: action.payload };
        case 'RESET':
            return initialState;
        default:
            return state;
    }
}

// Connect Wallet Banner
function ConnectWalletBanner() {
    return (
        <div className="w-full bg-[#effdf4] min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-md bg-white border-emerald-200">
                <CardContent className="p-8 text-center">
                    <div className="text-6xl mb-4">🔗</div>
                    <h2 className="text-2xl font-bold text-emerald-700 mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-6">
                        Connect your wallet to start swapping tokens
                    </p>
                    <ConnectButton />
                </CardContent>
            </Card>
        </div>
    );
}

export default function RegularSwap() {
    const { address: account } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { mutateAsync: createFeed } = useCreateFeed();
    const setDraft = useFeedStore.setState;

    // Track which side is being edited to prevent loops
    const [isEditingTo, setIsEditingTo] = useState(false);

    // State management with persistence
    const [state, dispatch] = useReducer(swapReducer, (() => {
        const saved = localStorage.getItem('swap_settings');
        const savedSettings = saved ? JSON.parse(saved) : { slippage: 1.0 };
        return {
            ...initialState,
            slippage: savedSettings.slippage,
        };
    })());

    // Track debounced amount for quote requests - use proper debouncing
    const debouncedFromAmount = useDebounce(state.fromAmount, 300);

    // Persist settings to localStorage
    useEffect(() => {
        localStorage.setItem('swap_settings', JSON.stringify({
            slippage: state.slippage,
        }));
    }, [state.slippage]);

    // Get tokens and balances (moved before early return)
    const { data: tokensData, isLoading: tokensLoading, error: tokensError } = useTokens();
    const availableTokens = useMemo(() => {
        if (tokensError) {
            console.error('Tokens API error:', tokensError);
            return [];
        }

        if (!tokensData) return [];

        // v1.3 API format: direct object with address keys
        const allTokens = Object.values(tokensData) as TokenMeta[];

        // Debug: Log some available tokens
        console.log('🔍 Available tokens on Base:', allTokens.slice(0, 10).map(t => ({
            symbol: t.symbol,
            address: t.address,
            name: t.name
        })));

        return allTokens;
    }, [tokensData, tokensError, tokensLoading]);

    // Get balances for selected tokens and common tokens
    const commonTokens = [NATIVE_TOKEN, COMMON_TOKENS[0].address, COMMON_TOKENS[1].address];
    const selectedTokens = [state.fromToken?.address, state.toToken?.address].filter(Boolean) as string[];
    const allRequestedTokens = [...new Set([...commonTokens, ...selectedTokens].map(addr => addr.toLowerCase()))]; // Normalize to lowercase and remove duplicates

    const { data: balancesData } = useBalances(
        account || '',
        allRequestedTokens
    );

    // Get token prices for USD conversion
    const { data: rawFromPrice } = useTokenPrice(state.fromToken?.address || '');
    const { data: rawToPrice } = useTokenPrice(state.toToken?.address || '');

    // Decode prices once for clean renders
    const fromPriceUsd = useMemo(
        () => decodeUsd(rawFromPrice as Record<string, string> | undefined, state.fromToken?.address),
        [rawFromPrice, state.fromToken?.address]
    );
    const toPriceUsd = useMemo(
        () => decodeUsd(rawToPrice as Record<string, string> | undefined, state.toToken?.address),
        [rawToPrice, state.toToken?.address]
    );

    // Get quote for swap - only when we have valid, different tokens
    const shouldFetchQuote = !!state.fromToken?.address &&
        !!state.toToken?.address &&
        state.fromToken.address !== state.toToken.address &&
        !!debouncedFromAmount &&
        debouncedFromAmount !== '0';

    const { data: quote, error: quoteError, isLoading: quoteLoading } = useQuote(
        toCanonical(state.fromToken?.address || ''),
        toCanonical(state.toToken?.address || ''),
        toWei(debouncedFromAmount, state.fromToken?.decimals || 18),
        true, // includeGas
        true, // includeProtocols
        {
            enabled: shouldFetchQuote,
            // Remove staleTime since we're now using debounced amount
        }
    );

    // Auto-fill receive amount when quote changes
    useEffect(() => {
        if (quote && state.toToken && !isEditingTo && (quote as QuoteResponse).dstAmount) {
            const receiveAmount = fromWei((quote as QuoteResponse).dstAmount, state.toToken.decimals);
            dispatch({ type: 'SET_TO_AMOUNT', payload: receiveAmount });
        }
    }, [quote, state.toToken, isEditingTo]);

    // Get balances
    const fromBalance = useMemo(() => {
        if (!balancesData || !state.fromToken) {
            return '0';
        }

        // Normalize balance data to handle different API response shapes
        const normalizedBalances = normalizeBalances(balancesData);

        // Look for balance using lowercase address to match the request
        const balance = normalizedBalances[state.fromToken.address.toLowerCase()];

        const result = fromWei(balance || '0', state.fromToken.decimals);
        return result;
    }, [balancesData, state.fromToken]);

    // Early return if no wallet
    if (!account) {
        return <ConnectWalletBanner />;
    }

    // Handle swap execution
    const handleSwap = async () => {
        console.log('🚀 Starting regular swap with params:', {
            fromToken: state.fromToken?.address,
            toToken: state.toToken?.address,
            fromAmount: state.fromAmount,
            account,
            walletClient: !!walletClient,
            publicClient: !!publicClient
        });

        if (!state.fromToken || !state.toToken || !state.fromAmount || !account || !walletClient) {
            console.error('❌ Missing required swap parameters:', {
                fromToken: state.fromToken?.address,
                toToken: state.toToken?.address,
                fromAmount: state.fromAmount,
                account,
                walletClient: !!walletClient
            });
            toast({
                title: "Missing parameters",
                description: "Please check your wallet connection and token selection",
                variant: "destructive",
            });
            return;
        }

        try {
            toast({
                title: "🔄 Starting swap...",
                description: "Preparing transaction",
            });

            // Validate all parameters before building swap params
            if (typeof state.slippage !== 'number') {
                throw new Error('Invalid slippage settings');
            }

            console.log('💰 Converting amount to wei:', {
                amount: state.fromAmount,
                decimals: state.fromToken.decimals,
                tokenAddress: state.fromToken.address
            });

            const fromAmountWei = toWei(state.fromAmount, state.fromToken.decimals);
            console.log('✅ Amount in wei:', fromAmountWei);

            // Check if amount is too small (less than 1 wei)
            if (BigInt(fromAmountWei) < 1n) {
                throw new Error('Amount is too small for swap');
            }

            // Check token allowance before swap
            console.log('🔍 Checking token allowance...');
            try {
                toast({
                    title: "🔍 Checking allowance...",
                    description: "Verifying token permissions",
                });

                const allowanceData = await getAllowance(state.fromToken.address, account);
                const currentAllowance = BigInt(allowanceData.allowance || '0');
                const requiredAmount = BigInt(fromAmountWei);

                console.log('📊 Allowance check:', {
                    currentAllowance: currentAllowance.toString(),
                    requiredAmount: requiredAmount.toString(),
                    hasEnoughAllowance: currentAllowance >= requiredAmount
                });

                if (currentAllowance < requiredAmount) {
                    console.log('⚠️ Insufficient allowance, getting approval transaction...');
                    toast({
                        title: "🔐 Approving token...",
                        description: "Setting token allowance",
                    });

                    // Get approval transaction
                    const approveData = await getApproveTransaction(state.fromToken.address, fromAmountWei);

                    // Send approval transaction first
                    const approveTx = {
                        ...approveData.tx,
                        gas: approveData.tx.gas ? BigInt(approveData.tx.gas) : undefined,
                    };

                    console.log('📝 Sending approval transaction:', approveTx);
                    const approveHash = await walletClient.sendTransaction(approveTx);
                    console.log('✅ Approval transaction sent:', approveHash);

                    toast({
                        title: "⏳ Waiting for approval...",
                        description: `Hash: ${approveHash.slice(0, 10)}...`,
                    });

                    // Wait for approval to be mined before proceeding
                    if (!publicClient) {
                        throw new Error('Public client not available');
                    }
                    await publicClient.waitForTransactionReceipt({ hash: approveHash });
                    console.log('✅ Approval transaction confirmed');

                    toast({
                        title: "✅ Approval confirmed!",
                        description: "Proceeding with swap",
                    });
                } else {
                    console.log('✅ Sufficient allowance already exists');
                }
            } catch (allowanceError) {
                console.error('❌ Allowance check failed:', allowanceError);
                // Continue with swap - 1inch might handle it
                console.log('⚠️ Continuing with swap despite allowance check failure');
                toast({
                    title: "⚠️ Allowance check failed",
                    description: "Continuing with swap...",
                });
            }

            const slippagePercent = state.slippage.toString();

            // Build swap parameters for 1inch API (matching official docs)
            const isNativeToken = state.fromToken.address.toLowerCase() === NATIVE_TOKEN.toLowerCase();
            const swapParams = {
                src: toCanonical(state.fromToken.address),
                dst: toCanonical(state.toToken.address),
                amount: fromAmountWei,
                from: account,
                slippage: slippagePercent,
                receiver: account,
                // Use disableEstimate for native ETH swaps to avoid 400 errors
                disableEstimate: isNativeToken ? 'true' : 'false'
            };

            console.log('🔗 Token addresses:', {
                fromTokenOriginal: state.fromToken.address,
                fromTokenCanonical: toCanonical(state.fromToken.address),
                toTokenOriginal: state.toToken.address,
                toTokenCanonical: toCanonical(state.toToken.address)
            });

            // Validate token addresses
            if (!swapParams.src || !swapParams.dst) {
                throw new Error('Invalid token addresses');
            }

            // Debug swap parameters
            console.group('🔍 Swap Parameters Debug');
            console.log('From Token:', swapParams.src);
            console.log('To Token:', swapParams.dst);
            console.log('Amount (wei):', swapParams.amount);
            console.log('From Address:', swapParams.from);
            console.log('Slippage:', swapParams.slippage);
            console.log('Amount (human):', state.fromAmount);
            console.log('From Balance:', fromBalance);
            console.log('From Price USD:', fromPriceUsd);
            console.groupEnd();

            console.group('🔍 Token Information Debug');
            console.log('From Token:', state.fromToken);
            console.log('To Token:', state.toToken);
            console.log('Available Tokens Count:', availableTokens.length);
            console.log('Balances Data:', balancesData);
            console.log('Quote Data:', quote);
            console.groupEnd();

            // Get swap transaction from 1inch API
            let swapData;
            try {
                toast({
                    title: "📡 Getting swap quote...",
                    description: "Fetching best route",
                });

                console.log('🌐 Calling 1inch API for swap transaction...');
                console.log('📋 Swap params being sent:', swapParams);
                swapData = await getSwapTx(swapParams);
                console.log('✅ Swap data received:', swapData);
            } catch (apiError) {
                console.error('❌ 1inch API Error:', apiError);

                // Handle specific API errors
                const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);

                if (errorMessage.includes('Cannot Estimate')) {
                    throw new Error('Transaction cannot be estimated. Please check allowances and balances.');
                }
                if (errorMessage.includes('Insufficient Liquidity')) {
                    throw new Error('Insufficient liquidity for this trade. Try a smaller amount or higher slippage.');
                }
                if (errorMessage.includes('Insufficient allowance')) {
                    throw new Error('Token approval required. Please approve the token first.');
                }
                if (errorMessage.includes('No content returned')) {
                    throw new Error('No swap route found. Try different tokens or amounts.');
                }
                if (errorMessage.includes('400')) {
                    throw new Error('Invalid swap parameters. Please check token addresses and amounts.');
                }

                throw apiError;
            }

            if (!swapData) {
                throw new Error('Failed to get swap transaction data');
            }

            // Prepare transaction with proper gas estimation
            const tx = {
                ...swapData.tx,
                // Ensure we have proper gas estimation
                gas: swapData.tx.gas && swapData.tx.gas !== '0' ? BigInt(swapData.tx.gas) : undefined,
                // Use a reasonable gas price if the API returns a very low one
                gasPrice: swapData.tx.gasPrice && parseFloat(swapData.tx.gasPrice) > 0.1
                    ? BigInt(swapData.tx.gasPrice)
                    : undefined
            };

            console.log('📝 Prepared transaction:', tx);

            // Send transaction
            toast({
                title: "🚀 Sending transaction...",
                description: "Please confirm in your wallet",
            });

            console.log('💸 Sending swap transaction...');
            const hash = await walletClient.sendTransaction(tx);
            console.log('✅ Swap transaction sent:', hash);

            toast({
                title: "⏳ Transaction sent!",
                description: `Hash: ${hash.slice(0, 10)}...`,
            });

            // Save to feedStore
            setDraft({
                mode: 'swap',
                srcToken: state.fromToken.address,
                dstToken: state.toToken.address,
                chunkIn: parseFloat(state.fromAmount),
                slippageTolerance: state.slippage,
            });

            // Save swap transaction to feeds
            if (account) {
                try {
                    console.log('💾 Saving swap to database...');
                    await createFeed({
                        wallet_address: account,
                        feed_type: 'swap',
                        src_token: state.fromToken.address,
                        dst_token: state.toToken.address,
                        src_token_symbol: state.fromToken.symbol,
                        dst_token_symbol: state.toToken.symbol,
                        from_amount: state.fromAmount,
                        to_amount: formatUnits(BigInt(swapData.dstAmount || '0'), state.toToken.decimals),
                        chunk_size: parseFloat(state.fromAmount),
                        period: 0,
                        status: 'completed',
                        transaction_hash: hash,
                        metadata: {
                            quote: quote,
                            swapData: swapData,
                            timestamp: Date.now(),
                            // Add a unique identifier to prevent duplicate health calculations
                            healthCalculated: false,
                            swapId: `${hash}-${Date.now()}`
                        },
                        bot_execution_count: 0,
                        bot_execution_errors: []
                    });

                    toast({
                        title: "🎉 Swap completed!",
                        description: `Transaction hash: ${hash.slice(0, 10)}...`,
                    });

                    // Navigate to feeds page
                    navigate('/dca/feeds');
                } catch (error) {
                    console.error('❌ Failed to save swap to Supabase:', error);
                    // Still navigate even if save fails
                    navigate('/dca/feeds');
                }
            }

        } catch (error) {
            console.error('❌ Swap error:', error);

            // Enhanced error messages
            let userMessage = 'Swap failed';
            const errorMessage = error instanceof Error ? error.message : String(error);

            if (errorMessage.includes('allowance')) {
                userMessage = 'Token approval required. Please approve the token first.';
            } else if (errorMessage.includes('liquidity')) {
                userMessage = 'Insufficient liquidity. Try a smaller amount.';
            } else if (errorMessage.includes('balance')) {
                userMessage = 'Insufficient balance. Please check your token balance.';
            } else if (errorMessage.includes('gas')) {
                userMessage = 'Insufficient ETH for gas fees. Please add more ETH to your wallet.';
            } else if (errorMessage.includes('Cannot Estimate')) {
                userMessage = 'Transaction cannot be estimated. Please check allowances and balances.';
            }

            toast({
                title: "❌ Swap failed",
                description: userMessage,
                variant: "destructive",
            });
        }
    };

    const getSwapButtonText = () => {
        if (!state.fromToken || !state.toToken) return 'Select tokens';
        if (!state.fromAmount || parseFloat(state.fromAmount) === 0) return 'Enter amount';
        if (state.fromToken.address === state.toToken.address) return 'Same token';
        if (quoteError) return 'Quote error';
        if (quoteLoading) return 'Loading...';
        if (parseFloat(fromBalance) < parseFloat(state.fromAmount)) return 'Insufficient balance';
        return 'Swap';
    };

    const getSwapButtonDisabled = () => {
        return !state.fromToken ||
            !state.toToken ||
            !state.fromAmount ||
            parseFloat(state.fromAmount) === 0 ||
            state.fromToken.address === state.toToken.address ||
            parseFloat(fromBalance) < parseFloat(state.fromAmount) ||
            !!quoteError ||
            quoteLoading;
    };

    const getErrorMessage = () => {
        if (quoteError) return 'Failed to get quote. Please try again.';
        if (parseFloat(fromBalance) < parseFloat(state.fromAmount)) return 'Insufficient balance';
        return null;
    };

    return (
        <div className="w-full bg-[#effdf4] min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md bg-white border-emerald-200 shadow-lg">
                <CardContent className="p-6 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-emerald-700 mb-2">Swap Tokens</h1>
                        <p className="text-gray-600">Exchange tokens instantly</p>
                    </div>

                    {/* Instant Payment Indicator */}
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-emerald-600">⚡</span>
                            <span className="text-sm font-medium text-emerald-700">Instant Payment Ready</span>
                            <span className="text-emerald-600">⚡</span>
                        </div>
                        <p className="text-xs text-emerald-600 text-center mt-1">
                            Standard 1% slippage
                        </p>
                    </div>

                    {/* Error Banners */}
                    {tokensError && <ErrorBanner msg="Failed to load tokens. Please refresh the page." />}
                    {quoteError && <ErrorBanner msg={quoteError.message || "Failed to get quote. Please try again."} />}

                    {/* From Token */}
                    <div>
                        <label className="block text-sm font-medium text-emerald-700 mb-2">
                            From
                        </label>
                        <TokenInput
                            mode="instant"
                            token={state.fromToken}
                            amount={state.fromAmount}
                            onTokenChange={(token) => {
                                dispatch({ type: 'SET_FROM_TOKEN', payload: token });
                            }}
                            onAmountChange={(amount) => dispatch({ type: 'SET_FROM_AMOUNT', payload: amount })}
                            showMax={true}
                            balance={fromBalance}
                            availableTokens={availableTokens}
                            isLoading={tokensLoading}
                            error={tokensError ? new Error(tokensError.message || 'Token error') : undefined}
                            tokenPrice={fromPriceUsd}
                        />
                    </div>

                    {/* Swap Direction Button */}
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                dispatch({ type: 'SET_FROM_TOKEN', payload: state.toToken! });
                                dispatch({ type: 'SET_TO_TOKEN', payload: state.fromToken! });
                                dispatch({ type: 'SET_FROM_AMOUNT', payload: state.toAmount });
                                dispatch({ type: 'SET_TO_AMOUNT', payload: state.fromAmount });
                                setIsEditingTo(true); // Set editing side to true
                            }}
                            disabled={!state.fromToken || !state.toToken}
                            className="rounded-full w-10 h-10 p-0"
                        >
                            ↓
                        </Button>
                    </div>

                    {/* To Token */}
                    <div>
                        <label className="block text-sm font-medium text-emerald-700 mb-2">
                            To
                        </label>
                        <TokenInput
                            mode="instant"
                            token={state.toToken}
                            amount={state.toAmount}
                            onTokenChange={(token) => dispatch({ type: 'SET_TO_TOKEN', payload: token })}
                            onAmountChange={(amount) => dispatch({ type: 'SET_TO_AMOUNT', payload: amount })}
                            showMax={false}
                            hideInput={true}
                            availableTokens={availableTokens}
                            isLoading={tokensLoading}
                            error={tokensError ? new Error(tokensError.message || 'Token error') : undefined}
                            tokenPrice={toPriceUsd}
                        />
                    </div>

                    {/* Settings */}
                    <SettingsDrawer
                        slippage={state.slippage}
                        onSlippageChange={(value) => dispatch({ type: 'SET_SLIPPAGE', payload: value })}
                    />

                    {/* Swap Button */}
                    <Button
                        onClick={handleSwap}
                        disabled={getSwapButtonDisabled()}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 text-lg font-semibold"
                    >
                        {getSwapButtonText()}
                    </Button>

                    {/* Error Display */}
                    {getErrorMessage() && (
                        <div className="text-red-600 text-sm text-center p-3 bg-red-50 rounded-lg border border-red-200">
                            {getErrorMessage()}
                        </div>
                    )}

                    {/* Back to DCA */}
                    <div className="text-center">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/dca/feeds')}
                            className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                        >
                            ← Back to My Feeds
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}