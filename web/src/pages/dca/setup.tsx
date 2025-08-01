
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';



import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import TokenSelect from '@/components/TokenSelect';

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
        <div className="max-w-4xl mx-auto p-6">
            <header className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-green-600">Setup Feed</h2>
                </div>
                <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-gray-600">Step 1 / 2</span>
                    <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-400 transition-all rounded-full"
                            style={{ width: '50%' }}
                        />
                    </div>
                </div>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white border border-green-200 rounded-xl p-8 shadow-sm">
                <Card>
                    <CardHeader>
                        <CardTitle>DCA Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="srcToken">Source Token</Label>
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
                            <Label htmlFor="dstToken">Destination Token</Label>
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
                            <Label htmlFor="chunkIn">Amount per DCA Fill</Label>
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
                                        {...field}
                                        value={field.value === 0 ? '' : field.value}
                                        onChange={e => field.onChange(Number(e.target.value))}
                                    />
                                )}
                            />
                            {errors.chunkIn && <p className="text-red-500 text-sm mt-1">{errors.chunkIn.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="interval">Interval (seconds)</Label>
                            <Controller
                                name="interval"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="interval"
                                        type="number"
                                        min={1}
                                        step={1}
                                        placeholder="3600"
                                        {...field}
                                        value={field.value === 0 ? '' : field.value}
                                        onChange={e => field.onChange(Number(e.target.value))}
                                    />
                                )}
                            />
                            {errors.interval && <p className="text-red-500 text-sm mt-1">{errors.interval.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="endDate">End Date</Label>
                            <Controller
                                name="endDate"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="endDate"
                                        type="datetime-local"
                                        {...field}
                                        value={field.value ? field.value.toISOString().slice(0, 16) : ''}
                                        onChange={e => field.onChange(new Date(e.target.value))}
                                    />
                                )}
                            />
                            {errors.endDate && <p className="text-red-500 text-sm mt-1">{errors.endDate.message}</p>}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">Summary</h4>
                            <p className="text-sm text-gray-600">
                                Total cycles: {totalCycles} |
                                Estimated duration: {Math.ceil(totalCycles * watchedValues.interval / (24 * 3600))} days
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                        Continue to Review
                    </button>
                </div>
            </form>
        </div>
    );
} 