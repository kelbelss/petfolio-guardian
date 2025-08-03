import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useFeedStore } from '@/lib/feedStore';
import { useAccount } from 'wagmi';
import { useBalances, useTokens, useTokenPrice, type TokenMeta, normalizeBalances } from '@/lib/oneInchService';
import { toFloat, decodeUsd } from '@/lib/tokenUtils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import TokenInput from '@/components/TokenInput/TokenInput';
import { Calendar } from '@/components/ui/calendar';
import ConnectButton from '@/components/ConnectButton';
import { AaveV3Base } from '@bgd-labs/aave-address-book';
import { ethers } from 'ethers';
import { UiPoolDataProvider } from '@aave/contract-helpers';



const formSchema = z.object({
    srcToken: z.string().min(1, 'Source token is required'),
    dstToken: z.string().min(1, 'Destination token is required'),
    chunkIn: z.string().min(1, 'Amount is required'),
    interval: z.number().min(300, 'Interval must be at least 5 minutes'),
    stopCondition: z.enum(['end-date', 'total-amount']),
    endDate: z.date().optional(),
    totalAmount: z.number().optional(),
}).refine((data) => {
    if (data.stopCondition === 'end-date') {
        return data.endDate !== undefined;
    }
    if (data.stopCondition === 'total-amount') {
        return data.totalAmount !== undefined && data.totalAmount > 0;
    }
    return true;
}, {
    message: "Please provide the required value for your selected stop condition",
    path: ["stopCondition"]
}).refine((data) => {
    if (data.stopCondition === 'total-amount' && data.totalAmount !== undefined) {
        return data.totalAmount >= 0.01;
    }
    return true;
}, {
    message: "Total amount must be at least 0.01",
    path: ["totalAmount"]
});

type FormValues = z.infer<typeof formSchema>;

