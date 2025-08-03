import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService, type Feed, type UserSettings, type User, type BotExecution } from '@/lib/supabase';

// Hook for user feeds
export const useUserFeeds = (walletAddress: string) => {
  return useQuery({
    queryKey: ['feeds', walletAddress],
    queryFn: () => supabaseService.getUserFeeds(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 30, // 30 seconds
  });
};

// Hook for creating feeds
export const useCreateFeed = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (feedData: Omit<Feed, 'id' | 'created_at'>) => 
      supabaseService.createFeed(feedData),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['feeds', variables.wallet_address] 
      });
    },
  });
};

// Hook for updating feeds
export const useUpdateFeed = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Feed> }) =>
      supabaseService.updateFeed(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['feeds'] 
      });
    },
  });
};

// Hook for deleting feeds
export const useDeleteFeed = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => supabaseService.deleteFeed(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['feeds'] 
      });
    },
  });
};

// Hook for user settings
export const useUserSettings = (walletAddress: string) => {
  return useQuery({
    queryKey: ['user-settings', walletAddress],
    queryFn: () => supabaseService.getUserSettings(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for updating user settings
export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ walletAddress, updates }: { 
      walletAddress: string; 
      updates: Partial<UserSettings> 
    }) => supabaseService.updateUserSettings(walletAddress, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-settings', variables.walletAddress] 
      });
    },
  });
};

// Hook for user management
export const useUser = (walletAddress: string) => {
  return useQuery({
    queryKey: ['user', walletAddress],
    queryFn: () => supabaseService.getUser(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Hook for creating users
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ walletAddress, hippoName, timezone }: {
      walletAddress: string;
      hippoName?: string;
      timezone?: string;
    }) => supabaseService.createUser(walletAddress, hippoName, timezone),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user', variables.walletAddress] 
      });
    },
  });
};

// Hook for updating users
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ walletAddress, updates }: { 
      walletAddress: string; 
      updates: Partial<User> 
    }) => supabaseService.updateUser(walletAddress, updates),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user', variables.walletAddress] 
      });
    },
  });
};

// Hook for adding portfolio tokens
export const useAddPortfolioToken = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ walletAddress, tokenAddress }: { 
      walletAddress: string; 
      tokenAddress: string; 
    }) => supabaseService.addPortfolioToken(walletAddress, tokenAddress),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user', variables.walletAddress] 
      });
    },
  });
};

// Hook for removing portfolio tokens
export const useRemovePortfolioToken = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ walletAddress, tokenAddress }: { 
      walletAddress: string; 
      tokenAddress: string; 
    }) => supabaseService.removePortfolioToken(walletAddress, tokenAddress),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user', variables.walletAddress] 
      });
    },
  });
};

// Hook for feed analytics
export const useFeedAnalytics = (walletAddress: string) => {
  return useQuery({
    queryKey: ['feed-analytics', walletAddress],
    queryFn: () => supabaseService.getFeedAnalytics(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for bot execution analytics
export const useBotExecutionAnalytics = (walletAddress: string) => {
  return useQuery({
    queryKey: ['bot-execution-analytics', walletAddress],
    queryFn: () => supabaseService.getBotExecutionAnalytics(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Health management hooks
export const useHealthRecord = (walletAddress: string) => {
  return useQuery({
    queryKey: ['health-record', walletAddress],
    queryFn: () => supabaseService.getHealthRecord(walletAddress),
    enabled: !!walletAddress,
    staleTime: 1000 * 30, // 30 seconds
  });
};

export const useCalculateAndUpdateHealth = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (walletAddress: string) => 
      supabaseService.calculateAndUpdateHealth(walletAddress),
    onSuccess: (data, walletAddress) => {
      queryClient.invalidateQueries({ 
        queryKey: ['health-record', walletAddress] 
      });
    },
  });
}; 

// Hook for getting feeds ready for execution (for external bots)
export const useFeedsForExecution = () => {
  return useQuery({
    queryKey: ['feeds-for-execution'],
    queryFn: () => supabaseService.getFeedsForExecution(),
    staleTime: 1000 * 10, // 10 seconds - very fresh data for bots
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
};

// Hook for updating feed execution status
export const useUpdateFeedExecutionStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ feedId, updates }: { 
      feedId: string; 
      updates: {
        status?: 'active' | 'completed' | 'cancelled' | 'failed' | 'executing';
        next_fill_time?: string;
        bot_execution_count?: number;
        last_bot_execution?: string;
        transaction_hash?: string;
        bot_execution_errors?: unknown[];
        metadata?: unknown;
      };
    }) => supabaseService.updateFeedExecutionStatus(feedId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['feeds-for-execution'] });
    },
  });
};

// Hook for enhanced bot execution logging
export const useLogBotExecutionWithMetadata = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (executionData: Omit<BotExecution, 'id' | 'execution_time'> & {
      execution_metadata?: {
        gas_estimate?: string;
        slippage_used?: number;
        price_impact?: number;
        route_used?: unknown;
        execution_duration_ms?: number;
        retry_count?: number;
        error_details?: unknown;
      };
    }) => supabaseService.logBotExecutionWithMetadata(executionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-execution-analytics'] });
    },
  });
};

// Hook for getting feeds that need attention
export const useFeedsNeedingAttention = () => {
  return useQuery({
    queryKey: ['feeds-needing-attention'],
    queryFn: () => supabaseService.getFeedsNeedingAttention(),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
};

// Hook for batch updating feeds
export const useBatchUpdateFeeds = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updates: Array<{ id: string; updates: Partial<Feed> }>) => 
      supabaseService.batchUpdateFeeds(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeds'] });
      queryClient.invalidateQueries({ queryKey: ['feeds-for-execution'] });
    },
  });
};

// Hook for getting feed execution history
export const useFeedExecutionHistory = (feedId: string) => {
  return useQuery({
    queryKey: ['feed-execution-history', feedId],
    queryFn: () => supabaseService.getFeedExecutionHistory(feedId),
    enabled: !!feedId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// Hook for system health metrics
export const useSystemHealthMetrics = () => {
  return useQuery({
    queryKey: ['system-health-metrics'],
    queryFn: () => supabaseService.getSystemHealthMetrics(),
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });
}; 