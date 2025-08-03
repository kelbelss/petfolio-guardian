import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import TokenSelect from './TokenSelect';
import { NATIVE_TOKEN } from '@/lib/tokenUtils';
import { GAS_CONSTANTS } from '@/lib/constants/aave-constants';

interface Token {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoURI?: string;
}

interface TokenInputProps {
    mode: 'instant' | 'dca';
    token: Token | null;
    amount: string;
    onTokenChange: (token: Token) => void;
    onAmountChange: (amount: string) => void;
    showMax?: boolean;
    disabled?: boolean;
    hideInput?: boolean; // New prop to hide the input field
    balance?: string;
    availableTokens?: Token[];
    isLoading?: boolean;
    error?: Error | null;
    tokenPrice?: number; // Decoded USD price as number
}

export default function TokenInput({
    mode,
    token,
    amount,
    onTokenChange,
    onAmountChange,
    showMax = true,
    disabled = false,
    hideInput = false, // Default to showing input
    balance,
    availableTokens = [],
    isLoading,
    error,
    tokenPrice
}: TokenInputProps) {
    const [isMaxLoading, setIsMaxLoading] = useState(false);

    // Industry-standard amount handling
    const DEC = token?.decimals ?? 18;
    const amountRegex = new RegExp(`^\\d*(\\.\\d{0,${DEC}})?$`);

    // Use the decoded USD price directly
    const tokenPriceUsd = tokenPrice || 0;

    // Real-time USD helper = amount × price (clamped to prevent overflow)
    const amountUsd = tokenPriceUsd && amount ?
        Math.min(Number(amount) * tokenPriceUsd, Number.MAX_SAFE_INTEGER / 10) : 0;

    const handleAmountChange = useCallback((value: string) => {
        // Strip commas and spaces, then trim whitespace before regex test
        const cleaned = value.replace(/[, ]/g, '').trim();

        // Test against regex pattern
        if (amountRegex.test(cleaned)) {
            onAmountChange(cleaned);
        }
    }, [amountRegex, onAmountChange]);

    const handleAmountBlur = useCallback(() => {
        if (!amount) return;

        // Normalize on blur: remove leading zeros, trailing dot, extra precision
        const n = Number(amount);
        if (isNaN(n)) return;

        const fixed = n.toLocaleString('en-US', {
            maximumFractionDigits: DEC,
            minimumFractionDigits: 0
        });
        const normalized = fixed.replace(/,/g, '');

        if (normalized !== amount) {
            onAmountChange(normalized);
        }
    }, [amount, DEC, onAmountChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Escape clears the amount field and prevents propagation
        if (e.key === 'Escape') {
            e.preventDefault();
            onAmountChange('');
            return;
        }

        // Arrow up/down increments/decrements by smallest visible unit
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const current = Number(amount) || 0;
            const increment = Math.pow(10, -DEC); // Smallest unit (e.g., 0.000001 for USDC)
            const newAmount = e.key === 'ArrowUp'
                ? current + increment
                : Math.max(0, current - increment);

            onAmountChange(newAmount.toFixed(DEC));
        }
    }, [amount, DEC, onAmountChange]);

    const handleTokenSelect = (address: string) => {
        const selectedToken = availableTokens.find(t => t.address === address);

        if (selectedToken) {
            onTokenChange(selectedToken);
        }
    };

    const handleMaxClick = async () => {
        if (!balance || !token) return;

        setIsMaxLoading(true);
        try {
            // For native tokens, subtract dynamic gas buffer
            if (token.address.toLowerCase() === NATIVE_TOKEN.toLowerCase()) {
                // Dynamic gas buffer: calculated based on current gas price or fallback to default
                const gasBuffer = GAS_CONSTANTS.DEFAULT_GAS_BUFFER; // TODO: Calculate dynamic buffer based on current gas price
                const balanceNum = parseFloat(balance);
                const gasBufferNum = parseFloat(gasBuffer);
                const maxAmount = Math.max(0, balanceNum - gasBufferNum);
                onAmountChange(maxAmount.toFixed(DEC));
            } else {
                // For ERC-20, set exact balance
                onAmountChange(balance);
            }
        } catch (error) {
            console.error('Error setting max amount:', error);
        } finally {
            setIsMaxLoading(false);
        }
    };

    return (
        <div className="w-full space-y-3">
            {/* Token Selection */}
            <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1">
                    <TokenSelect
                        value={token?.address || ''}
                        onChange={handleTokenSelect}
                        placeholder="Select token..."
                        availableTokens={availableTokens}
                        isLoading={isLoading}
                        error={error}
                    />
                </div>
                {showMax && mode === 'instant' && balance && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleMaxClick}
                        disabled={disabled || isMaxLoading}
                        className="text-xs px-2 sm:px-3 py-1 min-w-[50px] sm:min-w-[60px]"
                    >
                        {isMaxLoading ? '...' : 'MAX'}
                    </Button>
                )}
            </div>

            {/* Amount Input - Hidden if hideInput is true */}
            {!hideInput && (
                <div className="space-y-2">
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="0.0"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            onBlur={handleAmountBlur}
                            onKeyDown={handleKeyDown}
                            disabled={disabled}
                            className="text-base sm:text-lg font-mono h-12 sm:h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            aria-busy={isLoading}
                        />
                        {/* Amount USD helper inside input */}
                        {amountUsd > 0 && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm text-gray-500">
                                ≈${amountUsd.toFixed(2)}
                            </div>
                        )}
                    </div>

                    {/* Balance and Price Display */}
                    <div className="flex justify-between text-xs text-gray-500">
                        {balance !== undefined && (
                            <span>Balance: {parseFloat(balance).toFixed(6)}</span>
                        )}
                        {/* Token price helper under input */}
                        {tokenPriceUsd > 0 ? (
                            <span>1 {token?.symbol} ≈ ${tokenPriceUsd.toFixed(2)}</span>
                        ) : (
                            <span aria-busy="true">Price loading…</span>
                        )}
                    </div>
                </div>
            )}

            {/* Amount Display - Shown when input is hidden */}
            {hideInput && amount && (
                <div className="space-y-2">
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-lg font-mono text-center">
                            {amount}
                        </div>
                        {amountUsd > 0 && (
                            <div className="text-xs text-gray-500 text-center mt-1">
                                ≈${amountUsd.toFixed(2)}
                            </div>
                        )}
                    </div>

                    {/* Price Display */}
                    <div className="flex justify-center text-xs text-gray-500">
                        {tokenPriceUsd > 0 ? (
                            <span>1 {token?.symbol} ≈ ${tokenPriceUsd.toFixed(2)}</span>
                        ) : (
                            <span aria-busy="true">Price loading…</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
} 