export default function AaveYieldWizard() {
    const navigate = useNavigate();
    const setDraft = useFeedStore.setState;
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isPoolDropdownOpen, setIsPoolDropdownOpen] = useState(false);
    const [topPools, setTopPools] = useState<unknown[]>([]);
    const poolDropdownRef = useRef<HTMLDivElement>(null);
    const { address } = useAccount();

    const existingDraft = useFeedStore();

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            srcToken: existingDraft.srcToken || '',
            dstToken: existingDraft.dstToken || existingDraft.srcToken || '',
            chunkIn: existingDraft.chunkIn ? existingDraft.chunkIn.toString() : '',
            interval: existingDraft.interval || 3600,
            stopCondition: existingDraft.stopCondition || 'end-date',
            endDate: existingDraft.endDate ? new Date(existingDraft.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            totalAmount: existingDraft.totalAmount || 0,
        },
    });

    const watchedValues = watch();

    // Fetch Aave pool data
    useEffect(() => {
        const provider = new ethers.providers.JsonRpcProvider(import.meta.env.VITE_RPC_URL);
        const helper = new UiPoolDataProvider({
            uiPoolDataProviderAddress: AaveV3Base.UI_POOL_DATA_PROVIDER,
            provider,
            chainId: 8453,
        });

        helper
            .getReservesHumanized({
                lendingPoolAddressProvider: AaveV3Base.POOL_ADDRESSES_PROVIDER,
            })
            .then(({ reservesData }) => {
                // Use all available tokens on Base
                const popular = ['WETH', 'cbETH', 'USDbC', 'wstETH', 'USDC', 'weETH', 'cbBTC', 'ezETH', 'GHO', 'wrsETH', 'LBTC', 'EURC', 'AAVE'];
                const candidates = reservesData
                    .filter((r: any) => popular.includes(r.symbol));

                // sort descending by APY (liquidityRate)
                candidates.sort((a: any, b: any) =>
                    Number(b.liquidityRate) - Number(a.liquidityRate)
                );

                setTopPools(candidates.slice(0, 10));
            })
            .catch((error) => {
                console.error('Error fetching Aave data:', error);
            });
    }, []);

    // Handle click outside to close pool dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (poolDropdownRef.current && !poolDropdownRef.current.contains(event.target as Node)) {
                setIsPoolDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get tokens - moved before early return to follow Rules of Hooks
    const { data: tokensData } = useTokens();
    const availableTokens = useMemo(() => {
        if (!tokensData) return [];

        // v1.3 API format: direct object with address keys
        const allTokens = Object.values(tokensData) as TokenMeta[];
        return allTokens;
    }, [tokensData]);

    // Get selected tokens
    const fromToken = useMemo(() => {
        return availableTokens.find(t => t.address === watchedValues.srcToken) || null;
    }, [availableTokens, watchedValues.srcToken]);

    // Create a map of token addresses to metadata for logo lookup
    const tokenMetadataMap = useMemo(() => {
        const map = new Map<string, TokenMeta>();
        availableTokens.forEach(token => {
            map.set(token.address.toLowerCase(), token);
        });



        return map;
    }, [availableTokens]);

    // Create letter avatar for tokens without logos
    const getLetterAvatar = (symbol: string) => {
        return symbol.charAt(0).toUpperCase();
    };

    // Get balances for selected tokens
    const tokenAddresses = [
        ...(fromToken ? [fromToken.address] : [])
    ];
    const { data: balancesData } = useBalances(
        address || '',
        tokenAddresses
    );

    // Get price data for selected tokens
    const { data: rawFromPrice } = useTokenPrice(fromToken?.address || '');

    // 🆕 helper – keep renders clean
    const getUsd = (priceObj: Record<string, string> | undefined, addr?: string) =>
        decodeUsd(priceObj, addr);

    const fromPriceUsd = useMemo(
        () => getUsd(rawFromPrice, fromToken?.address),
        [rawFromPrice, fromToken?.address]
    );


    // Get balance data for source token
    const balanceData = useMemo(() => {
        if (!balancesData || !fromToken) {
            return { balance: 0, usdValue: 0, symbol: '' };
        }

        const normalizedBalances = normalizeBalances(balancesData);
        const rawBalance = normalizedBalances[fromToken.address] ?? '0';
        const balance = toFloat(rawBalance, fromToken.address);

        // Calculate USD value if we have price data
        let usdValue = 0;
        if (fromPriceUsd > 0) {
            usdValue = balance * fromPriceUsd;
        }

        return { balance, usdValue, symbol: fromToken.symbol };
    }, [balancesData, fromToken, fromPriceUsd]);

    // Show connect wallet screen if not connected
    if (!address) {
        return (
            <div className="w-full bg-[#effdf4] min-h-screen flex items-center justify-center">
                <div className="bg-white rounded-2xl p-12 border border-green-200 shadow-lg max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4 text-emerald-700">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-6">Connect your wallet to create an Aave yield strategy</p>
                    <ConnectButton />
                </div>
            </div>
        );
    }

    const onSubmit = (data: FormValues) => {
        // Find the selected pool to get its address
        const selectedPool = topPools.find((pool: any) => pool.underlyingAsset === data.dstToken);

        setDraft({
            srcToken: data.srcToken,
            dstToken: data.dstToken,
            chunkIn: parseFloat(data.chunkIn) || 0,
            interval: data.interval,
            stopCondition: data.stopCondition,
            endDate: data.endDate ? data.endDate.toISOString() : undefined,
            totalAmount: data.totalAmount,
            mode: 'your-aave-yield',
            depositToAave: true,
            aavePool: selectedPool?.underlyingAsset || '',
        });
        navigate('/dca/review');
    };

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-emerald-700 mb-2">Create Your Aave Yield Strategy</h1>
                    <p className="text-gray-600 text-lg">Set up automated yield farming on Aave to maximize your returns</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="bg-white rounded-2xl shadow-lg border border-emerald-200 p-8">
                        <h2 className="text-2xl font-bold text-emerald-700 mb-6">Choose Your Aave Pool</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <Label htmlFor="srcToken" className="text-sm font-semibold text-gray-700 block">Source Token</Label>
                                <TokenInput
                                    mode="dca"
                                    token={fromToken}
                                    amount={watchedValues.chunkIn || ''}
                                    onTokenChange={(token) => setValue('srcToken', token.address)}
                                    onAmountChange={(amount) => setValue('chunkIn', amount)}
                                    showMax={false}
                                    balance={balanceData.balance.toString()}
                                    availableTokens={availableTokens}
                                    tokenPrice={fromPriceUsd}
                                />
                                {errors.srcToken && <p className="text-red-500 text-sm mt-2">{errors.srcToken.message}</p>}
                            </div>

                            <div className="space-y-3">
                                <Label className="text-sm font-semibold text-gray-700 block">Pick your Aave Pool</Label>
                                <Controller
                                    name="dstToken"
                                    control={control}
                                    render={({ field }) => {
                                        const selectedPool = topPools.find((pool: any) => pool.underlyingAsset === field.value);
                                        const selectedTokenMeta = selectedPool ? tokenMetadataMap.get(selectedPool.underlyingAsset.toLowerCase()) : null;

                                        return (
                                            <div className="relative" ref={poolDropdownRef}>
                                                <div
                                                    className="w-full px-4 py-3 border rounded-lg focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 bg-white cursor-pointer hover:border-emerald-400 transition-colors"
                                                    onClick={() => setIsPoolDropdownOpen(!isPoolDropdownOpen)}
                                                >
                                                    {selectedPool ? (
                                                        <div className="flex items-center gap-3">
                                                            {selectedTokenMeta?.logoURI ? (
                                                                <img
                                                                    src={selectedTokenMeta.logoURI}
                                                                    alt={selectedPool.symbol}
                                                                    className="w-6 h-6 rounded-full"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                                                                    {getLetterAvatar(selectedPool.symbol)}
                                                                </div>
                                                            )}
                                                            <div className="flex-1">
                                                                <div className="font-medium text-emerald-700">
                                                                    {selectedPool.symbol}
                                                                </div>
                                                                <div className="text-sm text-emerald-600">
                                                                    {((Number(selectedPool.liquidityRate) / 1e27) * 100).toFixed(2)}% APY
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">Select a pool…</span>
                                                    )}
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </div>
                                                </div>

                                                {/* Hidden select for form control */}
                                                <select
                                                    {...field}
                                                    className="sr-only"
                                                >
                                                    <option value="">Select a pool…</option>
                                                    {topPools.map((pool: any) => (
                                                        <option
                                                            key={pool.underlyingAsset}
                                                            value={pool.underlyingAsset}
                                                        >
                                                            {pool.symbol} — {((Number(pool.liquidityRate) / 1e27) * 100).toFixed(2)}% APY
                                                        </option>
                                                    ))}
                                                </select>

                                                {/* Dropdown */}
                                                {isPoolDropdownOpen && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                                        {topPools.map((pool: any) => {
                                                            const tokenMeta = tokenMetadataMap.get(pool.underlyingAsset.toLowerCase());
                                                            return (
                                                                <div
                                                                    key={pool.underlyingAsset}
                                                                    className="p-3 hover:bg-emerald-50 cursor-pointer border-b border-emerald-100 last:border-b-0"
                                                                    onClick={() => {
                                                                        field.onChange(pool.underlyingAsset);
                                                                        setIsPoolDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        {tokenMeta?.logoURI ? (
                                                                            <img
                                                                                src={tokenMeta.logoURI}
                                                                                alt={pool.symbol}
                                                                                className="w-6 h-6 rounded-full"
                                                                                onError={(e) => {
                                                                                    e.currentTarget.style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-600">
                                                                                {getLetterAvatar(pool.symbol)}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1">
                                                                            <div className="font-medium text-emerald-700">
                                                                                {pool.symbol}
                                                                            </div>
                                                                            <div className="text-sm text-emerald-600">
                                                                                {((Number(pool.liquidityRate) / 1e27) * 100).toFixed(2)}% APY
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }}
                                />
                                {errors.dstToken && <p className="text-red-500 text-sm mt-2">{errors.dstToken.message}</p>}
                            </div>
                        </div>

                        {errors.chunkIn && <p className="text-red-500 text-sm mt-2">{errors.chunkIn.message}</p>}
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-8">
                        <h2 className="text-2xl font-bold text-emerald-700 mb-6">Aave Yield Schedule</h2>

                        <div className="space-y-3">
                            <Label htmlFor="interval" className="text-sm font-semibold text-gray-700 block">Yield Interval</Label>
                            <Controller
                                name="interval"
                                control={control}
                                render={({ field }) => (
                                    <select
                                        value={field.value}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    >
                                        <option value={300}>Every 5 minutes</option>
                                        <option value={21600}>Every 6 hours</option>
                                        <option value={43200}>Every 12 hours</option>
                                        <option value={86400}>Every 24 hours</option>
                                        <option value={259200}>Every 3 days</option>
                                        <option value={432000}>Every 5 days</option>
                                        <option value={604800}>Every 7 days</option>
                                        <option value={1209600}>Every 14 days</option>
                                        <option value={2592000}>Every 30 days</option>
                                    </select>
                                )}
                            />
                            {errors.interval && <p className="text-red-500 text-sm mt-2">{errors.interval.message}</p>}
                        </div>

                        <div className="space-y-3 mt-6">
                            <Label htmlFor="stopCondition" className="text-sm font-semibold text-gray-700 block">Stop Condition</Label>
                            <Controller
                                name="stopCondition"
                                control={control}
                                render={({ field }) => (
                                    <select
                                        {...field}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    >
                                        <option value="end-date">End Date</option>
                                        <option value="total-amount">Total Amount</option>
                                    </select>
                                )}
                            />
                            {errors.stopCondition && <p className="text-red-500 text-sm mt-2">{errors.stopCondition.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                            <div className={`space-y-3 ${watchedValues.stopCondition !== 'end-date' ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Label htmlFor="endDate" className="text-sm font-semibold text-gray-700 block">End Date</Label>
                                <Controller
                                    name="endDate"
                                    control={control}
                                    render={({ field }) => (
                                        <Calendar
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            placeholder="Select end date"
                                            isOpen={isCalendarOpen}
                                            onToggle={() => setIsCalendarOpen(!isCalendarOpen)}
                                            disabled={(date) => date < new Date()}
                                        />
                                    )}
                                />
                                {errors.endDate && <p className="text-red-500 text-sm mt-2">{errors.endDate.message}</p>}

                                {/* Show calculated total when end date is selected */}
                                {watchedValues.endDate && watchedValues.chunkIn && watchedValues.interval && fromPriceUsd > 0 && (
                                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                                        <div className="flex justify-between items-center">
                                            <span>Estimated total:</span>
                                            <span className="font-semibold">≈ ${(() => {
                                                const endDate = new Date(watchedValues.endDate);
                                                const now = new Date();
                                                const totalSeconds = Math.floor((endDate.getTime() - now.getTime()) / 1000);
                                                const totalCycles = Math.floor(totalSeconds / Number(watchedValues.interval));
                                                const totalAmount = totalCycles * Number(watchedValues.chunkIn);
                                                return (totalAmount * fromPriceUsd).toFixed(2);
                                            })()}</span>
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Based on {Math.floor((new Date(watchedValues.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className={`space-y-3 ${watchedValues.stopCondition !== 'total-amount' ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Label htmlFor="totalAmount" className="text-sm font-semibold text-gray-700 block">Total Amount to Yield</Label>
                                <div className="relative">
                                    <Controller
                                        name="totalAmount"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="totalAmount"
                                                type="number"
                                                min={0.01}
                                                step={0.01}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                {...field}
                                                value={field.value === 0 ? '' : field.value}
                                                onChange={e => field.onChange(Number(e.target.value) || 0)}
                                            />
                                        )}
                                    />
                                    {(watchedValues.totalAmount || 0) > 0 && fromPriceUsd > 0 && (
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                                            ≈ ${((watchedValues.totalAmount || 0) * fromPriceUsd).toFixed(2)}
                                        </div>
                                    )}
                                </div>
                                {errors.totalAmount && <p className="text-red-500 text-sm mt-2">{errors.totalAmount.message}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-8 border-t border-emerald-200">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="px-8 py-3 text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors font-medium shadow-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium shadow-sm hover:shadow-md"
                        >
                            Continue to Review →
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
} 