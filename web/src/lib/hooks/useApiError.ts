import { useCallback } from 'react';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export function useApiError() {
  const handleError = useCallback((error: unknown): ApiError => {
    if (error instanceof Error) {
      // Handle network errors
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        return {
          message: 'Network connection failed. Please check your internet connection and try again.',
          code: 'NETWORK_ERROR'
        };
      }

      // Handle CORS errors
      if (error.message && (error.message.includes('CORS') || error.message.includes('cross-origin'))) {
        return {
          message: 'Cross-origin request blocked. Please try again or contact support.',
          code: 'CORS_ERROR'
        };
      }

      // Handle authentication errors
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        return {
          message: 'Authentication failed. Please check your API key configuration.',
          code: 'AUTH_ERROR',
          status: 401
        };
      }

      // Handle rate limiting
      if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests'))) {
        return {
          message: 'Too many requests. Please wait a moment and try again.',
          code: 'RATE_LIMIT_ERROR',
          status: 429
        };
      }

      // Handle server errors
      if (error.message && (error.message.includes('500') || error.message.includes('Internal Server Error'))) {
        return {
          message: 'Server error. Please try again later.',
          code: 'SERVER_ERROR',
          status: 500
        };
      }

      // Handle 1inch API specific errors
      if (error.message && error.message.includes('1inch')) {
        return {
          message: 'Trading service temporarily unavailable. Please try again.',
          code: 'API_ERROR'
        };
      }

      // Default error message
      return {
        message: error.message || 'An unexpected error occurred. Please try again.',
        code: 'UNKNOWN_ERROR'
      };
    }

    // Handle non-Error objects
    if (typeof error === 'string') {
      return {
        message: error,
        code: 'STRING_ERROR'
      };
    }

    return {
      message: 'An unexpected error occurred. Please try again.',
      code: 'UNKNOWN_ERROR'
    };
  }, []);

  const getErrorMessage = useCallback((error: unknown): string => {
    return handleError(error).message;
  }, [handleError]);

  return {
    handleError,
    getErrorMessage
  };
} 