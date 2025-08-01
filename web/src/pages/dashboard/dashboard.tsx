// src/pages/Dashboard.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { hippoGame } from '@/lib/hippoGame';

import { PriceFeedWidget } from '@/pages/dashboard/price-feed-widget';

export default function Dashboard() {
    const navigate = useNavigate();
    const [hippoName, setHippoName] = React.useState<string>('');


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
                                                    setHippoName(e.currentTarget.value.trim());
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
                                    src="/src/assets/HipposHappy.gif"
                                    alt="Happy Hippo"
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
                                <VitalCard icon="⚕️" title="Health" value={<PetHappinessBar />} />
                            </div>
                            <VitalCard icon="🍽️" title="Hunger" value={<Countdown />} />
                            <VitalCard icon="💰" title="Total Fed" value={
                                <div className="pt-1">
                                    <span className="font-mono text-emerald-600 text-xs">0</span>
                                </div>
                            } />
                        </div>

                        {/* Feed Now Section */}
                        <FeedNowSection navigate={navigate} />

                        {/* Active DCA Feeds Widget */}
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
                                <div className="text-center py-6">
                                    <p className="text-gray-500 mb-4">No active feeds</p>
                                    <Link
                                        to="/dca/setup"
                                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                                    >
                                        Create one now
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Portfolio Section */}
                        <PortfolioSection navigate={navigate} />

                        {/* Price Feed Widget */}
                        <div className="w-full">
                            <PriceFeedWidget />
                        </div>





                    </div>
                </div>
            </div>
        </div>
    );
}

function FeedNowSection({ navigate }: { navigate: (path: string) => void }) {
    const [selectedOption, setSelectedOption] = React.useState<'regular' | 'fusion' | 'fusion-plus'>('regular');

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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {swapOptions.map(option => (
                                <div
                                    key={option.id}
                                    className={`
                                        relative border-2 rounded-xl p-4 cursor-pointer transition-all duration-200
                                        ${selectedOption === option.id
                                            ? 'border-emerald-500 bg-emerald-50 shadow-md'
                                            : 'border-gray-200 bg-white hover:border-gray-300'}
                                    `}
                                    onClick={() => {
                                        if (option.id !== 'fusion' && option.id !== 'fusion-plus') {
                                            setSelectedOption(option.id as typeof selectedOption);
                                        }
                                    }}
                                >
                                    {/* Coming Soon Banner for Fusion and Fusion+ */}
                                    {(option.id === 'fusion' || option.id === 'fusion-plus') && (
                                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                                            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg">
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
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <Button className="flex-1 bg-emerald-400 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md transition-all">
                            🍽️ Feed Now
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 border-emerald-200 text-emerald-600"
                            onClick={() => navigate('/dca/setup')}
                        >
                            🔄 Recurring Feed
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function PortfolioSection({ navigate }: { navigate: (path: string) => void }) {
    return (
        <Card className="bg-white border-green-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">💰</span>
                        <span>Portfolio</span>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Total Value</div>
                        <div className="text-2xl font-bold text-green-600">$0</div>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center py-8 text-gray-500">No assets</div>
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

function Countdown() {
    return (
        <div className="pt-1">
            <span className="font-mono text-emerald-600 text-xs">
                Next snack in 00:00:00
            </span>
        </div>
    );
}

function PetHappinessBar() {
    const state = hippoGame.getState();
    const snackPercentage = hippoGame.getSnackPercentage();

    // Determine color based on snack level
    let barColor = 'bg-emerald-400'; // Default green
    if (state.snacks <= 3) {
        barColor = 'bg-red-500'; // Red for hungry (0-3 snacks)
    } else if (state.snacks <= 6) {
        barColor = 'bg-yellow-500'; // Yellow for neutral (4-6 snacks)
    }

    return (
        <div className="space-y-2">
            <div className="h-4 rounded bg-gray-200 overflow-hidden relative">
                <div className={`h-full ${barColor} w-[${snackPercentage}%] transition-all duration-300`}></div>
                <div className="absolute inset-0 flex items-center justify-between px-2">
                    <span className="text-xs text-gray-700 font-bold">1</span>
                    <span className="text-xs text-gray-700 font-bold">10</span>
                </div>
            </div>
            <div className="text-center">
                <span className="text-xs font-mono text-gray-600">{state.snacks}/10</span>
            </div>
        </div>
    );
}






