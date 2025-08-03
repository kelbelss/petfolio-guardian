import { useFeedStore } from '../../lib/feedStore';
import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';
import { useQuote, useGasPrice, useTokens, useTokenPrice, type QuoteResponse, type TokenMeta } from '@/lib/oneInchService';
import { calculateDcaParameters, calculateTwapParameters } from '@/lib/dcaCalculations';
import { Navigate, useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { toWei, fromWei, decodeUsd } from '@/lib/tokenUtils';
import { useCreateOrderV2 as useCreateOrder } from '@/lib/hooks/useLimitOrderV2';
import { fillOrderTxV2 as fillOrderTx } from '@/lib/limitOrderV2';
import { useWalletClient, usePublicClient } from 'wagmi';
import type { PublicClient } from 'viem';
import { usePetState } from '@/hooks/usePetState';
import { useCreateFeed } from '@/hooks/useSupabase';

// Number formatting helper
const fmt = (n: number, max = 6) =>
    Intl.NumberFormat('en-US', { maximumFractionDigits: max }).format(n);

// Better formatting for token amounts
const formatTokenAmount = (amount: string | number, decimals = 6) => {
    if (!amount || amount === '0' || amount === 0) return '0';

    const num = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(num)) return 'Invalid';

    // If the number is very small, show more decimals
    if (num < 0.000001) {
        return num.toExponential(2);
    }

    // If the number is very large, show fewer decimals
    if (num > 1000) {
        return Intl.NumberFormat('en-US', {
            maximumFractionDigits: 2,
            minimumFractionDigits: 2
        }).format(num);
    }

    // Normal formatting
    return Intl.NumberFormat('en-US', {
        maximumFractionDigits: decimals,
        minimumFractionDigits: 0
    }).format(num);
};

// USD helper
const usd = (val: number, decimals = 2) => `≈ $${fmt(val, decimals)}`;

// Short hash helper
const shortHash = (hash: string) => `${hash.slice(0, 6)}…${hash.slice(-4)}`;

// Copy to clipboard helper
const copyToClipboard = async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
};

// BaseScan URL helper
const getBaseScanUrl = (address: string) => `https://basescan.org/address/${address}`;

