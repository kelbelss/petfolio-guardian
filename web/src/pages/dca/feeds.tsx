// src/pages/dca/feeds.tsx
import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { useAccount, useWalletClient } from 'wagmi'
import { formatDate } from '@/lib/format'
import { formatAddress } from '@/lib/utils'
import { CONTRACT_ADDRESSES } from '@/config/base'
import LIMIT_ORDER_ABI from '@/abis/LimitOrderProtocol.json'

interface OrderMeta {
    orderHash: string
    srcToken: string
    dstToken: string
    chunkSize: number
    period: number
    createdAt: number
    nextFillTime: number
    endDate?: string
}

function formatIntervalFull(seconds: number): string {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    return `${Math.floor(seconds / 86400)}d`
}

function FeedCard({
    feed,
    onCancel,
    isCancelling
}: {
    feed: OrderMeta
    onCancel: (feed: OrderMeta) => void
    isCancelling: boolean
}) {
    const now = Date.now()
    const timeUntil = feed.nextFillTime - now

    return (
        <Card className="bg-white border-green-200 shadow-sm hover:shadow-lg transition-all duration-200">
            <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-3">
                    <CardTitle className="text-lg text-emerald-700">
                        🍽️ DCA Feed
                    </CardTitle>
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                        {formatIntervalFull(feed.period)}
                    </Badge>
                </div>
                <p className="text-sm text-gray-500">
                    Created {formatDate(feed.createdAt)}
                </p>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">From</h4>
                        <p className="font-mono text-sm bg-gray-50 px-2 py-1 rounded text-gray-700 truncate">
                            {formatAddress(feed.srcToken)}
                        </p>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">To</h4>
                        <p className="font-mono text-sm bg-gray-50 px-2 py-1 rounded text-gray-700 truncate">
                            {formatAddress(feed.dstToken)}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Amount</h4>
                        <p className="text-lg font-semibold text-emerald-600">{feed.chunkSize}</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Next Fill</h4>
                        <p className="text-sm text-gray-700 mb-1">{formatDate(feed.nextFillTime)}</p>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                            {formatIntervalFull(timeUntil)}
                        </Badge>
                    </div>
                </div>

                {feed.endDate && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">End Date</h4>
                            <p className="text-sm text-gray-700">{formatDate(new Date(feed.endDate).getTime())}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</h4>
                            <Badge className={`text-xs ${new Date(feed.endDate).getTime() > Date.now()
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-red-100 text-red-700 border-red-200'
                                }`}>
                                {new Date(feed.endDate).getTime() > Date.now() ? 'Active' : 'Ended'}
                            </Badge>
                        </div>
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-4 border-t border-gray-100">
                <div className="w-full flex justify-between items-center">
                    <p className="text-xs text-gray-400 font-mono">
                        {formatAddress(feed.orderHash)}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCancel(feed)}
                        disabled={isCancelling}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                        {isCancelling ? '⏳' : '❌'} Cancel
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}

export default function MyFeeds() {
    const [feeds, setFeeds] = useState<OrderMeta[]>([])
    const navigate = useNavigate()
    const { toast } = useToast()
    const { address } = useAccount()
    const { data: walletClient } = useWalletClient()
    const [cancelling, setCancelling] = useState(false)

    // load from localStorage once
    useEffect(() => {
        const raw = localStorage.getItem('orderMeta')
        if (!raw) return

        try {
            const parsed = JSON.parse(raw)
            // allow either a single object or an array
            const list = Array.isArray(parsed) ? parsed : [parsed]
            // Ensure all feeds have the endDate field for backward compatibility
            const normalizedList = list.map(feed => ({
                ...feed,
                endDate: feed.endDate || undefined
            }))
            setFeeds(normalizedList)
        } catch {
            console.error('Failed to parse orderMeta from localStorage')
        }
    }, [])

    function removeFeed(hash: string) {
        const raw = localStorage.getItem('orderMeta')
        if (!raw) return
        const parsed = JSON.parse(raw)
        const list: OrderMeta[] = Array.isArray(parsed) ? parsed : [parsed]
        const filtered = list.filter(f => f.orderHash !== hash)
        if (filtered.length) {
            localStorage.setItem('orderMeta', JSON.stringify(filtered))
        } else {
            localStorage.removeItem('orderMeta')
        }
        setFeeds(filtered)
    }

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
            // also remove from localStorage / state
            removeFeed(feed.orderHash)
        } catch (e) {
            toast({ title: 'Cancel failed', variant: 'destructive', description: String(e) })
        } finally {
            setCancelling(false)
        }
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
                            <span className="font-semibold">{feeds.length}</span> active feeds
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {feeds.map(feed => (
                        <FeedCard
                            key={feed.orderHash}
                            feed={feed}
                            onCancel={handleCancelOnChain}
                            isCancelling={cancelling}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
