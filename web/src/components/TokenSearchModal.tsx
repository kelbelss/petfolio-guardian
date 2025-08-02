import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTokens, type TokenMeta } from '@/lib/oneInchService';
import { useAddPortfolioToken } from '@/hooks/useSupabase';
import { useToast } from '@/components/ui/use-toast';

interface TokenSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
    existingTokens: string[];
}

export default function TokenSearchModal({
    isOpen,
    onClose,
    walletAddress,
    existingTokens
}: TokenSearchModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const { data: tokensData, isLoading } = useTokens();
    const { mutateAsync: addPortfolioToken } = useAddPortfolioToken();
    const { toast } = useToast();

    // Convert tokensData to array format (same as regularSwap)
    const allTokens = useMemo(() => {
        if (!tokensData) return [];
        // v1.3 API format: direct object with address keys
        return Object.values(tokensData) as TokenMeta[];
    }, [tokensData]);



    // Filter tokens based on search term and exclude existing tokens
    const filteredTokens = allTokens.filter(token =>
        !existingTokens.includes(token.address) &&
        (token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.address.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 20); // Limit to 20 results



    const handleAddToken = async (token: TokenMeta) => {
        try {
            await addPortfolioToken({ walletAddress, tokenAddress: token.address });
            toast({
                title: "Token Added!",
                description: `${token.symbol} has been added to your portfolio.`,
            });
            onClose();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to add token to portfolio.",
                variant: "destructive",
            });
        }
    };

    const formatAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Add Token to Portfolio</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                </div>

                <div className="mb-4">
                    <Input
                        type="text"
                        placeholder="Search tokens..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                        autoFocus
                    />
                </div>

                <div className="overflow-y-auto max-h-96">
                    {isLoading ? (
                        <div className="text-center py-8 text-gray-500">
                            Loading tokens...
                        </div>
                    ) : filteredTokens.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {searchTerm ? 'No tokens found' : 'Start typing to search tokens'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredTokens.map((token) => (
                                <div
                                    key={token.address}
                                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                                    onClick={() => handleAddToken(token)}
                                >
                                    <div className="flex items-center gap-3">
                                        {token.logoURI ? (
                                            <img
                                                src={token.logoURI}
                                                alt={token.symbol}
                                                className="w-8 h-8 rounded-full"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold">
                                                {token.symbol.slice(0, 2)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-semibold text-gray-900">
                                                {token.symbol}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {token.name}
                                            </div>
                                            <div className="text-xs text-gray-400 font-mono">
                                                {formatAddress(token.address)}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        className="bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        Add
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-4 flex justify-end">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="mr-2"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
} 