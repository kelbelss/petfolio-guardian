import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePetState } from '@/hooks/usePetState';
import { formatDate } from '@/lib/format';

export default function HealthTracking() {
    const { health, healthHistory } = usePetState();
    const [showDetails, setShowDetails] = useState(false);

    // Get recent health events (last 30 days, show first 5)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentEvents = healthHistory.filter(event => event.timestamp > thirtyDaysAgo);
    const displayEvents = recentEvents.slice(0, 5);

    const formatHealthChange = (change: number): string => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(1)}`;
    };

    const getHealthColor = (health: number): string => {
        if (health <= 3) return 'text-red-500';
        if (health <= 6) return 'text-yellow-500';
        return 'text-green-500';
    };

    return (
        <Card className="bg-white border-green-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-green-700">
                    <div className="flex items-center gap-3">📊 Health Tracking</div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Current Health</div>
                        <div className={`text-2xl font-bold ${getHealthColor(health)}`}>
                            {health.toFixed(1)}/10
                        </div>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Health Chart Placeholder */}
                <div className="w-full h-32 bg-pink-300 rounded-lg flex items-center justify-center">
                    <span className="text-pink-700 font-semibold">Health Chart Coming Soon</span>
                </div>

                {/* Health History */}
                <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Health Changes</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {displayEvents.length > 0 ? (
                            displayEvents.map((event, index) => (
                                <div key={index} className="flex justify-between items-center text-sm">
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">{event.reason}</div>
                                        <div className="text-xs text-gray-500">
                                            {formatDate(event.timestamp)}
                                        </div>
                                    </div>
                                    <div className={`font-mono font-semibold ${event.healthChange >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {formatHealthChange(event.healthChange)}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 py-4">
                                No health events yet
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
                            <h3 className="text-lg font-semibold text-gray-900">Health History Details</h3>
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
                                            <div className="text-xs text-gray-500 mt-1">
                                                {formatDate(event.timestamp)}
                                            </div>
                                        </div>
                                        <div className={`font-mono font-semibold text-lg ${event.healthChange >= 0 ? 'text-green-600' : 'text-red-600'
                                            }`}>
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