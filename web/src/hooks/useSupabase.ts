import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService, type Feed, type UserSettings, type User } from '@/lib/supabase';

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
    mutationFn: (walletAddress: string) => supabaseService.createUser(walletAddress),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user', variables] 
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