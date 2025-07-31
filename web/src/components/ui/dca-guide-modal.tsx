import { useState } from 'react';
import { Button } from './button';
import { Badge } from './badge';

interface DcaGuideModalProps {
    trigger?: React.ReactNode;
}

export function DcaGuideModal({ trigger }: DcaGuideModalProps) {
    const [isOpen, setIsOpen] = useState(false);

    const steps = [
        {
            title: 'Select Your Tokens',
            description: 'Choose the token you want to DCA from (source) and the token you want to DCA into (destination).',
            icon: '🔄',
            details: [
                'Popular pairs: ETH → USDC, USDC → ETH, DAI → WBTC',
                'You can DCA any ERC-20 token pair',
                'Source token will be automatically sold for destination token'
            ]
        },
        {
            title: 'Set DCA Parameters',
            description: 'Configure how much to invest per cycle and how often to execute the DCA.',
            icon: '⚙️',
            details: [
                'Amount per fill: How much to invest each time (e.g., 0.1 ETH)',
                'Frequency: How often to execute (hourly, daily, weekly)',
                'Stop condition: End date or total amount to invest'
            ]
        },
        {
            title: 'ETH Wrap Step (If Using ETH)',
            description: 'If you select ETH as your source token, it will be automatically wrapped to WETH.',
            icon: '🔶',
            details: [
                'ETH is automatically converted to WETH (Wrapped ETH)',
                'This requires a separate transaction and gas fee',
                'You\'ll see two wallet confirmations: wrap + approve',
                'WETH is the ERC-20 version of ETH used by DeFi protocols'
            ],
            warning: true
        },
        {
            title: 'Token Approval',
            description: 'Approve the DCA contract to spend your tokens using Permit2.',
            icon: '✅',
            details: [
                'Uses Permit2 for gas-efficient approvals',
                'No need for separate approve transactions',
                'Approval is included in the DCA order creation'
            ]
        },
        {
            title: 'Create DCA Order',
            description: 'Submit your DCA order to the smart contract.',
            icon: '📝',
            details: [
                'Order is created on-chain using 1inch limit order protocol',
                'You\'ll sign a message to authorize the order',
                'Order becomes active immediately after confirmation'
            ]
        },
        {
            title: 'Monitor & Manage',
            description: 'Track your DCA progress and manage your orders.',
            icon: '📊',
            details: [
                'View all your active DCA orders in the Feeds page',
                'See next execution time and total cycles completed',
                'Cancel orders anytime if needed'
            ]
        }
    ];

    return (
        <>
            <div onClick={() => setIsOpen(true)}>
                {trigger || (
                    <Button variant="outline" className="text-sm">
                        📖 How to DCA
                    </Button>
                )}
            </div>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto w-full">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-semibold">📖 How to Use DCA (Dollar Cost Averaging)</span>
                                    <Badge variant="secondary" className="text-xs">Guide</Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </Button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-blue-600 text-lg">💡</span>
                                        <div className="text-sm text-blue-800">
                                            <div className="font-medium mb-1">What is DCA?</div>
                                            <div>
                                                Dollar Cost Averaging (DCA) is an investment strategy where you invest a fixed amount
                                                at regular intervals, regardless of market conditions. This helps reduce the impact
                                                of market volatility on your investment.
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {steps.map((step, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-shrink-0 w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg">{step.icon}</span>
                                                        <h3 className="font-semibold text-gray-900">{step.title}</h3>
                                                        {step.warning && (
                                                            <Badge variant="destructive" className="text-xs">Important</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-gray-600 text-sm mb-3">{step.description}</p>
                                                    <ul className="space-y-1">
                                                        {step.details.map((detail, detailIndex) => (
                                                            <li key={detailIndex} className="text-sm text-gray-500 flex items-start gap-2">
                                                                <span className="text-emerald-500 mt-1">•</span>
                                                                <span>{detail}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <span className="text-amber-600 text-lg">⚠️</span>
                                        <div className="text-sm text-amber-800">
                                            <div className="font-medium mb-1">Important Notes</div>
                                            <ul className="space-y-1">
                                                <li>• <strong>ETH Wrap:</strong> If using ETH, you'll see two gas prompts: wrap ETH to WETH, then approve</li>
                                                <li>• <strong>Gas Fees:</strong> Each DCA execution incurs gas fees, which vary based on network congestion</li>
                                                <li>• <strong>Slippage:</strong> Set appropriate slippage tolerance to avoid failed transactions</li>
                                                <li>• <strong>Market Risk:</strong> DCA doesn't guarantee profits - crypto markets are volatile</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={() => setIsOpen(false)}>
                                        Got it!
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
} 