// src/lib/format.ts
// Centralized formatting utilities for consistent display across the application

/**
 * Format amount with appropriate decimal places and units
 */
export function formatAmount(amount: number, maxDecimals: number = 6): string {
  if (amount >= 1e6) {
    return `${(amount / 1e6).toFixed(2)}M`;
  } else if (amount >= 1e3) {
    return `${(amount / 1e3).toFixed(2)}K`;
  } else if (amount < 0.000001) {
    return amount.toExponential(2);
  } else if (amount < 0.01) {
    return amount.toFixed(Math.min(6, maxDecimals));
  } else if (amount < 1) {
    return amount.toFixed(Math.min(4, maxDecimals));
  } else {
    return amount.toFixed(Math.min(2, maxDecimals));
  }
}

/**
 * Format price with currency symbol and appropriate decimals
 */
export function formatPrice(price: number, currency: string = 'USD', decimals: number = 6): string {
  if (price < 0.000001) {
    return `${currency} ${price.toExponential(2)}`;
  } else if (price < 0.01) {
    return `${currency} ${price.toFixed(Math.min(6, decimals))}`;
  } else if (price < 1) {
    return `${currency} ${price.toFixed(Math.min(4, decimals))}`;
  } else if (price >= 1e6) {
    return `${currency} ${(price / 1e6).toFixed(2)}M`;
  } else if (price >= 1e3) {
    return `${currency} ${(price / 1e3).toFixed(2)}K`;
  } else {
    return `${currency} ${price.toFixed(Math.min(2, decimals))}`;
  }
}

/**
 * Format time interval in human-readable format
 */
export function formatInterval(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days}d`;
  }
}

/**
 * Format time interval with full description
 */
export function formatIntervalFull(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}

/**
 * Format percentage with appropriate decimals
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  if (value < 0.01) {
    return `${value.toFixed(Math.min(4, decimals))}%`;
  } else if (value < 1) {
    return `${value.toFixed(Math.min(3, decimals))}%`;
  } else {
    return `${value.toFixed(Math.min(2, decimals))}%`;
  }
}

/**
 * Format gas price in Gwei
 */
export function formatGasPrice(gasPrice: number): string {
  if (gasPrice < 1) {
    return `${gasPrice.toFixed(3)} Gwei`;
  } else if (gasPrice < 100) {
    return `${gasPrice.toFixed(1)} Gwei`;
  } else {
    return `${gasPrice.toFixed(0)} Gwei`;
  }
}

/**
 * Format gas cost in USD
 */
export function formatGasCost(gasUsed: number, gasPrice: number, ethPrice: number): string {
  const gasCostEth = (gasUsed * gasPrice) / 1e9; // Convert to ETH
  const gasCostUsd = gasCostEth * ethPrice;
  return formatPrice(gasCostUsd, 'USD', 4);
}

/**
 * Format token amount with symbol
 */
export function formatTokenAmount(amount: number, symbol: string, decimals: number = 6): string {
  const formattedAmount = formatAmount(amount, decimals);
  return `${formattedAmount} ${symbol}`;
}

/**
 * Format time until next event
 */
export function formatTimeUntil(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  
  if (diff <= 0) {
    return 'Now';
  }
  
  const seconds = Math.floor(diff / 1000);
  return formatInterval(seconds);
}

/**
 * Format date in a readable format
 */
export function formatDate(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 60) {
    return 'Just now';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format number with compact notation
 */
export function formatCompactNumber(num: number): string {
  if (num < 1000) {
    return num.toString();
  } else if (num < 1000000) {
    return `${(num / 1000).toFixed(1)}K`;
  } else if (num < 1000000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else {
    return `${(num / 1000000000).toFixed(1)}B`;
  }
}

/**
 * Format currency with locale-specific formatting
 */
export function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(amount);
} 

/**
 * Format relative time with timezone support
 */
export function formatRelativeTimeWithTimezone(timestamp: number, timezone: string = 'UTC'): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  
  if (seconds < 0) {
    // Future timestamp - show absolute time instead
    return formatAbsoluteTimeWithTimezone(timestamp, timezone);
  } else if (seconds < 60) {
    return 'Just now';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const remainingMinutes = Math.floor((seconds % 3600) / 60);
    if (remainingMinutes > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} ago`;
    } else {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Format absolute time with timezone
 */
export function formatAbsoluteTimeWithTimezone(timestamp: number, timezone: string = 'UTC'): string {
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    return new Date(timestamp).toLocaleString('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }
} 