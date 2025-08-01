import { isEthToken, getWethAddress } from './hooks/useContracts';

export interface DcaCalculationParams {
  chunkIn: number;
  totalAmount?: number;
  endDate?: string;
  interval: number;
  slippageTolerance: number;
  quoteAmount?: string;
}

export interface DcaCalculationResult {
  totalCycles: number;
  estimatedDays: number;
  estimatedEndDate: string;
  minOutPerFill: string;
  totalAmountToDca: number;
  willRunForever: boolean;
}

/**
 * Calculate DCA parameters based on stop condition
 */
export function calculateDcaParameters(params: DcaCalculationParams): DcaCalculationResult {
  const { chunkIn, totalAmount, endDate, interval, slippageTolerance, quoteAmount } = params;
  
  let totalCycles = 0;
  let estimatedDays = 0;
  let estimatedEndDate = '';
  let totalAmountToDca = 0;
  let willRunForever = false;

  // Calculate based on stop condition
  if (totalAmount && totalAmount > 0) {
    // Stop by total amount
    totalCycles = Math.ceil(totalAmount / chunkIn);
    totalAmountToDca = totalAmount;
    estimatedDays = Math.ceil((totalCycles * interval) / (24 * 60 * 60));
    estimatedEndDate = new Date(Date.now() + (estimatedDays * 24 * 60 * 60 * 1000)).toISOString();
  } else if (endDate) {
    // Stop by end date
    const endDateUtc = new Date(endDate).getTime();
    const nowUtc = Date.now();
    const totalSeconds = Math.floor((endDateUtc - nowUtc) / 1000);
    
    if (totalSeconds > 0) {
      totalCycles = Math.floor(totalSeconds / interval);
      estimatedDays = Math.ceil(totalSeconds / (24 * 60 * 60));
      totalAmountToDca = totalCycles * chunkIn;
      estimatedEndDate = endDate;
    } else {
      // End date is in the past
      totalCycles = 0;
      estimatedDays = 0;
      totalAmountToDca = 0;
      estimatedEndDate = endDate;
    }
  } else {
    // No stop condition - runs forever
    willRunForever = true;
    totalCycles = 0;
    estimatedDays = 0;
    totalAmountToDca = 0;
    estimatedEndDate = 'Indefinite';
  }

  // Calculate minimum output per fill with slippage protection
  let minOutPerFill = '0';
  if (quoteAmount) {
    const slippageMultiplier = (100 - slippageTolerance) / 100;
    const minOut = (BigInt(quoteAmount) * BigInt(Math.floor(slippageMultiplier * 1000)) / 1000n);
    minOutPerFill = minOut.toString();
  }

  return {
    totalCycles,
    estimatedDays,
    estimatedEndDate,
    minOutPerFill,
    totalAmountToDca,
    willRunForever,
  };
}



/**
 * Format estimated time for display
 */
export function formatEstimatedTime(days: number): string {
  if (days < 1) return 'Less than 1 day';
  if (days === 1) return '1 day';
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  return `${Math.round(days / 365)} years`;
}

/**
 * Get source token for contract (ETH becomes WETH)
 */
export function getSourceTokenForContract(srcTokenAddress: string): string {
  return isEthToken(srcTokenAddress) ? getWethAddress() : srcTokenAddress;
} 