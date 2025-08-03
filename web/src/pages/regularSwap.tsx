import React, { useReducer, useMemo, useEffect, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTokens, useBalances, useTokenPrice, useQuote, type TokenMeta, type QuoteResponse, normalizeBalances, getSwapTx } from '@/lib/oneInchService';
import { toWei, fromWei, toCanonical, NATIVE_TOKEN, decodeUsd } from '@/lib/tokenUtils';
import { COMMON_TOKENS } from '@/lib/constants';
import TokenInput from '@/components/TokenInput/TokenInput';
import SettingsDrawer from '@/components/SettingsDrawer';
import RouteInfo from '@/components/RouteInfo';
import { ErrorBanner } from '@/components/ErrorBanner';
import ConnectButton from '@/components/ConnectButton';
import { useDebounce } from '@/hooks/useDebounce';
import { useCreateFeed } from '@/hooks/useSupabase';
import { formatUnits } from 'viem';

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
    const navigate = useNavigate();
    const { toast } = useToast();
    const { mutateAsync: createFeed } = useCreateFeed();

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
        return allTokens;
    }, [tokensData, tokensError, tokensLoading]);

    // Get balances for selected tokens and common tokens
    const commonTokens = [NATIVE_TOKEN, COMMON_TOKENS.WETH, COMMON_TOKENS.USDC];
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
        if (!state.fromToken || !state.toToken || !state.fromAmount || !account || !walletClient) {
            console.error('Missing required swap parameters:', {
                fromToken: state.fromToken?.address,
                toToken: state.toToken?.address,
                fromAmount: state.fromAmount,
                account,
                walletClient: !!walletClient
            });
            return;
        }

        try {
            // Validate all parameters before building swap params
            if (typeof state.slippage !== 'number') {
                throw new Error('Invalid slippage settings');
            }

            const fromAmountWei = toWei(state.fromAmount, state.fromToken.decimals);
            const slippagePercent = state.slippage.toString();
            const isNativeToken = state.fromToken.address.toLowerCase() === NATIVE_TOKEN.toLowerCase();

            // Build swap parameters for 1inch API
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

            // Get swap transaction from 1inch API
            const swapData = await getSwapTx(swapParams);

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

            // Send transaction
            const hash = await walletClient.sendTransaction(tx);

            // Save swap transaction to feeds
            if (account) {
                try {
                    await createFeed({
                        wallet_address: account,
                        feed_type: 'swap',
                        src_token: state.fromToken.address,
                        dst_token: state.toToken.address,
                        src_token_symbol: state.fromToken.symbol,
                        dst_token_symbol: state.toToken.symbol,
                        from_amount: state.fromAmount,
                        to_amount: formatUnits(BigInt(swapData.tx.dstAmount || '0'), state.toToken.decimals),
                        chunk_size: parseFloat(state.fromAmount),
                        period: 0,
                        status: 'completed',
                        transaction_hash: hash,
                        metadata: {
                            quote: quote,
                            swapData: swapData,
                            timestamp: Date.now()
                        },
                        bot_execution_count: 0,
                        bot_execution_errors: []
                    });

                    toast({
                        title: "Swap completed!",
                        description: `Transaction hash: ${hash.slice(0, 10)}...`,
                    });

                    // Navigate to feeds page
                    navigate('/dca/feeds');
                } catch (error) {
                    console.error('Failed to save swap to Supabase:', error);
                    // Still navigate even if save fails
                    navigate('/dca/feeds');
                }
            }

        } catch (error) {
            console.error('Swap error:', error);
            toast({
                title: "Swap failed",
                description: error instanceof Error ? error.message : "Unknown error occurred",
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
            quoteError ||
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

                    {/* Route Info */}
                    <RouteInfo
                        quote={quote as QuoteResponse}
                        fromToken={state.fromToken || undefined}
                        toToken={state.toToken || undefined}
                        fromAmount={state.fromAmount}
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