import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStoredDcaOrders, cancelAndRemoveDcaOrder, formatTimeUntilNextFill } from '@/lib/dcaCancel';
import { DcaGuideModal } from '@/components/ui/dca-guide-modal';
import type { DcaOrder } from '@/lib/dcaCancel';
import { useTokens } from '@/lib/hooks/useTokens';
import { FALLBACK_TOKENS } from '@/lib/constants';
import type { TokenMeta } from '@/lib/oneInchTokenApi';
import { useTransactionHistory } from '@/lib/hooks/useHistory';

type FilterType = 'active' | 'cancelled' | 'completed' | 'all' | 'history';

export default function MyFeeds() {
    const [feeds, setFeeds] = useState<DcaOrder[]>([]);
    const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<FilterType>('all');
    const navigate = useNavigate();

    // Get token data for display
    const { data: apiTokens } = useTokens();
    const allTokens = [...(apiTokens && apiTokens.length > 0 ? (apiTokens as TokenMeta[]) : FALLBACK_TOKENS)];

    useEffect(() => {
        loadFeeds();
    }, []);

    const loadFeeds = () => {
        const storedFeeds = getStoredDcaOrders();
        setFeeds(storedFeeds);
    };

    const handleCancelFeed = async (orderHash: string) => {
        setCancellingOrder(orderHash);
        setError(null);
        setSuccessMessage(null);

        try {
            // Cancel and remove the order
            await cancelAndRemoveDcaOrder(orderHash as `0x${string}`);
            loadFeeds(); // Refresh the list

            // Show success message
            setSuccessMessage('Feed cancelled successfully. You\'ll no longer be charged gas for fills after this transaction settles.');

            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err) {
            setError((err as Error)?.message || 'Error cancelling feed');
        } finally {
            setCancellingOrder(null);
        }
    };

    const getTokenSymbol = (address: string): string => {
        const token = allTokens.find(t => t.address === address);
        return token?.symbol || 'Unknown';
    };

    const formatInterval = (seconds: number): string => {
        if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
        if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
        return `${Math.round(seconds / 86400)} days`;
    };

    // Filter feeds based on active filter
    const filteredFeeds = feeds.filter(feed => {
        if (activeFilter === 'all') return true;
        return feed.status === activeFilter;
    });

    const activeFeeds = feeds.filter(feed => feed.status === 'active');
    const cancelledFeeds = feeds.filter(feed => feed.status === 'cancelled');
    const completedFeeds = feeds.filter(feed => feed.status === 'completed');

    return (
        <div className="max-w-6xl mx-auto p-6">
            <header className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-bold text-green-600">My Feeds</h2>
                    <div className="flex gap-2">
                        <DcaGuideModal
                            trigger={
                                <Button variant="outline" className="text-green-600 border-green-300 hover:bg-green-50">
                                    📖 How to DCA
                                </Button>
                            }
                        />
                        <Button
                            onClick={() => navigate('/setup/feed')}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            + New Feed
                        </Button>
                    </div>
                </div>
                <p className="text-gray-600">Manage your DCA orders, view transaction history, and track all your trading activity.</p>
                <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded mt-2">
                    📝 <strong>Note:</strong> Transaction history currently shows demo data. Real transaction tracking will be available when 1inch releases their History API.
                </div>
            </header>

            {/* Filter Tabs */}
            <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    <Button
                        variant={activeFilter === 'all' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter('all')}
                        className="flex-1"
                    >
                        All ({feeds.length})
                    </Button>
                    <Button
                        variant={activeFilter === 'active' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter('active')}
                        className="flex-1"
                    >
                        Active ({activeFeeds.length})
                    </Button>
                    <Button
                        variant={activeFilter === 'cancelled' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter('cancelled')}
                        className="flex-1"
                    >
                        Cancelled ({cancelledFeeds.length})
                    </Button>
                    <Button
                        variant={activeFilter === 'completed' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter('completed')}
                        className="flex-1"
                    >
                        Completed ({completedFeeds.length})
                    </Button>
                    <Button
                        variant={activeFilter === 'history' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveFilter('history')}
                        className="flex-1"
                    >
                        History
                    </Button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="text-sm font-medium text-red-800 mb-2">⚠️ Error</div>
                    <div className="text-sm text-red-700">{error}</div>
                </div>
            )}

            {/* Success Display */}
            {successMessage && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-medium text-green-800 mb-2">✅ Success</div>
                    <div className="text-sm text-green-700">{successMessage}</div>
                </div>
            )}

            {/* Feeds List */}
            <div className="mb-8">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                    {activeFilter === 'all' ? 'All Feeds' :
                        activeFilter === 'active' ? 'Active Feeds' :
                            activeFilter === 'cancelled' ? 'Cancelled Feeds' :
                                activeFilter === 'completed' ? 'Completed Feeds' :
                                    'Transaction History'}
                    {activeFilter !== 'history' && `(${filteredFeeds.length})`}
                </h3>

                {activeFilter === 'history' ? (
                    <TransactionHistorySection />
                ) : filteredFeeds.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <p className="text-gray-500 mb-4">
                                {activeFilter === 'all' ? 'No feeds found.' :
                                    activeFilter === 'active' ? 'No active feeds found.' :
                                        activeFilter === 'cancelled' ? 'No cancelled feeds found.' : 'No completed feeds found.'}
                            </p>
                            {activeFilter === 'all' || activeFilter === 'active' ? (
                                <Button
                                    onClick={() => navigate('/setup/feed')}
                                    className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                    Create Your First Feed
                                </Button>
                            ) : null}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredFeeds.map((feed) => (
                            <Card key={feed.orderHash} className={feed.status === 'cancelled' ? 'opacity-60' : ''}>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="text-lg font-semibold">
                                                    {getTokenSymbol(feed.srcToken)} → {getTokenSymbol(feed.dstToken)}
                                                </div>
                                                <div className={`px-2 py-1 text-xs rounded-full ${feed.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    feed.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {feed.status.charAt(0).toUpperCase() + feed.status.slice(1)}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                                <div>
                                                    <span className="font-medium">Amount per fill:</span>
                                                    <div>{feed.chunkIn} {getTokenSymbol(feed.srcToken)}</div>
                                                </div>
                                                <div>
                                                    <span className="font-medium">Interval:</span>
                                                    <div>{formatInterval(feed.interval)}</div>
                                                </div>
                                                {feed.status === 'active' && (
                                                    <div>
                                                        <span className="font-medium">Next fill:</span>
                                                        <div>{formatTimeUntilNextFill(feed.nextFillTime || 0)}</div>
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="font-medium">Order Hash:</span>
                                                    <div className="font-mono text-xs truncate">
                                                        {feed.orderHash.slice(0, 8)}...{feed.orderHash.slice(-6)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {feed.status === 'active' && (
                                            <Button
                                                onClick={() => handleCancelFeed(feed.orderHash)}
                                                disabled={cancellingOrder === feed.orderHash || cancellingOrder !== null}
                                                variant="outline"
                                                className={`${cancellingOrder === feed.orderHash
                                                    ? 'text-gray-400 border-gray-200 cursor-not-allowed'
                                                    : 'text-red-600 border-red-200 hover:bg-red-50'
                                                    }`}
                                            >
                                                {cancellingOrder === feed.orderHash ? 'Cancelling...' : '⏹ Cancel'}
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>


        </div>
    );
}

// Transaction History Component
function TransactionHistorySection() {
    const { data: historyData, isLoading, error } = useTransactionHistory(1, 50, 1);
    const transactions = historyData?.transactions || [];

    const getTransactionIcon = (type: string) => {
        switch (type) {
            case 'swap': return '🔄';
            case 'dca-fill': return '🍽️';
            case 'dca-cancel': return '⏹️';
            case 'dca-create': return '📊';
            default: return '📝';
        }
    };

    const getTransactionColor = (type: string) => {
        switch (type) {
            case 'swap': return 'text-blue-600';
            case 'dca-fill': return 'text-green-600';
            case 'dca-cancel': return 'text-red-600';
            case 'dca-create': return 'text-purple-600';
            default: return 'text-gray-600';
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-gray-500">Loading transaction history...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <p className="text-red-500 mb-2">Error loading transaction history</p>
                    <p className="text-sm text-gray-500">Please try again later</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {transactions.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <p className="text-gray-500 mb-4">No transactions found.</p>
                        <p className="text-sm text-gray-400">Your trading activity will appear here.</p>
                    </CardContent>
                </Card>
            ) : (
                transactions.map((tx) => (
                    <Card key={tx.id} className="border-l-4 border-l-green-500">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl">{getTransactionIcon(tx.type)}</div>
                                    <div>
                                        <div className={`font-semibold ${getTransactionColor(tx.type)}`}>
                                            {tx.type === 'swap' ? 'Swap' :
                                                tx.type === 'dca-fill' ? 'DCA Fill' :
                                                    tx.type === 'dca-cancel' ? 'DCA Cancel' :
                                                        'DCA Create'}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {tx.srcToken} → {tx.dstToken}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(tx.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-gray-900">
                                        {tx.amount}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {tx.txHash}
                                    </div>
                                    <Badge
                                        variant={tx.status === 'completed' ? 'default' :
                                            tx.status === 'pending' ? 'secondary' : 'destructive'}
                                        className="text-xs mt-1"
                                    >
                                        {tx.status}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))
            )}
        </div>
    );
} 