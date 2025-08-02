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

export interface HealthRecord {
  id: string;
  wallet_address: string;
  current_health: number;
  last_fed_time: string;
  last_health_update: string;
  health_history: any[];
  created_at: string;
  updated_at: string;
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

  // Health management
  async getHealthRecord(walletAddress: string): Promise<{ data: HealthRecord | null; error: any }> {
    const { data, error } = await this.supabase
      .from('health_records')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    return { data, error };
  }

  async createHealthRecord(healthData: Omit<HealthRecord, 'id' | 'created_at' | 'updated_at'>): Promise<{ data: HealthRecord | null; error: any }> {
    const { data, error } = await this.supabase
      .from('health_records')
      .insert(healthData)
      .select()
      .single();

    return { data, error };
  }

  async updateHealthRecord(walletAddress: string, updates: Partial<HealthRecord>): Promise<{ data: HealthRecord | null; error: any }> {
    const { data, error } = await this.supabase
      .from('health_records')
      .update(updates)
      .eq('wallet_address', walletAddress)
      .select()
      .single();

    return { data, error };
  }

  async calculateAndUpdateHealth(walletAddress: string): Promise<{ data: HealthRecord | null; error: any }> {
    // First, get all user feeds
    const { data: feeds, error: feedsError } = await this.getUserFeeds(walletAddress);
    if (feedsError) return { data: null, error: feedsError };

    // Get current health record
    const { data: currentHealth, error: healthError } = await this.getHealthRecord(walletAddress);
    
    let healthRecord: HealthRecord;
    const now = new Date().toISOString();

    if (!currentHealth) {
      // Create new health record
      healthRecord = {
        id: '',
        wallet_address: walletAddress,
        current_health: 8.0,
        last_fed_time: now,
        last_health_update: now,
        health_history: [],
        created_at: now,
        updated_at: now
      };
    } else {
      healthRecord = currentHealth;
    }

    // Calculate health based on feeds
    let totalHealth = 8.0;
    let lastFedTime = new Date(healthRecord.last_fed_time).getTime();
    const healthHistory: any[] = [];

    if (feeds) {
      feeds.forEach(feed => {
        const createdAt = new Date(feed.created_at).getTime();
        
        // Feed creation - differentiate between instant swaps and DCA feeds
        if (feed.feed_type === 'swap') {
          // Instant swap - give +1.0 health
          totalHealth += 1.0;
          lastFedTime = Math.max(lastFedTime, createdAt);
          healthHistory.push({
            timestamp: createdAt,
            healthChange: 1.0,
            reason: 'Instant swap',
            details: `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
          });
        } else {
          // DCA feed creation - give +0.5 health
          totalHealth += 0.5;
          lastFedTime = Math.max(lastFedTime, createdAt);
          healthHistory.push({
            timestamp: createdAt,
            healthChange: 0.5,
            reason: 'Created DCA feed',
            details: `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
          });
        }

        // Bot executions
        if (feed.bot_execution_count > 0) {
          for (let i = 0; i < feed.bot_execution_count; i++) {
            const executionTime = createdAt + (i * feed.period * 1000);
            totalHealth += 0.5;
            lastFedTime = Math.max(lastFedTime, executionTime);
            healthHistory.push({
              timestamp: executionTime,
              healthChange: 0.5,
              reason: 'DCA feed executed',
              details: `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
            });
          }
        }

        // Status changes
        if (feed.status === 'completed') {
          totalHealth += 1.0;
          lastFedTime = Math.max(lastFedTime, createdAt);
          healthHistory.push({
            timestamp: createdAt,
            healthChange: 1.0,
            reason: 'Feed completed successfully',
            details: `${feed.feed_type} feed finished`
          });
        } else if (feed.status === 'failed') {
          totalHealth -= 1.0;
          lastFedTime = Math.max(lastFedTime, createdAt);
          healthHistory.push({
            timestamp: createdAt,
            healthChange: -1.0,
            reason: 'Feed failed',
            details: `${feed.feed_type} feed encountered an error`
          });
        }
      });
    }

    // Apply decay
    const currentTime = Date.now();
    const timeSinceLastFed = currentTime - lastFedTime;
    const decayInterval = 6 * 60 * 60 * 1000; // 6 hours
    const decayCycles = Math.floor(timeSinceLastFed / decayInterval);
    
    if (decayCycles > 0) {
      const totalDecay = decayCycles * 0.5; // 0.5 points per cycle
      totalHealth = Math.max(0, totalHealth - totalDecay);
      
      // Add decay events
      for (let i = 0; i < decayCycles; i++) {
        const decayTime = lastFedTime + (i + 1) * decayInterval;
        healthHistory.push({
          timestamp: decayTime,
          healthChange: -0.5,
          reason: 'Natural decay',
          details: 'No food for 6 hours'
        });
      }
    }

    // Cap health between 0 and 10
    totalHealth = Math.max(0, Math.min(10, totalHealth));

    // Sort history by timestamp (newest first)
    healthHistory.sort((a, b) => b.timestamp - a.timestamp);

    // Update health record
    const updates = {
      current_health: totalHealth,
      last_fed_time: new Date(lastFedTime).toISOString(),
      last_health_update: now,
      health_history: healthHistory,
      updated_at: now
    };

    if (!currentHealth) {
      return this.createHealthRecord({
        wallet_address: walletAddress,
        current_health: totalHealth,
        last_fed_time: new Date(lastFedTime).toISOString(),
        last_health_update: now,
        health_history: healthHistory
      });
    } else {
      return this.updateHealthRecord(walletAddress, updates);
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService(); 