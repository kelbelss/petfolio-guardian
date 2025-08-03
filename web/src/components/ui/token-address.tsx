import React, { useState } from 'react';
import { shortHash, copyToClipboard, getBaseScanUrl } from '@/lib/utils/token-utils';

interface TokenAddressProps {
    address: string;
    showCopy?: boolean;
    showExplorer?: boolean;
    className?: string;
}

export const TokenAddress: React.FC<TokenAddressProps> = ({
    address,
    showCopy = true,
    showExplorer = true,
    className = ""
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const success = await copyToClipboard(address);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="truncate max-w-[160px] cursor-help font-mono text-base" title={address}>
                {shortHash(address)}
            </span>
            <div className="flex items-center gap-1">
                {showCopy && (
                    <button
                        onClick={handleCopy}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy address"
                    >
                        {copied ? (
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>
                )}
                {showExplorer && (
                    <a
                        href={getBaseScanUrl(address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="View on BaseScan"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                )}
            </div>
        </div>
    );
}; 