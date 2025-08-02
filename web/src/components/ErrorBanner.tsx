import React from 'react';

interface ErrorBannerProps {
    msg: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ msg }) => (
    <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-4 text-sm">
        {msg}
    </div>
); 