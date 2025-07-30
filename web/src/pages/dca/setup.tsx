import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useFeedStore } from '../../lib/feedStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Slider from '@radix-ui/react-slider';
import { useState } from 'react';
import { useQuote, useBalances } from '@/lib/hooks/oneInchHooks';
import { useTokens } from '@/lib/hooks/useTokens';
import type { TokenMeta } from '@/lib/oneInchTokenApi';
import { parseEther, formatEther } from 'viem';
import { useAccount, usePublicClient } from 'wagmi';

const formSchema = z.object({
    srcToken: z.string().min(1, 'Select a source token'),
    dstToken: z.string().min(1, 'Select a destination token'),
    total: z.number().positive('Amount must be positive'),
    interval: z.number().min(60, 'Interval must be at least 1 minute'),
});

type FormValues = z.infer<typeof formSchema>;

export default function FeedWizard() {
    const step = 1;
    const totalSteps = 4;
    const navigate = useNavigate();
    const setDraft = useFeedStore.setState;
    const [sliderValue, setSliderValue] = useState([86400]);
    const { address } = useAccount();

    // Token list from 1inch + any user-added custom tokens
    const { data: apiTokens, isLoading: tokensLoading } = useTokens();
    const [customTokens, setCustomTokens] = useState<TokenMeta[]>([]);
    const [addingCustom, setAddingCustom] = useState(false);
    const [customAddress, setCustomAddress] = useState('');

    const publicClient = usePublicClient();
    const ERC20_ABI = [
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function decimals() view returns (uint8)"
    ] as const;

    async function handleAddCustomToken() {
        try {
            // Try find in 1inch list
            let token = (apiTokens ?? []).find((t: any) => t.address.toLowerCase() === customAddress.toLowerCase());
            if (!token) {
                // Fallback: on-chain lookup using viem
                const [symbol, name, decimals] = await Promise.all([
                    publicClient.readContract({
                        address: customAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'symbol',
                    }),
                    publicClient.readContract({
                        address: customAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'name',
                    }),
                    publicClient.readContract({
                        address: customAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'decimals',
                    }),
                ]);
                token = { symbol, name, address: customAddress, decimals };
            }
            setCustomTokens(prev => [...prev, token as TokenMeta]);
            setAddingCustom(false);
            setCustomAddress('');
        } catch (err) {
            console.error('Failed to add token', err);
            // Optionally show an error toast
        }
    }

    const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            srcToken: '',
            dstToken: '',
            total: 0,
            interval: 86400,
        },
    });

    // Watch form values for quote calculation
    const watchedValues = watch();
    const chunkIn = watchedValues.total ? (watchedValues.total / 4).toFixed(2) : '0';

    // Fallback tokens if API fails - using correct ERC20 addresses
    const fallbackTokens: TokenMeta[] = [
        { symbol: 'WETH', name: 'Wrapped Ether', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
        { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
        { symbol: 'DAI', name: 'Dai Stablecoin', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
        { symbol: 'USDT', name: 'Tether USD', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
        { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8 },
        { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18 },
    ];

    // Combine API tokens with custom tokens, fallback to default tokens if API fails
    const tokensToShow = [
        ...(apiTokens && apiTokens.length > 0 ? (apiTokens as TokenMeta[]) : fallbackTokens),
        ...customTokens
    ];

    // Debug logging
    console.log('API Tokens:', apiTokens);
    console.log('API Tokens Error:', tokensLoading ? 'Loading...' : 'No error');
    console.log('Custom Tokens:', customTokens);
    console.log('Tokens to Show:', tokensToShow);
    console.log('Tokens Loading:', tokensLoading);
    console.log('Using Fallback Tokens:', !apiTokens || apiTokens.length === 0);

    // Fetch wallet balances for selected tokens
    const selectedTokens = [watchedValues.srcToken, watchedValues.dstToken].filter(Boolean);
    const balancesQuery = useBalances(address || '', selectedTokens);
    const balances = (balancesQuery.data as any) || {};

    // Get quote using the hook
    const quoteQuery = useQuote(
        watchedValues.srcToken,
        watchedValues.dstToken,
        parseEther(chunkIn).toString()
    );

    const toTokenAmount = (quoteQuery.data as any)?.toTokenAmount as string | undefined;

    const onSubmit = (data: FormValues) => {
        setDraft(data);
        navigate('/setup/feed/review');
    };

    // Helper to format seconds to human readable
    function formatInterval(seconds: number) {
        if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
        return `${Math.round(seconds / 86400)} days`;
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-green-600 mb-4">Setup Feed</h2>
                <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-gray-600">Step {step} / {totalSteps}</span>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-400 transition-all rounded-full"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>
            </header>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white border border-green-200 rounded-xl p-8 shadow-sm">
                {/* Source Token Selector */}
                <div>
                    <Label htmlFor="srcToken">Source Token</Label>
                    {(!apiTokens || apiTokens.length === 0) && !tokensLoading && (
                        <div className="text-sm text-amber-600 mb-2">
                            ⚠️ Using fallback tokens (check console for API errors)
                        </div>
                    )}
                    <Controller
                        name="srcToken"
                        control={control}
                        render={({ field }) => (
                            <select
                                id="srcToken"
                                className="block w-full mt-1 rounded-lg border border-green-200 px-3 py-2 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                                value={field.value}
                                onChange={e => setValue('srcToken', e.target.value)}
                                disabled={tokensLoading}
                            >
                                <option value="">
                                    {tokensLoading ? 'Loading tokens...' : 'Select token'}
                                </option>
                                {tokensToShow.map((token: TokenMeta) => (
                                    <option key={token.address} value={token.address}>
                                        {token.symbol} – {token.name || token.address.slice(0, 6) + '...'}
                                    </option>
                                ))}
                            </select>
                        )}
                    />
                    {errors.srcToken && <p className="text-red-500 text-sm mt-1">{errors.srcToken.message}</p>}
                    {/* Wallet Balance Display */}
                    {watchedValues.srcToken && balances[watchedValues.srcToken] && (
                        <div className="text-sm text-gray-400 mt-1">
                            You have {Number(balances[watchedValues.srcToken].balance).toFixed(4)} {balances[watchedValues.srcToken].symbol}
                        </div>
                    )}
                </div>

                {/* Shared Custom Token UI */}
                <div className="border-t border-green-100 pt-4">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="text-sm underline text-emerald-600 hover:text-emerald-700"
                            onClick={() => setAddingCustom(true)}
                        >
                            + Add custom token
                        </button>
                        {addingCustom && (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Token address"
                                    className="border px-2 py-1 rounded text-sm"
                                    value={customAddress}
                                    onChange={e => setCustomAddress(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-emerald-400 rounded text-white text-sm"
                                    onClick={handleAddCustomToken}
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </div>
                    {customTokens.length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                            Custom tokens: {customTokens.map(t => t.symbol).join(', ')}
                        </div>
                    )}
                </div>

                {/* Destination Token Selector */}
                <div>
                    <Label htmlFor="dstToken">Destination Token</Label>
                    <Controller
                        name="dstToken"
                        control={control}
                        render={({ field }) => (
                            <select
                                id="dstToken"
                                className="block w-full mt-1 rounded-lg border border-green-200 px-3 py-2 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-colors"
                                value={field.value}
                                onChange={e => setValue('dstToken', e.target.value)}
                                disabled={tokensLoading}
                            >
                                <option value="">
                                    {tokensLoading ? 'Loading tokens...' : 'Select token'}
                                </option>
                                {tokensToShow.map((token: TokenMeta) => (
                                    <option key={token.address} value={token.address}>
                                        {token.symbol} – {token.name || token.address.slice(0, 6) + '...'}
                                    </option>
                                ))}
                            </select>
                        )}
                    />
                    {errors.dstToken && <p className="text-red-500 text-sm mt-1">{errors.dstToken.message}</p>}
                    {/* Wallet Balance Display */}
                    {watchedValues.dstToken && balances[watchedValues.dstToken] && (
                        <div className="text-sm text-gray-400 mt-1">
                            You have {Number(balances[watchedValues.dstToken].balance).toFixed(4)} {balances[watchedValues.dstToken].symbol}
                        </div>
                    )}
                </div>
                {/* Total USDC Input */}
                <div>
                    <Label htmlFor="total">Total USDC</Label>
                    <Controller
                        name="total"
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="total"
                                type="number"
                                min={1}
                                step={0.01}
                                {...field}
                                value={field.value === 0 ? '' : field.value}
                                onChange={e => field.onChange(Number(e.target.value))}
                            />
                        )}
                    />
                    {errors.total && <p className="text-red-500 text-sm mt-1">{errors.total.message}</p>}
                </div>
                {/* Interval Slider */}
                <div>
                    <Label htmlFor="interval">Interval</Label>
                    <Controller
                        name="interval"
                        control={control}
                        render={({ field }) => (
                            <div className="flex flex-col gap-2">
                                <Slider.Root
                                    className="relative flex items-center select-none touch-none w-full h-6"
                                    min={3600}
                                    max={604800}
                                    step={3600}
                                    value={[field.value]}
                                    onValueChange={val => {
                                        setSliderValue(val);
                                        field.onChange(val[0]);
                                    }}
                                >
                                    <Slider.Track className="bg-gray-300 relative grow rounded-full h-2">
                                        <Slider.Range className="absolute bg-emerald-400 rounded-full h-2" />
                                    </Slider.Track>
                                    <Slider.Thumb className="block w-5 h-5 bg-emerald-400 rounded-full shadow" />
                                </Slider.Root>
                                <span className="text-sm text-gray-400">{formatInterval(sliderValue[0])}</span>
                            </div>
                        )}
                    />
                    {errors.interval && <p className="text-red-500 text-sm mt-1">{errors.interval.message}</p>}
                </div>
                <button type="submit" className="w-full bg-emerald-400 hover:bg-emerald-500 text-white py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all">Continue</button>
            </form>

            {/* Quote Display */}
            {watchedValues.srcToken && watchedValues.dstToken && watchedValues.total > 0 && (
                <div className="mt-6 p-6 rounded-xl bg-white border border-green-200 shadow-sm">
                    <div className="font-semibold mb-4 text-green-600 text-lg">Price Feed & Quote</div>
                    {quoteQuery.isLoading && (
                        <div className="flex items-center gap-2 text-gray-600">
                            <svg className="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            <span>Fetching quote...</span>
                        </div>
                    )}
                    {quoteQuery.isError && (
                        <div className="text-red-500">
                            Failed to fetch quote. <button onClick={() => quoteQuery.refetch()} className="underline">Retry</button>
                        </div>
                    )}
                    {toTokenAmount && (
                        <div>
                            <div className="text-xl font-semibold text-emerald-600">
                                1 slice ≈ {Number(formatEther(BigInt(toTokenAmount))).toFixed(4)} {tokensToShow.find((t: TokenMeta) => t.address === watchedValues.dstToken)?.symbol}
                            </div>
                            <div className="text-sm text-gray-600 mt-2">
                                Based on {chunkIn} {tokensToShow.find((t: TokenMeta) => t.address === watchedValues.srcToken)?.symbol} per slice
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                                Total: {watchedValues.total} {tokensToShow.find((t: TokenMeta) => t.address === watchedValues.srcToken)?.symbol} → ~{(Number(formatEther(BigInt(toTokenAmount))) * 4).toFixed(4)} {tokensToShow.find((t: TokenMeta) => t.address === watchedValues.dstToken)?.symbol}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 