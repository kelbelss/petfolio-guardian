import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for our database
export interface User {
  id: string;
  wallet_address: string;
  hippo_name?: string;
  timezone?: string;
  portfolio_tokens?: string[]; // Array of token addresses
  created_at: string;
  updated_at: string;
}

export interface Feed {
  id: string;
  user_id?: string;
  wallet_address: string;
  feed_type: 'swap' | 'recurring';
  src_token: string;
  dst_token: string;
  src_token_symbol?: string;
  dst_token_symbol?: string;
  from_amount?: string;
  to_amount?: string;
  chunk_size: number;
  period: number;
  created_at: string;
  next_fill_time?: string;
  status: 'active' | 'completed' | 'cancelled' | 'failed';
  stop_condition?: 'end-date' | 'total-amount';
  end_date?: string;
  total_amount?: number;
  transaction_hash?: string;
  order_hash?: string;
  metadata: any;
  bot_execution_count: number;
  last_bot_execution?: string;
  bot_execution_errors: any[];
}

export interface UserSettings {
  id: string;
  user_id?: string;
  wallet_address: string;
  slippage_tolerance: number;
  gas_preference: string;
  created_at: string;
  updated_at: string;
}

export interface BotExecution {
  id: string;
  feed_id: string;
  wallet_address: string;
  execution_time: string;
  transaction_hash?: string;
  gas_used?: string;
  gas_price?: string;
  status: 'success' | 'failed' | 'pending';
  error_message?: string;
  execution_metadata: any;
}

// Supabase service class
export class SupabaseService {
  private supabase;

  constructor() {
    this.supabase = supabase;
  }

  // User management
  async createUser(walletAddress: string, hippoName?: string, timezone?: string): Promise<{ data: User | null; error: any }> {
    const { data, error } = await this.supabase
      .from('users')
      .insert({ 
        wallet_address: walletAddress, 
        hippo_name: hippoName,
        timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      .select()
      .single();

    return { data, error };
  }

  async getUser(walletAddress: string): Promise<{ data: User | null; error: any }> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    return { data, error };
  }

  // Feed management
  async createFeed(feedData: Omit<Feed, 'id' | 'created_at'>): Promise<{ data: Feed | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feeds')
      .insert(feedData)
      .select()
      .single();

    return { data, error };
  }

  async getUserFeeds(walletAddress: string): Promise<{ data: Feed[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feeds')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    return { data, error };
  }

  async updateFeed(id: string, updates: Partial<Feed>): Promise<{ data: Feed | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feeds')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  async deleteFeed(id: string): Promise<{ error: any }> {
    const { error } = await this.supabase
      .from('feeds')
      .delete()
      .eq('id', id);

    return { error };
  }

  // User settings
  async getUserSettings(walletAddress: string): Promise<{ data: UserSettings | null; error: any }> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    return { data, error };
  }

  async updateUserSettings(walletAddress: string, updates: Partial<UserSettings>): Promise<{ data: UserSettings | null; error: any }> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .upsert({ wallet_address: walletAddress, ...updates })
      .select()
      .single();

    return { data, error };
  }

  async updateUser(walletAddress: string, updates: Partial<User>): Promise<{ data: User | null; error: any }> {
    const { data, error } = await this.supabase
      .from('users')
      .update(updates)
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    return { data, error };
  }

  // Portfolio token management
  async addPortfolioToken(walletAddress: string, tokenAddress: string): Promise<{ data: User | null; error: any }> {
    // Get current user
    const { data: user, error: getUserError } = await this.getUser(walletAddress);
    if (getUserError) return { data: null, error: getUserError };

    // Get current portfolio tokens or initialize empty array
    const currentTokens = user?.portfolio_tokens || [];
    
    // Add token if not already present
    if (!currentTokens.includes(tokenAddress)) {
      const updatedTokens = [...currentTokens, tokenAddress];
      return this.updateUser(walletAddress, { portfolio_tokens: updatedTokens });
    }

    return { data: user, error: null };
  }

  async removePortfolioToken(walletAddress: string, tokenAddress: string): Promise<{ data: User | null; error: any }> {
    // Get current user
    const { data: user, error: getUserError } = await this.getUser(walletAddress);
    if (getUserError) return { data: null, error: getUserError };

    // Get current portfolio tokens
    const currentTokens = user?.portfolio_tokens || [];
    
    // Remove token
    const updatedTokens = currentTokens.filter(token => token !== tokenAddress);
    return this.updateUser(walletAddress, { portfolio_tokens: updatedTokens });
  }

  // Bot execution logging
  async logBotExecution(executionData: Omit<BotExecution, 'id' | 'execution_time'>): Promise<{ data: BotExecution | null; error: any }> {
    const { data, error } = await this.supabase
      .from('bot_executions')
      .insert(executionData)
      .select()
      .single();

    return { data, error };
  }

  // Real-time subscriptions
  subscribeToUserFeeds(walletAddress: string, callback: (feed: Feed) => void) {
    return this.supabase
      .channel('user-feeds')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feeds',
        filter: `wallet_address=eq.${walletAddress}`
      }, (payload) => {
        callback(payload.new as Feed);
      })
      .subscribe();
  }

  // Analytics
  async getFeedAnalytics(walletAddress: string): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feed_analytics')
      .select('*')
      .eq('wallet_address', walletAddress);

    return { data, error };
  }

  async getBotExecutionAnalytics(walletAddress: string): Promise<{ data: any[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('bot_execution_analytics')
      .select('*')
      .eq('wallet_address', walletAddress);

    return { data, error };
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService(); 