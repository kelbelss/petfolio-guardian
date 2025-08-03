
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function YieldFeedWizard() {
    const navigate = useNavigate();

    return (
        <div className="w-full bg-[#effdf4] min-h-screen">
            <div className="max-w-6xl mx-auto p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-emerald-700 mb-2">Feed Hub</h1>
                    <p className="text-gray-600 text-lg">Put something fun here</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">

                    {/* Instant Swap */}
                    <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-shadow">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">⚡</div>
                            <h3 className="text-xl font-bold text-emerald-700">Instant Swap</h3>
                        </div>
                        <p className="text-center text-gray-600 text-sm mb-4">
                            Quick token swaps with competitive pricing and fast execution
                        </p>
                        <button
                            onClick={() => navigate('/regular-swap')}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium"
                        >
                            Start Swap →
                        </button>
                    </div>

                    {/* Token DCA */}
                    <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-shadow">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">🪙</div>
                            <h3 className="text-xl font-bold text-emerald-700">Token DCA</h3>
                        </div>
                        <p className="text-center text-gray-600 text-sm mb-4">
                            Set up automated DCA for specific tokens to build your portfolio
                        </p>
                        <button
                            onClick={() => navigate('/dca/token-dca')}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium"
                        >
                            Create Strategy →
                        </button>
                    </div>

                    {/* Friend DCA */}
                    <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-shadow">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">👥</div>
                            <h3 className="text-xl font-bold text-emerald-700">Peer DCA</h3>
                        </div>
                        <p className="text-center text-gray-600 text-sm mb-4">
                            Help your peers build wealth with automated DCA strategies
                        </p>
                        <button
                            onClick={() => navigate('/dca/peer-dca')}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium"
                        >
                            Create Strategy →
                        </button>
                    </div>

                    {/* Aave Yield */}
                    <div className="bg-white rounded-xl shadow-lg border border-emerald-200 p-6 hover:shadow-xl transition-shadow">
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">🏦</div>
                            <h3 className="text-xl font-bold text-emerald-700">Your Aave Yield Farming</h3>
                        </div>
                        <p className="text-center text-gray-600 text-sm mb-4">
                            Optimise your yield farming on Aave with your custom strategies
                        </p>
                        <button
                            onClick={() => navigate('/dca/your-aave-yield')}
                            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white py-3 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all font-medium"
                        >
                            Create Strategy →
                        </button>
                    </div>

                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors font-medium"
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
} 