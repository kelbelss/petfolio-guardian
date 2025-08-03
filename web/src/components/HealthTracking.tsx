import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';
import { useHealthRecord } from '@/hooks/useSupabase';
import { formatDate } from '@/lib/format';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Use the HealthEvent interface from supabase.ts instead of defining our own

export default function HealthTracking() {
    const { address } = useAccount();
    const { data: healthRecordData } = useHealthRecord(address || '');
    const [showDetails, setShowDetails] = useState(false);

    // Update health when component mounts or feeds change
    // TEMPORARILY DISABLED FOR DEMO - MANUAL HEALTH SETTING
    // React.useEffect(() => {
    //     if (address) {
    //         calculateAndUpdateHealth(address);
    //     }
    // }, [address, feedsData, calculateAndUpdateHealth]);

    // Use health data from Supabase
    const healthData = useMemo(() => {
        if (!healthRecordData?.data) {
            return {
                health: 8.0,
                healthHistory: []
            };
        }

        const healthRecord = healthRecordData.data;
        return {
            health: healthRecord.current_health,
            healthHistory: healthRecord.health_history || []
        };
    }, [healthRecordData]);

    // Get recent health events (last 30 days, show first 5)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentEvents = healthData.healthHistory.filter(event => new Date(event.timestamp).getTime() > thirtyDaysAgo);
    const displayEvents = recentEvents.slice(0, 5);

    const formatHealthChange = (change: number | undefined): string => {
        if (change === undefined || change === null) return '+0';
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change % 1 === 0 ? change.toFixed(0) : change.toFixed(1)}`;
    };

    const getHealthColor = (health: number): string => {
        if (health <= 3) return 'text-red-500';
        if (health <= 6) return 'text-yellow-500';
        return 'text-green-500';
    };

    const getHealthStatus = (health: number): string => {
        if (health <= 3) return 'Hungry';
        if (health <= 6) return 'Neutral';
        return 'Happy';
    };

    return (
        <Card className="bg-white border-green-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-green-700">
                    <div className="flex items-center gap-3">📊 Health Tracking</div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Current Health</div>
                        <div className={`text-2xl font-bold ${getHealthColor(healthData.health)}`}>
                            {healthData.health % 1 === 0 ? healthData.health.toFixed(0) : healthData.health.toFixed(1)}/10
                        </div>
                        <div className="text-xs text-gray-500">{getHealthStatus(healthData.health)}</div>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Health Chart */}
                <div className="w-full h-64 bg-white rounded-lg border border-green-200 p-4">
                    {healthData.healthHistory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={(() => {
                                // Create 2-hour intervals for the last 24 hours (12 intervals)
                                const intervals = [];
                                const now = new Date();
                                const twoHours = 2 * 60 * 60 * 1000; // 2 hours in ms

                                for (let i = 11; i >= 0; i--) {
                                    const intervalTime = new Date(now.getTime() - (i * twoHours));
                                    const intervalStart = new Date(intervalTime.getTime() - twoHours);
                                    const intervalEnd = intervalTime;

                                    // Find health events in this interval
                                    const eventsInInterval = healthData.healthHistory.filter(event => {
                                        const eventTime = new Date(event.timestamp);
                                        return eventTime >= intervalStart && eventTime <= intervalEnd;
                                    });

                                    // Calculate cumulative health up to this interval
                                    const cumulativeHealth = healthData.healthHistory
                                        .filter(event => new Date(event.timestamp) <= intervalEnd)
                                        .reduce((sum, h) => sum + (h.health_change || 0), 8);

                                    intervals.push({
                                        time: intervalTime.toLocaleTimeString([], { hour: '2-digit' }),
                                        health: Math.max(0, Math.min(10, cumulativeHealth)),
                                        events: eventsInInterval.length,
                                        hasEvent: eventsInInterval.length > 0
                                    });
                                }

                                return intervals;
                            })()}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fontSize: 10 }}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    domain={[0, 10]}
                                    tick={{ fontSize: 10 }}
                                    tickCount={6}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#f9fafb',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px'
                                    }}
                                    formatter={(value: any) => {
                                        return `${value.toFixed(1)}`;
                                    }}
                                    labelFormatter={(label) => `Time: ${label}`}
                                />
                                <Line
                                    type="linear"
                                    dataKey="health"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                                    connectNulls={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-32 text-gray-500">
                            <div className="text-center">
                                <div className="text-sm mb-1">No health data yet</div>
                                <div className="text-xs">Create your first DCA feed to see your health chart!</div>
                            </div>
                        </div>
                    )}
                    <div className="text-center mt-2">
                        <div className="text-xs text-orange-600">
                            ⚠️ Health decays by 0.5 points every 6 hours without activity
                        </div>
                    </div>
                </div>

                {/* Health History */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Trading Activity</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {displayEvents.length > 0 ? (
                            displayEvents.map((event, index) => (
                                <div key={index} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-gray-50">
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{event.reason}</div>
                                        {/* {event.details && typeof event.details === 'string' && (
                                            <div className="text-xs text-gray-600">{String(event.details)}</div>
                                        )} */}
                                        <div className="text-xs text-gray-500">
                                            {formatDate(new Date(event.timestamp))}
                                        </div>
                                    </div>
                                    <div className={`font-mono font-semibold ${(event.health_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatHealthChange(event.health_change)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 py-4">
                                <div className="text-sm mb-2">No trading activity yet</div>
                                <div className="text-xs">Create your first DCA feed to start building health!</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* See More Button */}
                {recentEvents.length > 5 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDetails(true)}
                        className="w-full border-green-200 text-green-600 hover:bg-green-50"
                    >
                        See More History
                    </Button>
                )}


            </CardContent>

            {/* Details Modal */}
            {showDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Trading Activity History</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDetails(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {recentEvents.map((event, index) => (
                                <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">{event.reason}</div>
                                            {/* {event.details && typeof event.details === 'string' && (
                                                <div className="text-sm text-gray-600 mt-1">{String(event.details)}</div>
                                            )} */}
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatDate(new Date(event.timestamp))}
                                            </div>
                                        </div>
                                        <div className={`font-mono font-semibold text-lg ${(event.health_change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatHealthChange(event.health_change)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
} 