import { useEffect, useState } from 'react';
import { usePetState, type OrderMeta } from '@/hooks/usePetState';

// dashboard.tsx
export default function Dashboard() {
    const [orderMeta, setOrderMeta] = useState<OrderMeta | null>(null);

    // Load order meta from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('orderMeta');
        if (stored) {
            try {
                setOrderMeta(JSON.parse(stored));
            } catch (error) {
                console.error('Failed to parse orderMeta from localStorage:', error);
            }
        }
    }, []);

    // Use dummy order meta if none exists
    const dummyOrderMeta: OrderMeta = {
        orderHash: '0xdummy123456789',
        srcToken: '0x4200000000000000000000000000000000000006',
        dstToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        chunkSize: 0.01,
        period: 3600, // 1 hour
        createdAt: Date.now() - 1800000, // 30 minutes ago
        nextFillTime: Date.now() + 1800000, // 30 minutes from now
    };

    const petState = usePetState(orderMeta || dummyOrderMeta);

    const getSpriteState = () => {
        if (petState.isStarving) return '😵';
        if (petState.isHungry) return '😰';
        if (petState.isFull) return '😊';
        return '😐';
    };

    const getHungerBarColor = () => {
        if (petState.hunger <= 20) return 'bg-red-500';
        if (petState.hunger <= 50) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="max-w-3xl w-full mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6 text-emerald-600">Petfolio Guardian</h1>

            {/* Pet Sprite */}
            <div className="text-center mb-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6">
                <div className="text-8xl mb-4">{getSpriteState()}</div>
                <div className="text-lg font-semibold mb-2">Hunger Level</div>

                {/* Hunger Bar */}
                <div className="w-64 mx-auto bg-gray-200 rounded-full h-4 mb-2">
                    <div
                        className={`h-4 rounded-full transition-all duration-300 ${getHungerBarColor()}`}
                        style={{ width: `${petState.hunger}%` }}
                    />
                </div>

                <div className="text-sm text-gray-600 mb-4">
                    {petState.hunger.toFixed(0)}% full
                </div>

                {/* Time until next feed */}
                <div className="text-sm text-gray-500">
                    Next feed: {petState.formatTimeUntilNextFeed()}
                </div>
            </div>

            {/* Status message */}
            {!orderMeta && (
                <div className="text-center">
                    <p className="text-gray-500 mb-4">No active DCA feed found</p>
                    <p className="text-sm text-gray-400">
                        Create a feed to start feeding your pet automatically!
                    </p>
                </div>
            )}
        </div>
    );
}