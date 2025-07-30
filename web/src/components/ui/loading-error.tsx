import { useApiError } from '@/lib/hooks/useApiError';

interface LoadingSpinnerProps {
    text?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ text = 'Loading...', size = 'md' }: LoadingSpinnerProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8'
    };

    return (
        <div className="flex items-center justify-center gap-2">
            <svg
                className={`animate-spin ${sizeClasses[size]} text-emerald-500`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                />
            </svg>
            <span className="text-sm text-gray-600">{text}</span>
        </div>
    );
}

interface ErrorDisplayProps {
    error: unknown;
    onRetry?: () => void;
    className?: string;
}

export function ErrorDisplay({ error, onRetry, className = '' }: ErrorDisplayProps) {
    const { getErrorMessage } = useApiError();
    const message = getErrorMessage(error);

    return (
        <div className={`flex flex-col items-center justify-center p-4 text-center ${className}`}>
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
            </div>
            <p className="text-sm text-gray-600 mb-3">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}

interface QueryStateProps {
    isLoading: boolean;
    error: unknown;
    onRetry?: () => void;
    children: React.ReactNode;
    loadingText?: string;
    className?: string;
}

export function QueryState({
    isLoading,
    error,
    onRetry,
    children,
    loadingText = 'Loading...',
    className = ''
}: QueryStateProps) {
    if (isLoading) {
        return <LoadingSpinner text={loadingText} />;
    }

    if (error) {
        return <ErrorDisplay error={error} onRetry={onRetry} className={className} />;
    }

    return <>{children}</>;
} 