// Interval formatting helper
const formatInterval = (seconds: number) => {
    const hours = seconds / 3600;
    const minutes = seconds / 60;

    if (hours >= 24) {
        const days = Math.round(hours / 24);
        return `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours >= 1) {
        // For hours, limit to 1 decimal place max
        const roundedHours = Math.round(hours * 10) / 10;
        return `${roundedHours} h`;
    } else {
        // For minutes, show whole numbers
        const roundedMinutes = Math.round(minutes);
        return `${roundedMinutes} min`;
    }
};

// Grid row helper
const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <>
        <dt className="text-gray-600">{label}</dt>
        <dd className="font-semibold text-right truncate">{children}</dd>
    </>
);

// Token address component with copy and explorer links
const TokenAddress = ({ address }: { address: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const success = await copyToClipboard(address);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="flex items-center gap-2 ml-6">
            <span className="truncate max-w-[160px] cursor-help font-mono text-base" title={address}>
                {shortHash(address)}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={handleCopy}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy address"
                >
                    {copied ? (
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    )}
                </button>
                <a
                    href={getBaseScanUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="View on PolygonScan"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                </a>
            </div>
        </div>
    );
};

export default function TokenDcaReview() {
    const draft = useFeedStore();



    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { mutateAsync: createOrder, isPending: isLoading } = useCreateOrder();
    const { feedDCACreation } = usePetState();
    const { mutateAsync: createFeed } = useCreateFeed();

    // Get gas price for fee estimation
    const { data: gasPriceData } = useGasPrice();

    // Get ETH price for USD conversion
    const { data: ethPriceData } = useTokenPrice('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');

    // Get tokens for symbol lookup
    const { data: tokensData } = useTokens();
    const availableTokens = useMemo(() => {
        if (!tokensData) return [];
        return Object.values(tokensData) as TokenMeta[];
    }, [tokensData]);



    // Get source token decimals
    const srcToken = availableTokens.find((t: TokenMeta) => t.address === draft.srcToken);
    const srcTokenDecimals = srcToken?.decimals || 18;

    // Convert human chunkIn to wei using correct decimals
    const amountWei = draft.srcToken && draft.chunkIn
        ? toWei(draft.chunkIn.toString(), srcTokenDecimals)
        : '0';

    console.log('Debug amountWei calculation:', {
        draftChunkIn: draft.chunkIn,
        draftChunkInType: typeof draft.chunkIn,
        srcTokenAddress: draft.srcToken,
        srcTokenSymbol: srcToken?.symbol,
        srcTokenDecimals: srcTokenDecimals,
        amountWei,
        amountWeiInHuman: fromWei(amountWei, srcTokenDecimals)
    });

    // Check if same token transfer
    const isSameToken = draft.srcToken === draft.dstToken;

    // Fetch a price quote (skip for same token transfers)
    const quoteEnabled = Boolean(
        draft.srcToken &&
        draft.dstToken &&
        amountWei !== '0' &&
        !isSameToken
    );

    const {
        data: quoteData,
        isFetching: quoteLoading,
        isError: quoteError,

    } = useQuote(
        draft.srcToken || '',
        draft.dstToken || '',
        amountWei,
        true, // includeGas
        true, // includeProtocols
        {
            enabled: quoteEnabled,
            retry: 3,
            retryDelay: 1000,
            refetchOnMount: true,
            refetchOnWindowFocus: true,
        }
    );

    // Read dstAmount from the new API response format
    const rawAmount = (quoteData as QuoteResponse)?.dstAmount;
    const quoteResponse = quoteData as QuoteResponse;

    // Debug quote response




    // Loading & error states (skip for same token transfers)
    if (!isSameToken) {
        if (quoteLoading) {
            return <div className="p-6 text-center">Loading price quote…</div>;
        }
        if (quoteError || !rawAmount) {
            return (
                <div className="p-6 text-center text-red-600">
                    Error fetching quote. Please try again.
                </div>
            );
        }
    }

    // Get destination token decimals
    const dstToken = availableTokens.find((t: TokenMeta) => t.address === draft.dstToken);
    const dstTokenDecimals = dstToken?.decimals || 18;

    console.log('Debug destination token:', {
        dstTokenAddress: draft.dstToken,
        dstTokenSymbol: dstToken?.symbol,
        dstTokenDecimals: dstTokenDecimals
    });

    // Debug ETH price
    const ethPriceUsd = decodeUsd(ethPriceData, dstToken?.address);
    console.log('Debug ETH price:', {
        ethPriceData,
        ethPriceUsd,
        dstTokenAddress: dstToken?.address
    });

    // Convert to human units (for same token, use chunkIn as takingHuman)
    // For DCA, we want the per-fill amount, not the total amount
    const takingHuman = isSameToken ? draft.chunkIn : fromWei(rawAmount, dstTokenDecimals);

    // Redirect if draft incomplete
    if (!draft.srcToken || !draft.dstToken) {
        return <Navigate to="/dca/token-dca" replace />;
    }

    // For DCA, the quote is already for the per-fill amount since we quoted chunkIn
    const perFillQuoteAmount = isSameToken ? amountWei : rawAmount;

    // Compute DCA parameters for display
    const dcaParams = calculateDcaParameters({
        chunkIn: draft.chunkIn,
        endDate: draft.endDate,
        totalAmount: draft.totalAmount,
        interval: draft.interval,
        slippageTolerance: isSameToken ? 0 : draft.slippageTolerance, // Set minSlippage = 0 for same token
        quoteAmount: perFillQuoteAmount, // Use per-fill quote amount
    });

    // Debug logging
    console.log('Draft chunkIn:', draft.chunkIn);
    console.log('Draft totalAmount:', draft.totalAmount);
    console.log('Amount Wei:', amountWei);
    console.log('Raw Amount from Quote:', rawAmount);
    console.log('Per Fill Quote Amount:', perFillQuoteAmount);
    console.log('DCA Params:', dcaParams);
    console.log('Quote Response:', quoteResponse);
    console.log('Taking Human:', takingHuman);
    console.log('Gas Price Data:', gasPriceData);

    // Debug gas fee calculation (after dcaParams is defined)
    if (gasPriceData && gasPriceData.medium && dcaParams) {
        const estimatedGas = quoteResponse?.gas || 150000;
        const gasFeeWei = Number(gasPriceData.medium.maxFeePerGas) * estimatedGas;
        const gasFeeEth = gasFeeWei / 1e18;
        console.log('Debug gas fee:', {
            maxFeePerGas: gasPriceData.medium.maxFeePerGas,
            estimatedGas,
            gasFeeWei,
            gasFeeEth,
            gasFeeUsd: gasFeeEth * ethPriceUsd
        });
    }

    // Compute TWAP parameters for the new contract structure
    const twapParams = calculateTwapParameters({
        chunkIn: draft.chunkIn,
        endDate: draft.endDate,
        totalAmount: draft.totalAmount,
        interval: draft.interval,
        slippageTolerance: isSameToken ? 0 : draft.slippageTolerance, // Set minSlippage = 0 for same token
        quoteAmount: perFillQuoteAmount, // Use per-fill quote amount
        depositToAave: false, // Always false for peer-dca mode
        recipient: draft.mode === 'peer-dca' ? draft.recipient as `0x${string}` : address as `0x${string}`,
    });

    // Confirm handler: build and store limit order
    async function handleConfirm() {
        if (!walletClient || !address) {
            toast({ title: 'Wallet not connected', variant: 'destructive' });
            return;
        }

        // Handle swap mode differently - immediate execution
        if (draft.mode === 'swap') {
            // Navigate to regular swap page with pre-filled data
            navigate('/regular-swap');
            return;
        }

        try {
            // Create the limit order (Permit2 signature is included in the order)
            try {
                toast({ title: '1️⃣ Creating limit order…' });

                console.log('Creating order with tokens:', {
                    srcToken: draft.srcToken,
                    dstToken: draft.dstToken,
                    srcTokenSymbol: availableTokens.find(t => t.address === draft.srcToken)?.symbol,
                    dstTokenSymbol: availableTokens.find(t => t.address === draft.dstToken)?.symbol
                });

                // Convert to human units (for same token, use chunkIn as takingHuman)
                const takingHumanString = isSameToken ? draft.chunkIn.toString() : fromWei(rawAmount, dstTokenDecimals);

                console.log('About to create order...');
                console.log('Order creation params:', {
                    makerAsset: draft.srcToken,
                    takerAsset: draft.dstToken,
                    makingHuman: draft.chunkIn,
                    takingHuman: takingHumanString,
                    maker: address,
                    srcTokenDecimals: srcTokenDecimals,
                    dstTokenDecimals: dstTokenDecimals
                });

                const ENABLE_PERMIT2 = true; // Enable Permit2 - let's debug why it's failing

                const { order, signature } = await createOrder({
                    walletClient: walletClient!, // Pass walletClient
                    publicClient: publicClient!, // Pass publicClient
                    makerAsset: draft.srcToken as `0x${string}`,
                    takerAsset: draft.dstToken as `0x${string}`,
                    makingHuman: draft.chunkIn,
                    takingHuman: takingHumanString, // Pass as string for precision
                    maker: address as `0x${string}`,
                    srcTokenDecimals: srcTokenDecimals, // Pass decimals
                    dstTokenDecimals: dstTokenDecimals, // Pass decimals
                    // Add TWAP parameters for the new contract structure
                    twapParams: {
                        interval: twapParams.twapParams.interval,
                        chunks: twapParams.twapParams.chunks,
                        chunkIn: twapParams.twapParams.chunkIn,
                        minOut: twapParams.twapParams.minOut,
                    },
                    // Add Aave parameters for recipient handling
                    aaveParams: {
                        depositToAave: draft.mode === 'your-aave-yield',
                        recipient: draft.mode === 'peer-dca' ? draft.recipient as `0x${string}` : address as `0x${string}`,
                        aavePool: draft.mode === 'your-aave-yield' ? (draft.aavePool as `0x${string}`) || '0x0000000000000000000000000000000000000000' as `0x${string}` : '0x0000000000000000000000000000000000000000' as `0x${string}`,
                    },
                    enablePermit2: ENABLE_PERMIT2, // Pass the flag
                });

                console.log('Order created successfully:', {
                    orderHash: order.hash,
                    order: order,
                    signature: signature
                });

                // 7) Check and set token allowance for Limit Order Protocol
                const BYPASS_ALLOWANCE_CHECK = true; // Set to true to skip allowance check for testing

                if (!BYPASS_ALLOWANCE_CHECK) {
                    try {
                        toast({ title: '2️⃣ Checking token allowance...' });

                        // Check current allowance for the Limit Order Protocol contract directly
                        const { CONTRACT_ADDRESSES } = await import('@/config/base');
                        const LIMIT_ORDER_PROTOCOL = CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL;
                        const ERC20_ABI = await import('@/abis/ERC20.json');

                        const allowance = await publicClient!.readContract({
                            address: draft.srcToken as `0x${string}`,
                            abi: ERC20_ABI.default,
                            functionName: 'allowance',
                            args: [address as `0x${string}`, LIMIT_ORDER_PROTOCOL]
                        }) as bigint;

                        console.log('Current allowance:', allowance.toString());
                        console.log('Required amount:', draft.chunkIn.toString());

                        if (allowance < BigInt(draft.chunkIn)) {
                            toast({ title: '3️⃣ Setting token allowance...' });

                            // Create approval transaction directly
                            const { encodeFunctionData } = await import('viem');
                            const approveData = encodeFunctionData({
                                abi: ERC20_ABI.default,
                                functionName: 'approve',
                                args: [LIMIT_ORDER_PROTOCOL, BigInt(draft.chunkIn)]
                            });

                            console.log('Approval transaction data:', approveData);

                            // Send approval transaction
                            const approveHash = await walletClient!.sendTransaction({
                                to: draft.srcToken as `0x${string}`,
                                data: approveData,
                                value: 0n,
                            });

                            console.log('Approval transaction sent:', approveHash);
                            toast({ title: '⏳ Waiting for approval confirmation...' });

                            // Wait for approval confirmation
                            const approveReceipt = await publicClient!.waitForTransactionReceipt({ hash: approveHash });
                            console.log('Approval confirmed:', approveReceipt);
                            toast({ title: '✅ Token allowance set!' });
                        } else {
                            console.log('✅ Sufficient allowance already exists');
                        }
                    } catch (allowanceError) {
                        console.error('Allowance check/set failed:', allowanceError);

                        // Show detailed error message with manual approval instructions
                        const errorMessage = allowanceError instanceof Error ? allowanceError.message : String(allowanceError);
                        toast({
                            title: '❌ Allowance Check Failed',
                            description: `Error: ${errorMessage}. Please approve ${draft.srcToken} for the Limit Order Protocol contract manually.`,
                            variant: 'destructive'
                        });

                        // Show manual approval instructions
                        const { CONTRACT_ADDRESSES } = await import('@/config/base');
                        console.log('Manual approval required for:', {
                            token: draft.srcToken,
                            spender: CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL,
                            amount: draft.chunkIn
                        });

                        throw allowanceError; // Re-throw to prevent order creation
                    }
                } else {
                    console.log('⚠️ Bypassing allowance check for testing...');
                    toast({
                        title: '⚠️ Allowance Check Bypassed',
                        description: 'Testing mode - proceeding without allowance check',
                        variant: 'default'
                    });
                }

                // 8) Submit order to LimitOrderProtocol
                const ENABLE_ONCHAIN_SUBMISSION = true;
                let orderHash: string | undefined;
                if (ENABLE_ONCHAIN_SUBMISSION) {
                    try {
                        toast({ title: '3️⃣ Submitting order to blockchain...' });

                        console.log('Submitting order to LimitOrderProtocol:', {
                            order: order,
                            signature: signature,
                            account: address
                        });

                        console.log('🔍 Full order structure for debugging:', {
                            orderHash: order.hash,
                            permit: order.permit,
                            interactions: order.interactions,
                            // Note: Other fields are in typedData.message
                        });

                        // Check ETH balance for gas (using public client from hook)
                        const ethBalance = await publicClient!.getBalance({ address: address as `0x${string}` });
                        console.log('💰 ETH Balance for gas:', ethBalance.toString());
                        if (ethBalance < 10000000000000000n) { // Less than 0.01 ETH
                            console.warn('⚠️ Low ETH balance for gas fees');
                        }

                        orderHash = await fillOrderTx(walletClient!, publicClient as PublicClient, order, signature, address as `0x${string}`, BYPASS_ALLOWANCE_CHECK);

                        console.log('Order submitted successfully:', orderHash);
                        toast({
                            title: '✅ Order Submitted!',
                            description: `Transaction: ${shortHash(orderHash)}`
                        });

                        // Wait for order confirmation
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    } catch (orderSubmitError) {
                        console.error('Order submission failed:', orderSubmitError);
                        toast({
                            title: '❌ Order Submission Failed',
                            description: orderSubmitError instanceof Error ? orderSubmitError.message : String(orderSubmitError),
                            variant: 'destructive'
                        });
                        throw orderSubmitError; // Re-throw to prevent saving to Supabase
                    }
                }

                // 10) Persist to Supabase for bot execution

                // Persist to Supabase for bot execution
                try {
                    await createFeed({
                        wallet_address: address,
                        feed_type: 'recurring',
                        src_token: draft.srcToken,
                        dst_token: draft.dstToken,
                        src_token_symbol: availableTokens.find(t => t.address === draft.srcToken)?.symbol || '',
                        dst_token_symbol: availableTokens.find(t => t.address === draft.dstToken)?.symbol || '',
                        from_amount: draft.chunkIn.toString(),
                        to_amount: takingHuman.toString(),
                        chunk_size: draft.chunkIn,
                        period: draft.interval,
                        status: 'active',
                        next_fill_time: new Date(Date.now() + draft.interval * 1000).toISOString(),
                        stop_condition: draft.stopCondition,
                        end_date: draft.endDate,
                        total_amount: draft.totalAmount,
                        order_hash: order.hash,
                        metadata: {
                            order: order,
                            signature: signature,
                            twapParams: {
                                interval: twapParams.twapParams.interval,
                                chunks: twapParams.twapParams.chunks,
                                chunkIn: twapParams.twapParams.chunkIn,
                                minOut: twapParams.twapParams.minOut,
                            },
                            aaveParams: {
                                depositToAave: draft.mode === 'your-aave-yield',
                                recipient: draft.mode === 'peer-dca' ? (draft.recipient || address) : address,
                                aavePool: draft.mode === 'your-aave-yield' ? (draft.aavePool || '') : '',
                            },
                            mode: draft.mode,
                            // permit2Hash removed - Permit2 is now handled in order creation
                            orderTransactionHash: orderHash,
                        },
                        bot_execution_count: 0,
                        bot_execution_errors: [],
                    });

                    toast({
                        title: '✅ DCA Feed Created & Saved!',
                        description: `Order ${shortHash(order.hash)} created and persisted to database`
                    });
                } catch (supabaseError) {
                    console.error('Failed to save to Supabase:', supabaseError);
                    if (supabaseError instanceof Error) {
                        console.error('Supabase error details:', {
                            message: supabaseError.message,
                            stack: supabaseError.stack,
                            name: supabaseError.name
                        });
                    }
                    toast({
                        title: '⚠️ Order Created but Save Failed',
                        description: `Database error: ${supabaseError instanceof Error ? supabaseError.message : String(supabaseError)}`,
                        variant: 'destructive'
                    });
                }

                // 9) Update pet state
                feedDCACreation(order.hash, `${draft.srcToken}-${draft.dstToken}`);

                // 10) Navigate to dashboard
                navigate('/');
            } catch (orderError) {
                console.error('Order creation failed:', orderError);
                if (orderError instanceof Error) {
                    console.error('Order error details:', {
                        message: orderError.message,
                        stack: orderError.stack,
                        name: orderError.name
                    });
                } else {
                    console.error('Order error (unknown type):', orderError);
                }

                // Show detailed error in toast
                const errorMessage = orderError instanceof Error ? orderError.message : String(orderError);
                toast({
                    title: 'Order creation failed',
                    description: errorMessage,
                    variant: 'destructive'
                });
            }
        } catch (error) {
            console.error('Transaction failed:', error);
            toast({
                title: 'Transaction failed',
                description: String(error),
                variant: 'destructive'
            });
        }
    }

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-emerald-700 mb-2">
                        Review {draft.mode === 'swap' ? 'Swap' : draft.mode === 'peer-dca' ? 'Peer DCA' : draft.mode === 'your-aave-yield' ? 'Aave Yield' : 'Token DCA'} Strategy
                    </h1>
                    <p className="text-gray-600 text-lg">
                        Confirm your {draft.mode === 'swap' ? 'swap' : draft.mode === 'peer-dca' ? 'peer DCA' : draft.mode === 'your-aave-yield' ? 'Aave yield' : 'token purchase'} strategy
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">
                    {/* Strategy Summary */}
                    <Card className="border-emerald-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-700">Strategy Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-[auto,1fr] gap-y-2 gap-x-4 text-sm">
                                <Row label="Source Token">
                                    <TokenAddress address={draft.srcToken} />
                                </Row>
                                <Row label="Destination Token">
                                    {(() => {
                                        const dstToken = availableTokens.find((t: TokenMeta) => t.address === draft.dstToken);
                                        return dstToken ? dstToken.symbol : <TokenAddress address={draft.dstToken} />;
                                    })()}
                                </Row>
                                <Row label="Amount per Purchase">
                                    {usd(draft.chunkIn)}
                                </Row>
                                <Row label="Interval">
                                    {formatInterval(draft.interval)}
                                </Row>
                                <Row label="Stop Condition">
                                    <span className="capitalize">{draft.stopCondition.replace('-', ' ')}</span>
                                </Row>
                                {draft.stopCondition === 'end-date' && draft.endDate && (
                                    <Row label="End Date">
                                        {new Date(draft.endDate).toLocaleDateString()}
                                    </Row>
                                )}
                                {draft.stopCondition === 'total-amount' && draft.totalAmount && (
                                    <Row label="Total Amount">
                                        {usd(draft.totalAmount)}
                                    </Row>
                                )}
                                <Row label="Slippage Tolerance">
                                    {isSameToken ? '0% (Same token transfer)' : `${draft.slippageTolerance}%`}
                                </Row>
                                {/* Show recipient for peer-dca mode */}
                                {draft.mode === 'peer-dca' && draft.recipient && (
                                    <Row label="Recipient">
                                        <TokenAddress address={draft.recipient} />
                                    </Row>
                                )}
                                {draft.mode !== 'peer-dca' && (
                                    <Row label="Recipient">
                                        <span className="opacity-50">Self (default)</span>
                                    </Row>
                                )}
                                <Row label="Deposit to Aave">
                                    {draft.mode === 'your-aave-yield' ? (
                                        <span className="text-green-600">✓ Yes</span>
                                    ) : (
                                        <span className="opacity-50">No</span>
                                    )}
                                </Row>
                                {draft.mode === 'your-aave-yield' && draft.aavePool && (
                                    <Row label="Aave Pool">
                                        <TokenAddress address={draft.aavePool} />
                                    </Row>
                                )}
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Execution Details */}
                    <Card className="border-emerald-200">
                        <CardHeader>
                            <CardTitle className="text-emerald-700">Execution Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid grid-cols-[auto,1fr] gap-y-2 gap-x-4 text-sm">
                                <Row label="Total Cycles">
                                    {dcaParams.totalCycles}
                                </Row>
                                <Row label="Estimated Duration">
                                    {dcaParams.estimatedDays} days
                                </Row>
                                <Row label="Total Amount to DCA">
                                    {usd(dcaParams.totalAmountToDca)}
                                </Row>
                                <Row label="Min Output per Fill">
                                    {dcaParams.minOutPerFill && dcaParams.minOutPerFill !== '0' ?
                                        (() => {
                                            const tokenAmount = Number(fromWei(dcaParams.minOutPerFill, dstTokenDecimals));
                                            const ethPriceUsd = decodeUsd(ethPriceData, dstToken?.address);
                                            const usdAmount = ethPriceUsd > 0 ? tokenAmount * ethPriceUsd : null;
                                            return (
                                                <div>
                                                    <div>{formatTokenAmount(tokenAmount)} {dstToken?.symbol}</div>
                                                    {usdAmount && <div className="text-xs text-gray-500">≈ ${usdAmount.toFixed(2)}</div>}
                                                </div>
                                            );
                                        })() :
                                        'Calculating...'
                                    }
                                </Row>
                                <Row label="TWAP Min Output">
                                    {twapParams.twapParams.minOut && twapParams.twapParams.minOut !== 0n ?
                                        (() => {
                                            const tokenAmount = Number(fromWei(twapParams.twapParams.minOut.toString(), dstTokenDecimals));
                                            const ethPriceUsd = decodeUsd(ethPriceData, dstToken?.address);
                                            const usdAmount = ethPriceUsd > 0 ? tokenAmount * ethPriceUsd : null;
                                            return (
                                                <div>
                                                    <div>{formatTokenAmount(tokenAmount)} {dstToken?.symbol}</div>
                                                    {usdAmount && <div className="text-xs text-gray-500">≈ ${usdAmount.toFixed(2)}</div>}
                                                </div>
                                            );
                                        })() :
                                        'Calculating...'
                                    }
                                </Row>
                                <Row label="Current Quote">
                                    {isSameToken ?
                                        `${formatTokenAmount(Number(takingHuman))} (Same token transfer)` :
                                        takingHuman ? (() => {
                                            const tokenAmount = Number(takingHuman);
                                            const ethPriceUsd = decodeUsd(ethPriceData, dstToken?.address);
                                            const usdAmount = ethPriceUsd > 0 ? tokenAmount * ethPriceUsd : null;
                                            return (
                                                <div>
                                                    <div>{formatTokenAmount(tokenAmount)} {dstToken?.symbol}</div>
                                                    {usdAmount && <div className="text-xs text-gray-500">≈ ${usdAmount.toFixed(2)}</div>}
                                                </div>
                                            );
                                        })() : 'Calculating...'
                                    }
                                </Row>
                                {gasPriceData && gasPriceData.medium && (
                                    <Row label="Est. Gas Fee">
                                        {usd((Number(gasPriceData.medium.maxFeePerGas) * (quoteResponse?.gas || 150000)) / 1e18, 6)}
                                    </Row>
                                )}
                                <Row label="Permit2 Status">
                                    <span className="text-xs text-gray-600">
                                        Will be generated when order is created
                                    </span>
                                </Row>
                            </dl>
                        </CardContent>
                    </Card>
                </div>

                <CardFooter className="flex justify-between pt-8">
                    <Button
                        variant="outline"
                        onClick={() => navigate(
                            draft.mode === 'swap' ? '/regular-swap' :
                                draft.mode === 'peer-dca' ? '/dca/friend' :
                                    draft.mode === 'token-dca' ? '/dca/token-dca' :
                                        draft.mode === 'your-aave-yield' ? '/dca/your-aave-yield' :
                                            '/dca/token-dca'
                        )}
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                        ← Back to Setup
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Creating Order...' : `Create ${draft.mode === 'swap' ? 'Swap' : draft.mode === 'peer-dca' ? 'Peer DCA' : draft.mode === 'your-aave-yield' ? 'Aave Yield' : 'DCA'} Strategy`}
                    </Button>
                </CardFooter>
            </div>
        </div>
    );
} 