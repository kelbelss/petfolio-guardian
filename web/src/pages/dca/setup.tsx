
import React, { useMemo, useState } from 'react';
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

const formSchema = z.object({
    srcToken: z.string().min(1, 'Source token is required'),
    dstToken: z.string().min(1, 'Destination token is required'),
    chunkIn: z.string().min(1, 'Amount is required'),
    interval: z.number().min(300, 'Interval must be at least 5 minutes'),
    stopCondition: z.enum(['end-date', 'total-amount']),
    endDate: z.date().optional(),
    totalAmount: z.number().min(0.01, 'Total amount must be at least 0.01').optional(),
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
});

type FormValues = z.infer<typeof formSchema>;

export default function FeedWizard() {
    const navigate = useNavigate();
    const setDraft = useFeedStore.setState;
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const { address } = useAccount();

    const existingDraft = useFeedStore();

    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            srcToken: existingDraft.srcToken || '',
            dstToken: existingDraft.dstToken || '',
            chunkIn: existingDraft.chunkIn ? existingDraft.chunkIn.toString() : '',
            interval: existingDraft.interval || 3600,
            stopCondition: existingDraft.stopCondition || 'end-date',
            endDate: existingDraft.endDate ? new Date(existingDraft.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            totalAmount: existingDraft.totalAmount || 100,
        },
    });

    const watchedValues = watch();

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

    const toToken = useMemo(() => {
        return availableTokens.find(t => t.address === watchedValues.dstToken) || null;
    }, [availableTokens, watchedValues.dstToken]);

    // Get balances for selected tokens
    const tokenAddresses = [
        ...(fromToken ? [fromToken.address] : []),
        ...(toToken ? [toToken.address] : [])
    ];
    const { data: balancesData } = useBalances(
        address || '',
        tokenAddresses
    );

    // Get price data for selected tokens
    const { data: rawFromPrice } = useTokenPrice(fromToken?.address || '');
    const { data: rawToPrice } = useTokenPrice(toToken?.address || '');

    // Show connect wallet screen if not connected
    if (!address) {
        return (
            <div className="w-full bg-[#effdf4] min-h-screen flex items-center justify-center">
                <div className="bg-white rounded-2xl p-12 border border-green-200 shadow-lg max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4 text-emerald-700">Connect Your Wallet</h2>
                    <p className="text-gray-600 mb-6">Connect your wallet to create a DCA feed</p>
                    <ConnectButton />
                </div>
            </div>
        );
    }

    // 🆕 helper – keep renders clean
    const getUsd = (priceObj: Record<string, string> | undefined, addr?: string) =>
        decodeUsd(priceObj, addr);

    const fromPriceUsd = useMemo(
        () => getUsd(rawFromPrice, fromToken?.address),
        [rawFromPrice, fromToken?.address]
    );
    const toPriceUsd = useMemo(
        () => getUsd(rawToPrice, toToken?.address),
        [rawToPrice, toToken?.address]
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

    const onSubmit = (data: FormValues) => {
        setDraft({
            srcToken: data.srcToken,
            dstToken: data.dstToken,
            chunkIn: parseFloat(data.chunkIn) || 0,
            interval: data.interval,
            stopCondition: data.stopCondition,
            endDate: data.endDate ? data.endDate.toISOString() : undefined,
            totalAmount: data.totalAmount,
        });
        navigate('/dca/review');
    };

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-4xl mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-emerald-700 mb-2">Create DCA Feed</h1>
                    <p className="text-gray-600 text-lg">Set up automated token purchases to keep your pet healthy</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-8">
                        <h2 className="text-2xl font-bold text-emerald-700 mb-6">Token Configuration</h2>

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
                                <Label htmlFor="dstToken" className="text-sm font-semibold text-gray-700 block">Destination Token</Label>
                                <TokenInput
                                    mode="dca"
                                    token={toToken}
                                    amount=""
                                    onTokenChange={(token) => setValue('dstToken', token.address)}
                                    onAmountChange={() => { }} // No amount input for destination
                                    showMax={false}
                                    hideInput={true}
                                    availableTokens={availableTokens}
                                    tokenPrice={toPriceUsd}
                                />
                                {errors.dstToken && <p className="text-red-500 text-sm mt-2">{errors.dstToken.message}</p>}
                            </div>
                        </div>

                        {errors.chunkIn && <p className="text-red-500 text-sm mt-2">{errors.chunkIn.message}</p>}
                    </div>

                    <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-8">
                        <h2 className="text-2xl font-bold text-emerald-700 mb-6">Feeding Schedule</h2>

                        <div className="space-y-3">
                            <Label htmlFor="interval" className="text-sm font-semibold text-gray-700 block">Feeding Interval</Label>
                            <Controller
                                name="interval"
                                control={control}
                                render={({ field }) => (
                                    <select
                                        {...field}
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
                            </div>

                            <div className={`space-y-3 ${watchedValues.stopCondition !== 'total-amount' ? 'opacity-50 pointer-events-none' : ''}`}>
                                <Label htmlFor="totalAmount" className="text-sm font-semibold text-gray-700 block">Total Amount to DCA</Label>
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
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                            {...field}
                                            value={field.value === 0 ? '' : field.value}
                                            onChange={e => field.onChange(Number(e.target.value))}
                                        />
                                    )}
                                />
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