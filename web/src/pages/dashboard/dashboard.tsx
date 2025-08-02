// src/pages/Dashboard.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { usePetState } from '@/hooks/usePetState';
import { PriceFeedWidget } from '@/pages/dashboard/price-feed-widget';
import HealthTracking from '@/components/HealthTracking';
import { useAccount, useWalletClient } from 'wagmi';
import { useToast } from '@/components/ui/use-toast';
import { useUser, useUpdateUser, useCreateUser, useUserFeeds } from '@/hooks/useSupabase';
import type { Feed } from '@/lib/supabase';
import PortfolioSection from '@/components/PortfolioSection';

export default function Dashboard() {
    const navigate = useNavigate();
    const { address } = useAccount();
    const { toast } = useToast();
    const { data: userData, isLoading: userLoading, error: userError } = useUser(address || '');
    const { mutateAsync: updateUser } = useUpdateUser();
    const { mutateAsync: createUser } = useCreateUser();
    const { data: feedsData } = useUserFeeds(address || '');
    const user = userData?.data;
    const [hippoName, setHippoName] = React.useState<string>('');
    const {
        getHippoImage
    } = usePetState();

    // Update local state when user data changes or wallet disconnects
    React.useEffect(() => {
        if (!address) {
            // Clear everything when wallet disconnects
            setHippoName('');
            return;
        }

        if (user?.hippo_name) {
            setHippoName(user.hippo_name);
        } else {
            setHippoName('');
        }
    }, [user?.hippo_name, address]);

    // Create user in Supabase if they don't exist
    React.useEffect(() => {
        if (address && !userLoading && !user && !userError) {
            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            createUser({
                walletAddress: address,
                timezone: userTimezone
            }).catch(error => {
                console.error('Failed to create user:', error);
            });
        }
    }, [address, userLoading, user, userError, createUser]);

    // Log errors for debugging
    React.useEffect(() => {
        if (userError) {
            console.error('User data error:', userError);
        }
    }, [userError]);

    const handleHippoNameChange = async (newName: string) => {
        if (!address) return;

        try {
            setHippoName(newName);
            await updateUser({ walletAddress: address, updates: { hippo_name: newName } });
            toast({
                title: "Hippo name saved!",
                description: `${newName} will remember their name across all your devices.`,
            });
        } catch (error) {
            console.error('Failed to save hippo name:', error);
            // Revert the name change if save failed
            setHippoName(user?.hippo_name || '');
            toast({
                title: "Failed to save name",
                description: "Please check your connection and try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-screen-2xl mx-auto py-12">
                {/* Main Content - Hippo Left, Content Right */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* Left Side - Hippo Section */}
                    <div className="lg:col-span-2">
                        <div className="text-center pr-14">
                            {/* Hippo Name */}
                            <div className="mb-4">
                                {hippoName ? (
                                    <div>
                                        <h3 className="text-4xl font-bold text-emerald-600 mb-1">{hippoName}</h3>
                                        <button
                                            onClick={() => setHippoName('')}
                                            className="text-xs text-emerald-500 hover:text-emerald-700"
                                        >
                                            Change name
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Name your hippo..."
                                            className="w-64 px-4 py-2 border-2 border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center bg-white shadow-sm"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                                    handleHippoNameChange(e.currentTarget.value.trim());
                                                    e.currentTarget.value = '';
                                                }
                                            }}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Press Enter to save</p>
                                    </div>
                                )}
                            </div>

                            <div className="w-[500px] h-[500px] mb-6">
                                <img
                                    src={getHippoImage()}
                                    alt="Hippo"
                                    className="w-[700px] h-[700px] object-contain"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Dashboard Content */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Explanation Header */}
                        <div className="mb-6 p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-md">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                🍽️ Feed {hippoName ? hippoName : 'Your Hippo'}, Build Your Portfolio
                            </h2>
                            <p className="text-emerald-100 text-base">Your hippo's health depends on regular DCA feeding. Start a DCA schedule to keep them happy!</p>
                        </div>

                        {/* Vitals Bar Row */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2">
                                <VitalCard icon="⚕️" title="Health" value={<PetHappinessBar feedsData={feedsData} />} />
                            </div>
                            <VitalCard icon="🍽️" title="Hunger" value={<Countdown feedsData={feedsData} />} />
                            <VitalCard icon="⏰" title="Last feed" value={<LastFeedTime feedsData={feedsData} />} />
                        </div>

                        {/* Feed Now Section */}
                        <FeedNowSection navigate={navigate} />

                        {/* Active DCA Feeds Widget */}
                        <ActiveDCAFeeds feedsData={feedsData} />

                        {/* Portfolio Section */}
                        <PortfolioSection address={address} user={user} />

                        {/* Price Feed Widget */}
                        <div className="w-full">
                            <PriceFeedWidget />
                        </div>

                        {/* Health Tracking */}
                        <div className="w-full">
                            <HealthTracking />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeedNowSection({ navigate }: { navigate: (path: string) => void }) {
    const [selectedOption, setSelectedOption] = React.useState<'regular' | 'recurring' | 'fusion' | 'fusion-plus'>('regular');
    const { address } = useAccount();
    const { data: walletClient } = useWalletClient();
    const { toast } = useToast();

    // Handle Feed Now button based on selection
    const handleFeedNow = async () => {
        if (!address || !walletClient) {
            toast({ title: 'Wallet not connected', variant: 'destructive' });
            return;
        }

        if (selectedOption === 'regular') {
            navigate('/regular-swap');
        } else if (selectedOption === 'recurring') {
            navigate('/dca/setup');
        }
    };

    // STATIC DEMO SWAP OPTIONS
    const swapOptions = [
        {
            id: 'regular',
            title: 'Regular',
            description: 'Instant DEX swap, classic path',
            icon: '⚡',
            estimatedTime: '~30 seconds',
            estimatedGas: '~150,000 gas',
            explanation: 'Standard swap through 1inch aggregator. Fastest execution with competitive pricing.',
            price: '0',
            output: '0'
        },
        {
            id: 'recurring',
            title: 'Recurring Feeds',
            description: 'Set up automated DCA strategies',
            icon: '🔄',
            estimatedTime: '~5 minutes',
            estimatedGas: '~200,000 gas',
            explanation: 'Create recurring DCA feeds to automatically feed your hippo on schedule.',
            price: '0',
            output: '0'
        },
        {
            id: 'fusion',
            title: 'Fusion',
            description: 'Intent-based, MEV-protected, better price',
            icon: '🛡️',
            estimatedTime: '~2-5 minutes',
            estimatedGas: '~80,000 gas',
            explanation: 'MEV-protected intent-based swap. Slower but better price execution and protection.',
            price: '0',
            output: '0'
        },
        {
            id: 'fusion-plus',
            title: 'Fusion+',
            description: 'Advanced intent-based with enhanced protection',
            icon: '🚀',
            estimatedTime: '~3-7 minutes',
            estimatedGas: '~60,000 gas',
            explanation: 'Premium intent-based swap with maximum MEV protection and optimal routing.',
            price: '0',
            output: '0'
        }
    ];

    return (
        <Card className="bg-[#effdf4] border-green-200">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-green-700">
                    <div className="flex items-center gap-3">🍽️ Feed Now</div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Swap Method</h3>
                        <div className="flex gap-4 overflow-x-auto pb-4">
                            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                                {swapOptions.map(option => (
                                    <div
                                        key={option.id}
                                        className={`
                                        relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200 w-80
                                        ${selectedOption === option.id
                                                ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                                : 'border-gray-200 bg-white hover:border-gray-300'}
                                    `}
                                        onClick={() => {
                                            if (option.id === 'regular' || option.id === 'recurring') {
                                                setSelectedOption(option.id as typeof selectedOption);
                                            }
                                        }}
                                    >
                                        {/* Coming Soon Banner for Fusion and Fusion+ */}
                                        {(option.id === 'fusion' || option.id === 'fusion-plus') && (
                                            <div className="absolute top-4 left-2/3 transform -translate-x-1/2 z-20 pr-10">
                                                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg whitespace-nowrap">
                                                    🚀 Coming Soon
                                                </div>
                                            </div>
                                        )}

                                        {/* radio indicator */}
                                        <div className="absolute top-3 right-3">
                                            <div className={`
                                            w-5 h-5 rounded-full border-2 flex items-center justify-center
                                            ${selectedOption === option.id
                                                    ? 'border-emerald-500 bg-emerald-500'
                                                    : 'border-gray-300'}
                                        `}>
                                                {selectedOption === option.id && (
                                                    <div className="w-2 h-2 bg-white rounded-full" />
                                                )}
                                            </div>
                                        </div>

                                        {/* icon + title */}
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="text-2xl">{option.icon}</span>
                                            <h4 className="font-semibold text-gray-900">{option.title}</h4>
                                        </div>

                                        {/* description */}
                                        <p className="text-sm text-gray-600 mb-3">{option.description}</p>

                                        {/* estimates */}
                                        <div className="space-y-1 text-sm mb-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Est. Time:</span>
                                                <span className="font-medium">{option.estimatedTime}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Est. Gas:</span>
                                                <span className="font-medium">{option.estimatedGas}</span>
                                            </div>
                                        </div>

                                        {/* explanation */}
                                        <p className="text-xs text-gray-500 leading-relaxed mb-3">
                                            {option.explanation}
                                        </p>

                                        {/* DEMO PRICE / OUTPUT */}
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Price:</span>
                                            <span>{option.price}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-medium">
                                            <span>Output:</span>
                                            <span>{option.output}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <Button
                            className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all"
                            onClick={handleFeedNow}
                        >
                            🍽️ Feed Now
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}



function VitalCard({
    icon,
    title,
    value
}: {
    icon: string;
    title: string;
    value: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-green-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{icon}</span>
                <h3 className="text-xl font-semibold text-green-600">{title}</h3>
            </div>
            <div className="text-lg text-gray-700">{value}</div>
        </div>
    );
}

function Countdown({ feedsData }: { feedsData: { data: Feed[] | null } | undefined }) {
    const getNextFeedTime = () => {
        if (!feedsData?.data || feedsData.data.length === 0) {
            return 'No recurring feeds set';
        }

        // Find active recurring feeds (DCA feeds)
        const activeDCAFeeds = feedsData.data.filter((feed: Feed) =>
            feed.feed_type === 'recurring' && feed.status === 'active'
        );

        if (activeDCAFeeds.length === 0) {
            return 'No recurring feeds set';
        }

        // Find the next feed time from all active DCA feeds
        const now = Date.now();
        let nextFeedTime: number | null = null;

        activeDCAFeeds.forEach((feed: Feed) => {
            if (feed.next_fill_time) {
                const nextTime = new Date(feed.next_fill_time).getTime();
                if (nextTime > now && (!nextFeedTime || nextTime < nextFeedTime)) {
                    nextFeedTime = nextTime;
                }
            }
        });

        if (!nextFeedTime) {
            return 'No scheduled feeds';
        }

        // Calculate time difference
        const diff = nextFeedTime - now;
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) {
            return `${seconds} seconds`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            const remainingMinutes = Math.floor((seconds % 3600) / 60);
            if (remainingMinutes > 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
            } else {
                return `${hours} hour${hours !== 1 ? 's' : ''}`;
            }
        } else {
            const days = Math.floor(seconds / 86400);
            const remainingHours = Math.floor((seconds % 86400) / 3600);
            if (remainingHours > 0) {
                return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
            } else {
                return `${days} day${days !== 1 ? 's' : ''}`;
            }
        }
    };

    return (
        <div className="pt-1">
            <span className="font-mono text-emerald-600 text-xs">
                Next feed in: {getNextFeedTime()}
            </span>
        </div>
    );
}

function PetHappinessBar({ feedsData }: { feedsData: { data: Feed[] | null } | undefined }) {
    // Calculate health based on real swap data
    const healthData = React.useMemo(() => {
        if (!feedsData?.data || feedsData.data.length === 0) {
            return {
                health: 8.0,
                healthPercentage: 80
            };
        }

        const feeds = feedsData.data;
        let totalHealth = 8.0; // Starting health
        let lastFedTime: number | null = null;

        // Process each feed to calculate health
        feeds.forEach((feed: Feed) => {
            const createdAt = new Date(feed.created_at).getTime();

            // Feed creation event
            totalHealth += 0.5;
            lastFedTime = Math.max(lastFedTime || 0, createdAt);

            // Bot execution events
            if (feed.bot_execution_count > 0) {
                totalHealth += feed.bot_execution_count * 0.5;
                // Approximate execution times
                for (let i = 0; i < feed.bot_execution_count; i++) {
                    const executionTime = createdAt + (i * feed.period * 1000);
                    lastFedTime = Math.max(lastFedTime, executionTime);
                }
            }

            // Handle feed status changes
            if (feed.status === 'completed') {
                totalHealth += 1.0;
                lastFedTime = Math.max(lastFedTime, createdAt);
            } else if (feed.status === 'failed') {
                totalHealth -= 1.0;
                lastFedTime = Math.max(lastFedTime, createdAt);
            }
        });

        // Apply decay if there's a last fed time
        if (lastFedTime) {
            const now = Date.now();
            const timeSinceLastFed = now - lastFedTime;
            const decayInterval = 6 * 60 * 60 * 1000; // 6 hours in ms
            const decayAmount = 0.5; // 0.5 health points per decay cycle
            const decayCycles = Math.floor(timeSinceLastFed / decayInterval);

            if (decayCycles > 0) {
                const totalDecay = decayCycles * decayAmount;
                totalHealth = Math.max(0, totalHealth - totalDecay);
            }
        }

        // Cap health between 0 and 10
        totalHealth = Math.max(0, Math.min(10, totalHealth));
        const healthPercentage = (totalHealth / 10) * 100;

        return {
            health: totalHealth,
            healthPercentage
        };
    }, [feedsData]);

    // Determine color based on health level
    let barColor = 'bg-emerald-400'; // Default green
    if (healthData.health <= 3) {
        barColor = 'bg-red-500'; // Red for hungry (0-3 health)
    } else if (healthData.health <= 6) {
        barColor = 'bg-yellow-500'; // Yellow for neutral (4-6 health)
    }

    return (
        <div className="space-y-2">
            <div className="h-4 rounded bg-gray-200 overflow-hidden relative">
                <div className={`h-full ${barColor} transition-all duration-300`} style={{ width: `${healthData.healthPercentage}%` }}></div>
                <div className="absolute inset-0 flex items-center justify-between px-2">
                    <span className="text-xs text-gray-700 font-bold">{healthData.health % 1 === 0 ? healthData.health.toFixed(0) : healthData.health.toFixed(1)}</span>
                    <span className="text-xs text-gray-700 font-bold">10</span>
                </div>
            </div>
            <div className="text-center">
                <span className="text-xs font-mono text-gray-600">{healthData.health % 1 === 0 ? healthData.health.toFixed(0) : healthData.health.toFixed(1)}/10</span>
            </div>
        </div>
    );
}

function LastFeedTime({ feedsData }: { feedsData: { data: Feed[] | null } | undefined }) {
    // Get the most recent swap from Supabase
    const getLastFeedTime = () => {
        if (!feedsData?.data || feedsData.data.length === 0) {
            return 'Never fed';
        }

        // Find the most recent swap (completed feeds)
        const completedSwaps = feedsData.data.filter((feed: Feed) =>
            feed.feed_type === 'swap' && feed.status === 'completed'
        );

        if (completedSwaps.length === 0) {
            return 'Never fed';
        }

        // Sort by created_at and get the most recent
        const mostRecent = completedSwaps.sort((a: Feed, b: Feed) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];

        const timestamp = new Date(mostRecent.created_at).getTime();

        // Calculate time difference
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);

        if (seconds < 60) {
            return 'Just now';
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            const remainingMinutes = Math.floor((seconds % 3600) / 60);
            if (remainingMinutes > 0) {
                return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} ago`;
            } else {
                return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
            }
        } else {
            const days = Math.floor(seconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        }
    };

    return (
        <div className="pt-1">
            <span className="font-mono text-emerald-600 text-xs">
                {getLastFeedTime()}
            </span>
        </div>
    );
}

function ActiveDCAFeeds({ feedsData }: { feedsData: { data: Feed[] | null } | undefined }) {
    // Filter for active recurring feeds only
    const activeFeeds = React.useMemo(() => {
        if (!feedsData?.data) return [];
        return feedsData.data.filter((feed: Feed) =>
            feed.feed_type === 'recurring' && feed.status === 'active'
        );
    }, [feedsData]);

    const formatInterval = (period: number) => {
        const hours = period / 3600;
        if (hours < 1) return `${period / 60} minutes`;
        if (hours < 24) return `${hours} hours`;
        if (hours < 168) return `${hours / 24} days`;
        return `${hours / 168} weeks`;
    };

    const getNextFeedTime = (feed: Feed) => {
        if (!feed.next_fill_time) return 'Unknown';
        const nextTime = new Date(feed.next_fill_time).getTime();
        const now = Date.now();
        const diff = nextTime - now;

        if (diff <= 0) return 'Ready now';

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
        if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    };

    return (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
                <CardTitle className="flex items-center justify-between text-blue-700">
                    <div className="flex items-center gap-3">📊 Your Active DCA Feeds</div>
                    <Link
                        to="/dca/feeds"
                        className="text-sm font-normal text-blue-600 hover:text-blue-800 underline"
                    >
                        View all feeds & history
                    </Link>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {activeFeeds.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-gray-500 mb-4">No active feeds</p>
                        <Link
                            to="/dca/setup"
                            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                        >
                            Create one now
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activeFeeds.map((feed: Feed) => (
                            <div key={feed.id} className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <span className="text-blue-600 font-bold">DCA</span>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">
                                                {feed.src_token_symbol} → {feed.dst_token_symbol}
                                            </h4>
                                            <p className="text-sm text-gray-600">
                                                {feed.chunk_size} {feed.src_token_symbol} every {formatInterval(feed.period)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-medium text-blue-600">
                                            Next: {getNextFeedTime(feed)}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {feed.bot_execution_count} executions
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm">
                                    <div className="text-gray-600">
                                        <span className="font-medium">Status:</span> Active
                                    </div>
                                    <div className="text-gray-600">
                                        <span className="font-medium">Created:</span> {new Date(feed.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}






