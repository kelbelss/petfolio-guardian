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
        <Card className="mb-4">
            <CardHeader className="flex justify-between items-center pb-0">
                <div>
                    <CardTitle className="text-lg">
                        Feed • <span className="font-mono">{formatAddress(feed.orderHash)}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-500">
                        Created {formatDate(feed.createdAt)}
                    </p>
                </div>
                <Badge variant="outline">{formatIntervalFull(feed.period)} interval</Badge>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                    <h4 className="font-semibold">From</h4>
                    <p className="font-mono">{formatAddress(feed.srcToken)}</p>
                </div>
                <div>
                    <h4 className="font-semibold">To</h4>
                    <p className="font-mono">{formatAddress(feed.dstToken)}</p>
                </div>
                <div>
                    <h4 className="font-semibold">Amount</h4>
                    <p>{feed.chunkSize}</p>
                </div>
                <div>
                    <h4 className="font-semibold">Next fill</h4>
                    <p>{formatDate(feed.nextFillTime)}</p>
                    <Badge className="mt-1">{formatIntervalFull(timeUntil)}</Badge>
                </div>
            </CardContent>

            <CardFooter className="flex justify-end">
                <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onCancel(feed)}
                    disabled={isCancelling}
                >
                    {isCancelling ? 'Cancelling…' : 'Cancel Feed'}
                </Button>
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
            setFeeds(list)
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
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h2 className="text-3xl font-bold mb-6">My Feeds</h2>
                <p className="text-gray-500 mb-4">No active feeds. Create one above!</p>
                <Button onClick={() => navigate('/dca/setup')}>Create Your First Feed</Button>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-6">My Feeds</h2>
            {feeds.map(feed => (
                <FeedCard
                    key={feed.orderHash}
                    feed={feed}
                    onCancel={handleCancelOnChain}
                    isCancelling={cancelling}
                />
            ))}
        </div>
    )
}
