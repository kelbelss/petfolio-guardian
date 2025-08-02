import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingsDrawerProps {
    slippage: number;
    onSlippageChange: (value: number) => void;
}

export default function SettingsDrawer({
    slippage,
    onSlippageChange
}: SettingsDrawerProps) {
    const [isOpen, setIsOpen] = useState(false);

    const presetSlippages = [0.1, 0.5, 1.0, 2.0];

    return (
        <div className="w-full">
            {/* Settings Toggle Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full justify-between"
            >
                <span>Settings</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </Button>

            {/* Settings Panel */}
            {isOpen && (
                <Card className="mt-4 bg-white border-emerald-200">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg text-emerald-700">Swap Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Instant Payment Indicator */}
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-emerald-600">⚡</span>
                                <span className="text-sm font-medium text-emerald-700">Instant Payment</span>
                            </div>
                            <p className="text-xs text-emerald-600">
                                Standard 1% slippage • Ready to swap
                            </p>
                        </div>

                        {/* Slippage Tolerance */}
                        <div className="space-y-3">
                            <div>
                                <Label className="text-sm font-medium text-emerald-700">
                                    Slippage Tolerance
                                </Label>
                                <p className="text-xs text-gray-500">
                                    Maximum price change you'll accept (1% = standard)
                                </p>
                            </div>
                            <div className="flex gap-2">
                                {presetSlippages.map((preset) => (
                                    <Button
                                        key={preset}
                                        variant={slippage === preset ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => onSlippageChange(preset)}
                                        className="flex-1"
                                    >
                                        {preset}%
                                    </Button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    min="0.1"
                                    max="50"
                                    step="0.1"
                                    value={slippage}
                                    onChange={(e) => onSlippageChange(parseFloat(e.target.value) || 1.0)}
                                    className="flex-1"
                                />
                                <span className="text-sm text-gray-500">%</span>
                            </div>
                        </div>

                        {/* Gas Price (Hard-coded for MVP) */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                                <Label className="text-sm font-medium text-emerald-700">
                                    Gas Price
                                </Label>
                                <p className="text-xs text-gray-500">
                                    Auto (recommended)
                                </p>
                            </div>
                            <span className="text-sm text-gray-500">Auto</span>
                        </div>
                        {/* TODO: Add manual gas price override later */}
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 