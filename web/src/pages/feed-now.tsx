import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useQuote, useBalances, type QuoteResponse } from '@/lib/oneInchService';
import { useToast } from '@/components/ui/use-toast';
import { toWei, getTokenDecimals } from '@/lib/utils';
import { useOneInchSwap } from '@/lib/hooks/useOneInchSwap';
import TokenSelect from '@/components/TokenSelect';

const formSchema = z.object({
    srcToken: z.string().min(42, 'Invalid token address'),
    dstToken: z.string().min(42, 'Invalid token address'),
    chunkSize: z.number().min(0.001, 'Chunk size must be at least 0.001'),
    period: z.number().min(60, 'Period must be at least 60 seconds'),
});

type FormValues = z.infer<typeof formSchema>;

export default function FeedNow() {
    const [step, setStep] = useState<'form' | 'preview'>('form');
    const [formData, setFormData] = useState<FormValues | null>(null);
    const { address } = useAccount();
    const { toast } = useToast();
    const { feedNow, loading } = useOneInchSwap();

    const { control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            srcToken: '',
            dstToken: '',
            chunkSize: 0.01,
            period: 3600, // 1 hour
        },
    });

    const watchedValues = watch();

    // Get quote when form is valid
    const quoteEnabled =
        !!watchedValues.srcToken &&
        !!watchedValues.dstToken &&
        watchedValues.chunkSize > 0;

    const quoteAmountWei = watchedValues.srcToken
        ? toWei(watchedValues.chunkSize, watchedValues.srcToken, getTokenDecimals(watchedValues.srcToken))
        : '0';
    const { data: quote, isLoading: quoteLoading } = useQuote(
        watchedValues.srcToken,
        watchedValues.dstToken,
        quoteAmountWei,
        { enabled: quoteEnabled }   // extra option – see step 3
    );

    const onSubmit = (data: FormValues) => {
        setFormData(data);
        setStep('preview');
    };

    const handleConfirm = async () => {
        try {
            const { hash, quote } = await feedNow(
                formData.srcToken,
                formData.dstToken,
                formData.chunkSize,
                1,
            );

            // simplistic pet-state update
            const orderMeta = JSON.parse(localStorage.getItem('orderMeta') || '{}');
            orderMeta.lastFeedTx = hash;
            orderMeta.hunger = 100;
            localStorage.setItem('orderMeta', JSON.stringify(orderMeta));

            setStep('form');
            setFormData(null);
        } catch (err) {
            toast({ title: 'Swap failed', variant: 'destructive' });
        }
    };

    if (step === 'preview' && formData) {
        const { data: balances } = useBalances(address ?? '', [formData.srcToken]);
        const insufficient =
            balances && BigInt(balances.balances[formData.srcToken] ?? '0') <
            BigInt(toWei(formData.chunkSize, formData.srcToken));

        return (
            <div className="max-w-3xl w-full mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6 text-emerald-600">Review DCA Order</h1>

                <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                    <CardHeader>
                        <CardTitle>Order Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Source Token</Label>
                                <p className="text-sm text-gray-600">{formData.srcToken}</p>
                            </div>
                            <div>
                                <Label>Destination Token</Label>
                                <p className="text-sm text-gray-600">{formData.dstToken}</p>
                            </div>
                            <div>
                                <Label>Chunk Size</Label>
                                <p className="text-sm text-gray-600">{formData.chunkSize}</p>
                            </div>
                            <div>
                                <Label>Period</Label>
                                <p className="text-sm text-gray-600">{formData.period} seconds</p>
                            </div>
                        </div>

                        {quoteLoading ? (
                            <div className="text-center py-4">
                                <p>Loading quote...</p>
                            </div>
                        ) : quote ? (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2">Quote Preview</h4>
                                <p className="text-sm text-gray-600">
                                    {(() => {
                                        const q = quote as QuoteResponse;
                                        const dec = q.toToken?.decimals ?? 18;          // fallback to 18
                                        const amt = Number(q.toTokenAmount) / 10 ** dec;
                                        return `You'll receive approximately ${amt.toFixed(6)} ${q.toToken.symbol} per fill`;
                                    })()}
                                </p>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <p className="text-sm text-yellow-800">Unable to get quote. Please check your parameters.</p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <Button
                                variant="outline"
                                onClick={() => setStep('form')}
                                className="flex-1"
                            >
                                Back
                            </Button>
                            {insufficient && (
                                <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded">
                                    <p className="text-red-600 text-sm">
                                        <strong>Insufficient balance:</strong> You don't have enough tokens for this swap.
                                    </p>
                                </div>
                            )}
                            <Button
                                onClick={handleConfirm}
                                className="flex-1"
                                disabled={!address || loading || insufficient}
                            >
                                {loading ? 'Feeding…' : 'Confirm Order'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-3xl w-full mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-6 text-emerald-600">Create a Feed</h1>

            <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
                <CardHeader>
                    <CardTitle>DCA Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <Label htmlFor="srcToken">Source Token</Label>
                            <Controller
                                name="srcToken"
                                control={control}
                                render={({ field }) => (
                                    <TokenSelect {...field} placeholder="Source token…" />
                                )}
                            />
                            {errors.srcToken && (
                                <p className="text-red-500 text-sm mt-1">{errors.srcToken.message}</p>
                            )}
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
                            {errors.dstToken && (
                                <p className="text-red-500 text-sm mt-1">{errors.dstToken.message}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="chunkSize">Chunk Size</Label>
                            <Controller
                                name="chunkSize"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="chunkSize"
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                )}
                            />
                            {errors.chunkSize && (
                                <p className="text-red-500 text-sm mt-1">{errors.chunkSize.message}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="period">Period (seconds)</Label>
                            <Controller
                                name="period"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="period"
                                        type="number"
                                        min="60"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                    />
                                )}
                            />
                            {errors.period && (
                                <p className="text-red-500 text-sm mt-1">{errors.period.message}</p>
                            )}
                        </div>

                        <Button type="submit" className="w-full" disabled={!address}>
                            {address ? 'Preview Order' : 'Connect Wallet'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
} 