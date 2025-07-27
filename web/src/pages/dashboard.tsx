import { useNavigate, useLocation } from 'react-router-dom';
import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { useEffect, useState } from 'react';
import { formatEther } from 'viem';
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
    const navigate = useNavigate();
    const location = useLocation();
    const demo = new URLSearchParams(location.search).get('demo') === '1';
    const demoHash = '0xdemo0000000000000000000000000000000000000000000000000000000000000000';
    const storedOrderHash = useActiveOrder();
    const orderHash = demo ? demoHash : storedOrderHash;

    return (
        <div className="mx-auto max-w-3xl p-6 space-y-6">
            {orderHash ? <>
                <Countdown orderHash={orderHash} />
                <PetHappinessBar orderHash={orderHash} />
                <HistoryList orderHash={orderHash} />
                <CancelButton orderHash={orderHash} onCancel={() => sessionStorage.removeItem('orderHash')} />
            </> : null}
            <div className="text-center">
                <Button onClick={() => navigate('/setup/feed')}>
                    Start new DCA
                </Button>
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
        query: { enabled: !!orderHash },
    });
    const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!nextFill) return;
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            setSecondsLeft(Number(nextFill) - now);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [nextFill]);

    if (isLoading) return <div className="mb-4">Loading next fill…</div>;
    if (secondsLeft === null) return <div className="mb-4">No fill time available.</div>;

    const isLate = secondsLeft < 0;
    return (
        <div className={`mb-4 text-lg font-mono ${isLate ? 'text-red-500 animate-pulse' : ''} ${disabled ? 'opacity-50' : ''}`}>
            Next fill in: {isLate ? `Overdue! (${Math.abs(secondsLeft)}s ago)` : `${secondsLeft}s`}
        </div>
    );
}

function PetHappinessBar({ orderHash, disabled }: { orderHash: string; disabled?: boolean }) {
    // Get intervalSecs for this order
    const { data: intervalSecs } = useReadContract({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        functionName: 'intervalSecs',
        args: [orderHash],
        query: { enabled: !!orderHash },
    });
    // Get nextFillTime for this order
    const { data: nextFill } = useReadContract({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        functionName: 'nextFillTime',
        args: [orderHash],
        query: { enabled: !!orderHash },
    });
    // secondsLeft is not used in the bar, only for percentage
    const [percentage, setPercentage] = useState(100);
    const [pulse, setPulse] = useState(false);

    useEffect(() => {
        if (!nextFill || !intervalSecs) return;
        const update = () => {
            const now = Math.floor(Date.now() / 1000);
            const left = Number(nextFill) - now;
            const pct = Math.max(0, Math.min(100, (left / Number(intervalSecs)) * 100));
            setPercentage(pct);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [nextFill, intervalSecs]);

    // Pulse on fill event
    useWatchContractEvent({
        address: HOOK_ADDRESS,
        abi: HOOK_ABI,
        eventName: 'TwapDcaExecuted',
        onLogs(logs) {
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

    return (
        <div className="mb-4">
            <div className="mb-1 text-sm text-gray-400">Pet Happiness</div>
            <div className={`h-4 rounded bg-gray-800 overflow-hidden relative transition-all duration-500 ${disabled ? 'opacity-50' : ''}`}
                style={{ boxShadow: pulse ? '0 0 8px 2px #34d399' : undefined }}>
                <div
                    className="h-full bg-emerald-400 transition-all duration-1000"
                    style={{ width: `${percentage}%` }}
                />
            </div>
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
    return (
        <div className={`mb-4 ${disabled ? 'opacity-50' : ''}`}>
            <div className="mb-1 text-sm text-gray-400">History (last 20 fills)</div>
            <div className="space-y-1">
                {history.length === 0 && <div className="text-gray-500">No fills yet.</div>}
                {history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="font-mono">#{h.idx}</span>
                        <span>In: {formatEther(h.amountIn)} Out: {formatEther(h.amountOut)}</span>
                        <a href={`https://etherscan.io/tx/${h.txHash}`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 underline">tx</a>
                    </div>
                ))}
            </div>
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
        <div className="mb-4">
            <button
                className={`px-4 py-2 rounded bg-red-500 text-white font-bold disabled:opacity-50 ${disabled || done ? 'cursor-not-allowed' : ''}`}
                onClick={handleCancel}
                disabled={disabled || isPending || done}
            >
                {done ? 'Order Cancelled' : isPending ? 'Cancelling…' : 'Cancel Order'}
            </button>
        </div>
    );
} 