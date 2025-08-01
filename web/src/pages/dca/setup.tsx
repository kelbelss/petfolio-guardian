
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';



import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TokenSelect from '@/components/TokenSelect';
import { Calendar } from '@/components/ui/calendar';

import { useFeedStore } from '@/lib/feedStore';

const formSchema = z.object({
    srcToken: z.string().min(1, 'Source token is required'),
    dstToken: z.string().min(1, 'Destination token is required'),
    chunkIn: z.number().min(0.01, 'Amount must be at least 0.01'),
    interval: z.number().min(1, 'Interval must be at least 1 second'),
    endDate: z.date(),
});

type FormValues = z.infer<typeof formSchema>;

export default function FeedWizard() {
    const navigate = useNavigate();
    const setDraft = useFeedStore.setState;
    const existingDraft = useFeedStore();
    const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);



    const { control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            srcToken: existingDraft.srcToken || '',
            dstToken: existingDraft.dstToken || '',
            chunkIn: existingDraft.chunkIn || 0,
            interval: existingDraft.interval || 3600, // 1 hour default
            endDate: existingDraft.endDate ? new Date(existingDraft.endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        },
    });

    const watchedValues = watch();

    const totalCycles = useMemo(() => {
        if (!watchedValues.endDate) return 0;
        const endDate = new Date(watchedValues.endDate);
        const now = new Date();
        const timeDiff = endDate.getTime() - now.getTime();
        const secondsDiff = Math.floor(timeDiff / 1000);
        return Math.floor(secondsDiff / watchedValues.interval);
    }, [watchedValues.endDate, watchedValues.interval]);

    const onSubmit = (data: FormValues) => {
        setDraft({
            ...data,
            endDate: data.endDate.toISOString(),
        });
        navigate('/dca/review');
    };

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-4xl mx-auto py-12 px-6">
                <header className="mb-8">
                    <div className="text-center mb-6">
                        <h2 className="text-4xl font-bold text-emerald-600 mb-2">🍽️ Setup Your DCA Feed</h2>
                        <p className="text-lg text-gray-600">Configure your automated feeding schedule to keep your hippo healthy</p>
                    </div>
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <span className="text-sm font-medium text-emerald-600">Step 1 of 2</span>
                        <div className="flex-1 max-w-md h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all rounded-full"
                                style={{ width: '50%' }}
                            />
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-white border border-emerald-200 rounded-2xl p-8 shadow-lg">
                    <div className="space-y-6">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-emerald-600 mb-2">🦛 DCA Configuration</h3>
                            <p className="text-gray-600">Choose your tokens and feeding schedule</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label htmlFor="srcToken" className="text-sm font-medium text-gray-700 mb-2 block">Source Token</Label>
                                <Controller
                                    name="srcToken"
                                    control={control}
                                    render={({ field }) => (
                                        <TokenSelect {...field} placeholder="Source token…" />
                                    )}
                                />
                                {errors.srcToken && <p className="text-red-500 text-sm mt-1">{errors.srcToken.message}</p>}
                            </div>

                            <div>
                                <Label htmlFor="dstToken" className="text-sm font-medium text-gray-700 mb-2 block">Destination Token</Label>
                                <Controller
                                    name="dstToken"
                                    control={control}
                                    render={({ field }) => (
                                        <TokenSelect {...field} placeholder="Destination token…" />
                                    )}
                                />
                                {errors.dstToken && <p className="text-red-500 text-sm mt-1">{errors.dstToken.message}</p>}
                            </div>

                            <div>
                                <Label htmlFor="chunkIn" className="text-sm font-medium text-gray-700 mb-2 block">Amount per DCA Fill</Label>
                                <div className="relative">
                                    <Controller
                                        name="chunkIn"
                                        control={control}
                                        render={({ field }) => (
                                            <Input
                                                id="chunkIn"
                                                type="number"
                                                min={0.01}
                                                step={0.01}
                                                placeholder="0.00"
                                                className="w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                                {...field}
                                                value={field.value === 0 ? '' : field.value}
                                                onChange={e => field.onChange(Number(e.target.value))}
                                            />
                                        )}
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <span className="text-sm font-medium text-emerald-600">ETH</span>
                                    </div>
                                </div>

                                {/* Balance and USD Value Display */}
                                <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <span>Balance: 2.45 ETH</span>
                                        <button type="button" className="text-emerald-600 hover:text-emerald-700 font-medium">
                                            Max
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <div>≈ $4,900.00 USD</div>
                                        <div>1 ETH = $2,000.00</div>
                                    </div>
                                </div>

                                {errors.chunkIn && <p className="text-red-500 text-sm mt-1">{errors.chunkIn.message}</p>}
                            </div>

                            <div>
                                <Label htmlFor="interval" className="text-sm font-medium text-gray-700 mb-2 block">Feeding Interval</Label>
                                <Controller
                                    name="interval"
                                    control={control}
                                    render={({ field }) => (
                                        <select
                                            id="interval"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                                            value={field.value}
                                            onChange={e => field.onChange(Number(e.target.value))}
                                        >
                                            <option value={3600}>Every hour</option>
                                            <option value={7200}>Every 2 hours</option>
                                            <option value={21600}>Every 6 hours</option>
                                            <option value={43200}>Every 12 hours</option>
                                            <option value={86400}>Every day</option>
                                            <option value={604800}>Every week</option>
                                        </select>
                                    )}
                                />
                                {errors.interval && <p className="text-red-500 text-sm mt-1">{errors.interval.message}</p>}
                            </div>

                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                            <div>
                                <Label htmlFor="endDate" className="text-sm font-medium text-gray-700 mb-2 block">End Date</Label>
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
                                {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>}
                            </div>

                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 p-6 rounded-xl border border-emerald-200">
                                <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                                    📊 Feed Summary
                                </h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total cycles:</span>
                                        <span className="font-semibold text-emerald-600">{totalCycles}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Estimated duration:</span>
                                        <span className="font-semibold text-emerald-600">{Math.ceil(totalCycles * watchedValues.interval / (24 * 3600))} days</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Total amount:</span>
                                        <span className="font-semibold text-emerald-600">${(totalCycles * watchedValues.chunkIn).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="px-6 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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