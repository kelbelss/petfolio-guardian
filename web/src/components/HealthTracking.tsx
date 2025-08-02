import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccount } from 'wagmi';
import { useUserFeeds, useHealthRecord, useCalculateAndUpdateHealth } from '@/hooks/useSupabase';
import { formatDate } from '@/lib/format';

export interface HealthEvent {
    timestamp: number;
    healthChange: number;
    reason: string;
    details?: string;
    transactionHash?: string;
}

export default function HealthTracking() {
    const { address } = useAccount();
    const { data: feedsData } = useUserFeeds(address || '');
    const { data: healthRecordData } = useHealthRecord(address || '');
    const { mutateAsync: calculateAndUpdateHealth } = useCalculateAndUpdateHealth();
    const [showDetails, setShowDetails] = useState(false);

    // Update health when component mounts or feeds change
    React.useEffect(() => {
        if (address) {
            calculateAndUpdateHealth(address);
        }
    }, [address, feedsData, calculateAndUpdateHealth]);

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
    const recentEvents = healthData.healthHistory.filter(event => event.timestamp > thirtyDaysAgo);
    const displayEvents = recentEvents.slice(0, 5);

    const formatHealthChange = (change: number): string => {
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
                {/* Health Chart Placeholder */}
                <div className="w-full h-32 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg flex items-center justify-center border border-green-200">
                    <div className="text-center">
                        <div className="text-green-700 font-semibold mb-1">Health Chart</div>
                        <div className="text-xs text-green-600"></div>
                        <div className="text-xs text-orange-600 mt-1">
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
                                        {event.details && (
                                            <div className="text-xs text-gray-600">{event.details}</div>
                                        )}
                                        <div className="text-xs text-gray-500">
                                            {formatDate(event.timestamp)}
                                        </div>
                                    </div>
                                    <div className={`font-mono font-semibold ${event.healthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatHealthChange(event.healthChange)}
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
                                            {event.details && (
                                                <div className="text-sm text-gray-600 mt-1">{event.details}</div>
                                            )}
                                            {event.transactionHash && (
                                                <div className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline">
                                                    View Transaction
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatDate(event.timestamp)}
                                            </div>
                                        </div>
                                        <div className={`font-mono font-semibold text-lg ${event.healthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatHealthChange(event.healthChange)}
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