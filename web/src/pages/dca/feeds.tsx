// src/pages/dca/feeds.tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { useAccount, useWalletClient } from 'wagmi'
import { formatDate, formatIntervalFull } from '@/lib/format'
import { formatAddress } from '@/lib/utils'
import { CONTRACT_ADDRESSES } from '@/config/base'
import LIMIT_ORDER_ABI from '@/abis/LimitOrderProtocol.json'
import { usePetState } from '@/hooks/usePetState'
import { useUserFeeds, useDeleteFeed } from '@/hooks/useSupabase'
import ConnectButton from '@/components/ConnectButton'

interface OrderMeta {
    id: string
    orderHash: string
    srcToken: string
    dstToken: string
    chunkSize: number
    period: number
    createdAt: number
    nextFillTime: number
    endDate?: string
    stopCondition?: 'end-date' | 'total-amount'
    totalAmount?: number
    type?: 'swap' | 'recurring' // Add type to distinguish between feed types
    // Additional swap-specific fields
    fromAmount?: string
    toAmount?: string
    fromTokenSymbol?: string
    toTokenSymbol?: string
    status?: 'completed' | 'pending' | 'failed' | 'active' | 'cancelled'
}

type FilterType = 'all' | 'swaps' | 'recurring'

function FilterTabs({ activeFilter, onFilterChange }: { activeFilter: FilterType; onFilterChange: (filter: FilterType) => void }) {
    return (
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
            <button
                onClick={() => onFilterChange('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeFilter === 'all'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
            >
                All Feeds
            </button>
            <button
                onClick={() => onFilterChange('swaps')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeFilter === 'swaps'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
            >
                Swaps
            </button>
            <button
                onClick={() => onFilterChange('recurring')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeFilter === 'recurring'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                    }`}
            >
                Recurring Feeds
            </button>
        </div>
    )
}

function FeedCard({
    feed,
    onCancel,
    onFill,
    isCancelling,
    isFilling,
    onCopyHash
}: {
    feed: OrderMeta
    onCancel: (feed: OrderMeta) => void
    onFill: (feed: OrderMeta) => void
    isCancelling: boolean
    isFilling: boolean
    onCopyHash: (hash: string) => void
}) {
    const now = Date.now()
    const timeUntil = feed.nextFillTime - now
    const canFill = timeUntil <= 0
    const isRecurring = feed.type === 'recurring' || feed.period > 0

    return (
        <Card className="bg-white border-green-200 shadow-sm hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-3">
                    <CardTitle className="text-lg text-emerald-700">
                        {isRecurring ? '🔄 Recurring Feed' : '💱 Swap'}
                    </CardTitle>
                    {isRecurring && (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                            {formatIntervalFull(feed.period)}
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-gray-500">
                    Created {formatDate(feed.createdAt)}
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">From</h4>
                        <p className="font-mono text-sm bg-emerald-50 px-2 py-1 rounded text-emerald-700 truncate">
                            {feed.fromTokenSymbol || formatAddress(feed.srcToken)}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">To</h4>
                        <p className="font-mono text-sm bg-emerald-50 px-2 py-1 rounded text-emerald-700 truncate">
                            {feed.toTokenSymbol || formatAddress(feed.dstToken)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</h4>
                        <p className="text-lg font-semibold text-emerald-600">
                            {feed.fromAmount || feed.chunkSize} {feed.fromTokenSymbol}
                        </p>
                    </div>
                    {isRecurring ? (
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Next Fill</h4>
                            <p className="text-sm text-gray-700 mb-1">{formatDate(feed.nextFillTime)}</p>
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                                {formatIntervalFull(timeUntil)}
                            </Badge>
                        </div>
                    ) : (
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Received</h4>
                            <p className="text-lg font-semibold text-emerald-600">
                                {feed.toAmount || 'Calculating...'} {feed.toTokenSymbol}
                            </p>
                        </div>
                    )}
                </div>

                {!isRecurring && feed.toAmount && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</h4>
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                                {feed.status || 'Completed'}
                            </Badge>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Transaction</h4>
                            <p className="font-mono text-sm bg-emerald-50 px-2 py-1 rounded text-emerald-700 truncate flex items-center justify-between">
                                <span>{feed.orderHash.slice(0, 8)}...{feed.orderHash.slice(-6)}</span>
                                <button
                                    onClick={() => onCopyHash(feed.orderHash)}
                                    className="ml-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors rounded px-1"
                                    title="Copy transaction hash"
                                >
                                    📋
                                </button>
                            </p>
                        </div>
                    </div>
                )}

                {isRecurring && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Stop Condition</h4>
                            <p className="text-sm text-gray-700 capitalize">
                                {feed.stopCondition === 'total-amount' ? 'Total Amount' : 'End Date'}
                            </p>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</h4>
                            <Badge className={`text-xs ${feed.stopCondition === 'total-amount'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : new Date(feed.endDate || '').getTime() > Date.now()
                                    ? 'bg-green-100 text-green-700 border-green-200'
                                    : 'bg-red-100 text-red-700 border-red-200'
                                }`}>
                                {feed.stopCondition === 'total-amount'
                                    ? 'Amount-based'
                                    : new Date(feed.endDate || '').getTime() > Date.now()
                                        ? 'Active'
                                        : 'Ended'
                                }
                            </Badge>
                        </div>
                    </div>
                )}

                {feed.endDate && feed.stopCondition === 'end-date' && (
                    <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">End Date</h4>
                        <p className="text-sm text-gray-700">{formatDate(new Date(feed.endDate))}</p>
                    </div>
                )}

                <div className="w-full flex justify-end items-center">
                    <div className="flex gap-2">
                        {isRecurring && canFill && (
                            <Button
                                size="sm"
                                onClick={() => onFill(feed)}
                                disabled={isFilling}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                                {isFilling ? '⏳' : '🍽️'} Fill
                            </Button>
                        )}
                        {isRecurring && (
                            <Button
                                size="sm"
                                onClick={() => onCancel(feed)}
                                disabled={isCancelling}
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                                {isCancelling ? '⏳' : '❌'} Cancel
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default function MyFeeds() {
    const [feeds, setFeeds] = useState<OrderMeta[]>([])
    const [activeFilter, setActiveFilter] = useState<FilterType>('all')
    const navigate = useNavigate()
    const { toast } = useToast()
    const { address } = useAccount()
    const { data: walletClient } = useWalletClient()
    const [cancelling, setCancelling] = useState(false)
    const [filling, setFilling] = useState(false)
    const { feedDCAFill } = usePetState()

    // Supabase hooks
    const { data: feedsData, isLoading } = useUserFeeds(address || '')
    const { mutateAsync: deleteFeed } = useDeleteFeed()

    const handleCopyHash = (hash: string) => {
        navigator.clipboard.writeText(hash);
        toast({ title: "Copied!", description: "Transaction hash copied to clipboard." });
    };

    // Convert Supabase data to OrderMeta format
    useEffect(() => {
        if (feedsData?.data && address) {
            const convertedFeeds: OrderMeta[] = feedsData.data.map(feed => ({
                id: feed.id,
                orderHash: feed.transaction_hash || feed.order_hash || feed.id,
                srcToken: feed.src_token,
                dstToken: feed.dst_token,
                chunkSize: feed.chunk_size,
                period: feed.period,
                createdAt: new Date(feed.created_at).getTime(),
                nextFillTime: feed.next_fill_time ? new Date(feed.next_fill_time).getTime() : Date.now(),
                endDate: feed.end_date,
                stopCondition: feed.stop_condition,
                totalAmount: feed.total_amount,
                type: feed.feed_type,
                fromAmount: feed.from_amount,
                toAmount: feed.to_amount,
                fromTokenSymbol: feed.src_token_symbol,
                toTokenSymbol: feed.dst_token_symbol,
                status: feed.status
            }))
            setFeeds(convertedFeeds)
        } else {
            // Clear feeds when wallet disconnects
            setFeeds([])
        }
    }, [feedsData, address])

    // Filter feeds based on active filter
    const filteredFeeds = feeds.filter(feed => {
        const isRecurring = feed.type === 'recurring' || feed.period > 0
        const isSwap = feed.type === 'swap' || !feed.period

        switch (activeFilter) {
            case 'all':
                return true
            case 'swaps':
                return isSwap
            case 'recurring':
                return isRecurring
            default:
                return true
        }
    })

    async function handleCancelOnChain(feed: OrderMeta) {
        if (!walletClient || !address) {
            toast({ title: 'Wallet not connected', variant: 'destructive' })
            return
        }

        setCancelling(true)
        try {
            const contract = {
                address: CONTRACT_ADDRESSES.LIMIT_ORDER_PROTOCOL as `0x${string}`,
                abi: LIMIT_ORDER_ABI,
            }

            // Send the cancel transaction directly
            await walletClient.writeContract({
                address: contract.address,
                abi: contract.abi,
                functionName: 'cancelOrder',
                args: [feed.orderHash as `0x${string}`],
            })

            toast({ title: 'Feed cancelled' })
            // Remove from Supabase
            await deleteFeed(feed.id)
        } catch (e) {
            toast({ title: 'Cancel failed', variant: 'destructive', description: String(e) })
        } finally {
            setCancelling(false)
        }
    }

    async function handleFillOrder(feed: OrderMeta) {
        if (!walletClient || !address) {
            toast({ title: 'Wallet not connected', variant: 'destructive' })
            return
        }

        setFilling(true)
        try {
            // For now, we'll simulate filling the order and feed the pet
            // In a real implementation, this would trigger an actual order fill
            toast({ title: '🍽️ Filling DCA order...' })

            // Simulate order fill (replace with actual fill logic)
            await new Promise(resolve => setTimeout(resolve, 2000))

            // Feed the pet for the DCA order fill
            const tokenPair = `${feed.srcToken.slice(0, 6)}...${feed.srcToken.slice(-4)} → ${feed.dstToken.slice(0, 6)}...${feed.dstToken.slice(-4)}`;
            feedDCAFill(feed.orderHash, tokenPair);

            toast({ title: '✅ DCA order filled! Pet fed successfully!' })

            // Update the feed's next fill time
            const updatedFeeds = feeds.map(f =>
                f.orderHash === feed.orderHash
                    ? { ...f, nextFillTime: Date.now() + f.period * 1000 }
                    : f
            )
            setFeeds(updatedFeeds)
        } catch (e) {
            toast({ title: 'Fill failed', variant: 'destructive', description: String(e) })
        } finally {
            setFilling(false)
        }
    }

    if (!address) {
        return (
            <div className="w-full bg-[#effdf4] min-h-screen">
                <div className="max-w-6xl mx-auto p-8">
                    <div className="mb-8">
                        <h2 className="text-4xl font-bold text-emerald-700 mb-2">My Feeds</h2>
                        <p className="text-gray-600 text-lg">Manage your active DCA strategies</p>
                    </div>

                    <div className="text-center">
                        <div className="bg-white rounded-2xl p-12 border border-green-200 shadow-lg max-w-2xl mx-auto">
                            <h3 className="text-2xl font-bold mb-4 text-emerald-700">Connect Your Wallet</h3>
                            <p className="text-gray-600 mb-6">Connect your wallet to view your feeds</p>
                            <ConnectButton />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="w-full bg-[#effdf4] min-h-screen">
                <div className="max-w-6xl mx-auto p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading your feeds...</p>
                </div>
            </div>
        )
    }

    if (feeds.length === 0) {
        return (
            <div className="w-full bg-[#effdf4] min-h-screen">
                <div className="max-w-6xl mx-auto p-8 text-center">
                    <div className="bg-white rounded-2xl p-12 border border-green-200 shadow-lg max-w-2xl mx-auto">
                        <h2 className="text-4xl font-bold mb-4 text-emerald-700">My Feeds</h2>
                        <p className="text-gray-600 mb-6 text-lg">No active feeds yet. Start your first DCA strategy!</p>
                        <Button
                            onClick={() => navigate('/dca/setup')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 text-lg"
                        >
                            Create Your First Feed
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-6xl mx-auto p-8">
                <div className="mb-8">
                    <h2 className="text-4xl font-bold text-emerald-700 mb-2">My Feeds</h2>
                    <p className="text-gray-600 text-lg">Manage your active DCA strategies</p>
                    <div className="mt-4 flex items-center gap-4">
                        <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg">
                            <span className="font-semibold">{feeds.filter(feed => feed.type === 'recurring' || feed.period > 0).length}</span> {feeds.filter(feed => feed.type === 'recurring' || feed.period > 0).length === 1 ? 'active recurring feed' : 'active recurring feeds'}
                        </div>
                        <Link to="/regular-swap">
                            <Button variant="outline" className="border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                                💱 Quick Swap
                            </Button>
                        </Link>
                    </div>
                </div>
                <FilterTabs activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredFeeds.map(feed => (
                        <FeedCard
                            key={feed.orderHash}
                            feed={feed}
                            onCancel={handleCancelOnChain}
                            onFill={handleFillOrder}
                            isCancelling={cancelling}
                            isFilling={filling}
                            onCopyHash={handleCopyHash}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
