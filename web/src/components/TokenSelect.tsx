import React, { useState, useRef, useEffect } from 'react';
import { useTokens, type TokenMeta } from '@/lib/oneInchService';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function TokenSelect({
    value,
    onChange,
    placeholder = 'Select token…',
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    const { data, isLoading, error } = useTokens();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedToken, setSelectedToken] = useState<TokenMeta | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Flatten the response map into an array
    const allTokens = Object.values(data?.tokens ?? data ?? {}) as TokenMeta[];

    // Filter tokens based on search term
    const filteredTokens = allTokens.filter(token =>
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        token.address.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20); // Limit to 20 results for performance

    // Find selected token by value
    useEffect(() => {
        if (value && allTokens.length > 0) {
            const token = allTokens.find(t => t.address === value);
            setSelectedToken(token || null);
        } else {
            setSelectedToken(null);
        }
    }, [value, allTokens]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && filteredTokens.length > 0) {
            e.preventDefault();
            handleTokenSelect(filteredTokens[0]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        }
    };

    const handleTokenSelect = (token: TokenMeta) => {
        setSelectedToken(token);
        onChange(token.address);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleInputClick = () => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (isLoading) {
        return (
            <div className="w-full h-10 border rounded px-3 flex items-center bg-white">
                <div className="text-sm text-gray-400">Loading tokens…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-10 border rounded px-3 flex items-center bg-white">
                <div className="text-sm text-red-400">Error loading tokens</div>
            </div>
        );
    }

    return (
        <div className="relative w-full" ref={dropdownRef}>
            {/* Input field */}
            <div
                className="w-full h-10 border rounded px-3 flex items-center justify-between bg-white cursor-pointer hover:border-gray-400 transition-colors"
                onClick={handleInputClick}
            >
                {selectedToken ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {selectedToken.logoURI && (
                            <img
                                src={selectedToken.logoURI}
                                alt={selectedToken.symbol}
                                className="w-5 h-5 rounded-full"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">
                                {selectedToken.symbol}
                            </span>
                            <span className="text-xs text-gray-500 truncate">
                                {selectedToken.name}
                            </span>
                        </div>
                    </div>
                ) : (
                    <span className="text-gray-400">{placeholder}</span>
                )}
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-hidden">
                    {/* Search input */}
                    <div className="p-2 border-b">
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder="Search tokens..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full h-8 text-sm"
                            autoFocus
                        />
                    </div>

                    {/* Token list */}
                    <div className="max-h-64 overflow-y-auto">
                        {filteredTokens.length === 0 ? (
                            <div className="p-3 text-sm text-gray-500 text-center">
                                {searchTerm ? 'No tokens found' : 'No tokens available'}
                            </div>
                        ) : (
                            filteredTokens.map((token) => (
                                <div
                                    key={token.address}
                                    className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    onClick={() => handleTokenSelect(token)}
                                >
                                    <div className="flex items-center gap-3">
                                        {token.logoURI && (
                                            <img
                                                src={token.logoURI}
                                                alt={token.symbol}
                                                className="w-6 h-6 rounded-full"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {token.symbol}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {token.decimals} decimals
                                                </Badge>
                                            </div>
                                            <div className="text-xs text-gray-500 truncate">
                                                {token.name}
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">
                                                {formatAddress(token.address)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Results count */}
                    {searchTerm && filteredTokens.length > 0 && (
                        <div className="p-2 border-t bg-gray-50 text-xs text-gray-500">
                            Showing {filteredTokens.length} of {allTokens.length} tokens
                        </div>
                    )}
                </div>
            )}
        </div>
    );
} 