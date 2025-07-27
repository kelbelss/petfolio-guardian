import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useFeedStore } from '../../lib/feedStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as Slider from '@radix-ui/react-slider';
import { useState } from 'react';

const tokens = [
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
    { symbol: 'ETH', address: '0x0000000000000000000000000000000000000000' },
];

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

    const { control, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            srcToken: '',
            dstToken: '',
            total: 0,
            interval: 86400,
        },
    });

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
        <div className="max-w-3xl w-full mx-auto px-4 py-6">
            <header className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Setup Feed</h2>
                <div className="flex items-center justify-center gap-2 text-sm">
                    <span>Step {step} / {totalSteps}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
                        <div
                            className="h-full bg-emerald-400 transition-all"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>
            </header>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Source Token Selector */}
                <div>
                    <Label htmlFor="srcToken">Source Token</Label>
                    <Controller
                        name="srcToken"
                        control={control}
                        render={({ field }) => (
                            <select
                                id="srcToken"
                                className="block w-full mt-1 rounded border px-3 py-2 bg-background"
                                value={field.value}
                                onChange={e => setValue('srcToken', e.target.value)}
                            >
                                <option value="">Select token</option>
                                {tokens.map(token => (
                                    <option key={token.address} value={token.address}>{token.symbol}</option>
                                ))}
                            </select>
                        )}
                    />
                    {errors.srcToken && <p className="text-red-500 text-sm mt-1">{errors.srcToken.message}</p>}
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
                                className="block w-full mt-1 rounded border px-3 py-2 bg-background"
                                value={field.value}
                                onChange={e => setValue('dstToken', e.target.value)}
                            >
                                <option value="">Select token</option>
                                {tokens.map(token => (
                                    <option key={token.address} value={token.address}>{token.symbol}</option>
                                ))}
                            </select>
                        )}
                    />
                    {errors.dstToken && <p className="text-red-500 text-sm mt-1">{errors.dstToken.message}</p>}
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
                <button type="submit" className="w-full bg-emerald-500 text-white py-2 rounded hover:bg-emerald-600 transition">Continue</button>
            </form>
        </div>
    );
} 