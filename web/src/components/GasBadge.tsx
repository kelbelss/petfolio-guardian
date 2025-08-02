// src/components/GasBadge.tsx
import { useGasPrice } from '@/lib/oneInchService';

export default function GasBadge() {
    const { data, isLoading } = useGasPrice();

    // don't render anything until we actually have data.fast
    if (isLoading || !data?.fast) return null;

    // now it's safe
    const gwei = (Number(data.fast) / 1e9).toFixed(1);
    return (
        <div className="text-xs bg-emerald-50 text-emerald-700 rounded px-2 py-0.5">
            ⛽ {gwei} Gwei
        </div>
    );
} 