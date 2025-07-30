import { useLocation } from 'react-router-dom';
import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { useEffect, useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { useActiveOrder } from '../lib/useActiveOrder';

type TwapDcaExecutedArgs = {
    orderHash: string;
    chunkIn: bigint;
    minOut: bigint;
    nextFillTime: bigint;
};

// TODO: Replace with actual deployed address and ABI
const HOOK_ADDRESS = '0x0000000000000000000000000000000000000000';
const HOOK_ABI = [
    {
        type: 'function',
        name: 'nextFillTime',
        stateMutability: 'view',
        inputs: [{ name: 'orderHash', type: 'bytes32' }],
        outputs: [{ name: '', type: 'uint64' }],
    },
    {
        type: 'event',
        name: 'TwapDcaExecuted',
        inputs: [
            { name: 'orderHash', type: 'bytes32', indexed: true },
            { name: 'chunkIn', type: 'uint256', indexed: false },
            { name: 'minOut', type: 'uint256', indexed: false },
            { name: 'nextFillTime', type: 'uint64', indexed: false },
        ],
        anonymous: false,
    },
    {
        type: 'function',
        name: 'intervalSecs',
        stateMutability: 'view',
        inputs: [{ name: 'orderHash', type: 'bytes32' }],
        outputs: [{ name: '', type: 'uint64' }],
    },
    {
        type: 'function',
        name: 'cancelOrder',
        stateMutability: 'nonpayable',
        inputs: [{ name: 'orderHash', type: 'bytes32' }],
        outputs: [],
    },
];

export default function Dashboard() {
    const location = useLocation();
    const demo = new URLSearchParams(location.search).get('demo') === '1';
    const demoHash = '0xdemo0000000000000000000000000000000000000000000000000000000000000000';
    const storedOrderHash = useActiveOrder();
    const orderHash = demo ? demoHash : storedOrderHash;

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Main Content - Hippo Left, Content Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Side - Large Hippo Section */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-b from-green-50 to-white rounded-2xl p-12 h-full flex flex-col items-center justify-center">
                        <div className="w-80 h-80 mb-8">
                            <img
                                src="/src/assets/happy.PNG"
                                alt="Happy Hippo"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <h1 className="text-5xl font-bold text-green-600 mb-4">Hippo</h1>
                        <p className="text-xl text-gray-600 text-center">Your loyal DCA companion</p>
                    </div>
                </div>

                {/* Right Side - Dashboard Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Vitals Bar Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <VitalCard
                            icon="🍽️"
                            title="Hunger"
                            value={orderHash ? <Countdown orderHash={orderHash} /> : "Demo mode"}
                        />
                        <VitalCard
                            icon="⚕️"
                            title="Health"
                            value={orderHash ? <PetHappinessBar orderHash={orderHash} /> : "Demo mode"}
                        />
                        <VitalCard
                            icon="💰"
                            title="Growth"
                            value={orderHash ? "Level 1 - 25% vested" : "Demo mode"}
                        />
                    </div>

                    {/* Real-Time Chart + History */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <div className="bg-white border border-green-200 rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow">
                                <h2 className="text-2xl font-semibold text-green-600 mb-6">Feed History</h2>
                                <FeedHistoryChart orderHash={orderHash || demoHash} disabled={!orderHash} />
                            </div>
                        </div>
                        <div className="lg:col-span-1">
                            <div className="bg-white border border-green-200 rounded-xl p-8 shadow-sm hover:shadow-lg transition-shadow h-80 overflow-hidden">
                                <h2 className="text-2xl font-semibold text-green-600 mb-6">History (last 20 fills)</h2>
                                <div className="overflow-y-auto h-full">
                                    <HistoryList orderHash={orderHash || demoHash} disabled={!orderHash} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Actions */}
                    {orderHash && (
                        <div className="flex justify-start">
                            <CancelButton orderHash={orderHash} onCancel={() => sessionStorage.removeItem('orderHash')} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function VitalCard({ icon, title, value }: { icon: string; title: string; value: React.ReactNode }) {
    return (
        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{icon}</span>
                <h3 className="text-xl font-semibold text-green-600">{title}</h3>
            </div>
            <div className="text-lg text-gray-700">
                {value}
            </div>
        </div>
    );
}

function Countdown({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    const { data: nextFill, isLoading } = useReadContract({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        functionName: 'nextFillTime',
        args: [orderHash],
        query: { enabled: !!orderHash && !disabled },
    });
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!nextFill || disabled) return;
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            setSecondsLeft(Number(nextFill) - now);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [nextFill, disabled]);

    if (disabled) {
        return <span className="text-gray-500">Demo mode</span>;
    }

    if (isLoading) return <span className="text-gray-500">Loading...</span>;
    if (secondsLeft === null) return <span className="text-gray-500">No fill time available</span>;

    const isLate = secondsLeft < 0;
    const hours = Math.floor(Math.abs(secondsLeft) / 3600);
    const minutes = Math.floor((Math.abs(secondsLeft) % 3600) / 60);
    const seconds = Math.abs(secondsLeft) % 60;

    return (
        <span className={`font-mono ${isLate ? 'text-red-400' : 'text-emerald-600'}`}>
            {isLate ? 'Overdue!' : `Next snack in ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
        </span>
    );
}

function PetHappinessBar({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    const { data: intervalSecs } = useReadContract({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        functionName: 'intervalSecs',
        args: [orderHash],
        query: { enabled: !!orderHash && !disabled },
    });
    const { data: nextFill } = useReadContract({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        functionName: 'nextFillTime',
        args: [orderHash],
        query: { enabled: !!orderHash && !disabled },
    });
    const [percentage, setPercentage] = useState(100);
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        if (!nextFill || !intervalSecs || disabled) return;
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            const left = Number(nextFill) - now;
            const pct = Math.max(0, Math.min(100, (left / Number(intervalSecs)) * 100));
            setPercentage(pct);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [nextFill, intervalSecs, disabled]);

    useWatchContractEvent({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        eventName: 'TwapDcaExecuted',
        onLogs(logs) {
            if (disabled) return;
            for (const log of logs) {
                const l = log as unknown as { args: TwapDcaExecutedArgs; transactionHash: string };
                if (l.args && l.args.orderHash === orderHash) {
                    setPercentage(100);
                    setPulse(true);
                    setTimeout(() => setPulse(false), 400);
                }
            }
        },
    });

    if (disabled) {
        return <span className="text-gray-500">Demo mode</span>;
    }

    return (
        <div className="space-y-2">
            <div className="h-2 rounded bg-gray-200 overflow-hidden relative transition-all duration-500"
                style={{ boxShadow: pulse ? '0 0 8px 2px #34d399' : undefined }}>
                <div
                    className="h-full bg-emerald-400 transition-all duration-1000"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <span className="text-xs text-gray-600">HF {percentage.toFixed(1)}% – Doctor Armed</span>
        </div>
    );
}

function FeedHistoryChart({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    const [history, setHistory] = useState<{ idx: number; amountIn: bigint; amountOut: bigint; nextFillTime: bigint; txHash: string }[]>([]);

    useWatchContractEvent({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        eventName: 'TwapDcaExecuted',
        onLogs(logs) {
            if (disabled) return;
            for (const log of logs) {
                const l = log as unknown as { args: TwapDcaExecutedArgs; transactionHash: string };
                if (l.args && l.args.orderHash === orderHash) {
                    setHistory(prev => [
                        {
                            idx: prev.length + 1,
                            amountIn: l.args.chunkIn,
                            amountOut: l.args.minOut,
                            nextFillTime: l.args.nextFillTime,
                            txHash: l.transactionHash,
                        },
                        ...prev.slice(0, 19),
                    ]);
                }
            }
        },
    });

    // Demo data for disabled state
    const demoData = [
        { idx: 1, amountIn: parseEther('0.1'), amountOut: parseEther('0.095'), timestamp: Date.now() - 86400000 },
        { idx: 2, amountIn: parseEther('0.1'), amountOut: parseEther('0.092'), timestamp: Date.now() - 43200000 },
        { idx: 3, amountIn: parseEther('0.1'), amountOut: parseEther('0.089'), timestamp: Date.now() - 21600000 },
    ];

    const chartData = disabled ? demoData : history.map(h => ({
        idx: h.idx,
        amountIn: h.amountIn,
        amountOut: h.amountOut,
        timestamp: Number(h.nextFillTime) * 1000
    }));

    if (chartData.length === 0) {
        return (
            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500 text-lg">
                No feed history yet
            </div>
        );
    }

    // Chart dimensions
    const width = 600;
    const height = 300;
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    // Calculate scales
    const maxAmount = Math.max(...chartData.map(d => Number(formatEther(d.amountOut))));
    const minAmount = Math.min(...chartData.map(d => Number(formatEther(d.amountOut))));
    const amountRange = maxAmount - minAmount;

    const timeRange = Math.max(...chartData.map(d => d.timestamp)) - Math.min(...chartData.map(d => d.timestamp));
    const now = Date.now();
    const startTime = timeRange > 0 ? Math.min(...chartData.map(d => d.timestamp)) : now - 86400000;

    // Generate points for the line
    const points = chartData.map((d, i) => {
        const x = padding + (d.timestamp - startTime) / timeRange * chartWidth;
        const y = height - padding - (Number(formatEther(d.amountOut)) - minAmount) / amountRange * chartHeight;
        return `${x},${y}`;
    }).join(' ');

    // Generate bars
    const barWidth = chartWidth / chartData.length * 0.8;

    return (
        <div className="h-80">
            <svg width={width} height={height} className="w-full h-full">
                {/* Background grid */}
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />

                {/* Chart area */}
                <rect
                    x={padding}
                    y={padding}
                    width={chartWidth}
                    height={chartHeight}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                />

                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((tick, _i) => {
                    const value = minAmount + tick * amountRange;
                    const y = height - padding - tick * chartHeight;
                    return (
                        <g key={_i}>
                            <line
                                x1={padding - 5}
                                y1={y}
                                x2={padding}
                                y2={y}
                                stroke="#9ca3af"
                                strokeWidth="1"
                            />
                            <text
                                x={padding - 10}
                                y={y + 4}
                                textAnchor="end"
                                fontSize="12"
                                fill="#6b7280"
                            >
                                {value.toFixed(4)}
                            </text>
                        </g>
                    );
                })}

                {/* X-axis labels */}
                {chartData.map((d, i) => {
                    const x = padding + (d.timestamp - startTime) / timeRange * chartWidth;
                    const time = new Date(d.timestamp);
                    return (
                        <g key={i}>
                            <line
                                x1={x}
                                y1={height - padding}
                                x2={x}
                                y2={height - padding + 5}
                                stroke="#9ca3af"
                                strokeWidth="1"
                            />
                            <text
                                x={x}
                                y={height - padding + 20}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#6b7280"
                                transform={`rotate(-45 ${x} ${height - padding + 20})`}
                            >
                                {time.toLocaleTimeString()}
                            </text>
                        </g>
                    );
                })}

                {/* Line chart */}
                <polyline
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="3"
                    points={points}
                />

                {/* Data points */}
                {chartData.map((d, i) => {
                    const x = padding + (d.timestamp - startTime) / timeRange * chartWidth;
                    const y = height - padding - (Number(formatEther(d.amountOut)) - minAmount) / amountRange * chartHeight;
                    return (
                        <circle
                            key={i}
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#34d399"
                            stroke="white"
                            strokeWidth="2"
                        />
                    );
                })}

                {/* Bar chart overlay */}
                {chartData.map((d, i) => {
                    const x = padding + (d.timestamp - startTime) / timeRange * chartWidth - barWidth / 2;
                    const barHeight = (Number(formatEther(d.amountOut)) - minAmount) / amountRange * chartHeight;
                    const y = height - padding - barHeight;
                    return (
                        <rect
                            key={i}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill="#34d399"
                            fillOpacity="0.2"
                            stroke="#34d399"
                            strokeWidth="1"
                        />
                    );
                })}
            </svg>
        </div>
    );
}

function HistoryList({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    const [history, setHistory] = useState<{ idx: number; amountIn: bigint; amountOut: bigint; nextFillTime: bigint; txHash: string }[]>([]);
    useWatchContractEvent({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        eventName: 'TwapDcaExecuted',
        onLogs(logs) {
            if (disabled) return;
            for (const log of logs) {
                const l = log as unknown as { args: TwapDcaExecutedArgs; transactionHash: string };
                if (l.args && l.args.orderHash === orderHash) {
                    setHistory(prev => [
                        {
                            idx: prev.length + 1,
                            amountIn: l.args.chunkIn,
                            amountOut: l.args.minOut,
                            nextFillTime: l.args.nextFillTime,
                            txHash: l.transactionHash,
                        },
                        ...prev.slice(0, 19),
                    ]);
                }
            }
        },
    });

    if (disabled) {
        return (
            <div className="space-y-2">
                <div className="text-gray-500 text-sm">Demo mode - Start a DCA to see real transaction history</div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-mono">#1</span>
                    <span>In: 0.1 ETH Out: 0.095 USDC</span>
                    <span className="text-emerald-500">demo</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="font-mono">#2</span>
                    <span>In: 0.1 ETH Out: 0.092 USDC</span>
                    <span className="text-emerald-500">demo</span>
                </div>
            </div>
        );
    }

    if (history.length === 0) {
        return <div className="text-gray-500 text-sm">No fills yet.</div>;
    }

    return (
        <div className="space-y-2">
            {history.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-green-600">#{h.idx}</span>
                    <span className="text-gray-700">In: {formatEther(h.amountIn)} Out: {formatEther(h.amountOut)}</span>
                    <a href={`https://etherscan.io/tx/${h.txHash}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline">tx</a>
                </div>
            ))}
        </div>
    );
}

function CancelButton({ orderHash, onCancel, disabled }: { orderHash: string; onCancel: () => void; disabled?: boolean }) {
    const { writeContractAsync, isPending } = useWriteContract();
    const [done, setDone] = useState(false);
    const handleCancel = async () => {
        try {
            await writeContractAsync({
                address: HOOK_ADDRESS,
                abi: HOOK_ABI,
                functionName: 'cancelOrder',
                args: [orderHash],
            });
            setDone(true);
            onCancel();
        } catch {
            // Optionally show error
        }
    };
    return (
        <Button
            onClick={handleCancel}
            disabled={disabled || isPending || done}
            className="bg-red-200 hover:bg-red-300 text-red-700 border-red-300 shadow-sm hover:shadow-md transition-all"
        >
            {done ? 'Order Cancelled' : isPending ? 'Cancelling…' : 'Cancel Order'}
        </Button>
    );
} 