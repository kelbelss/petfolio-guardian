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

// Type for bot execution errors
export interface BotExecutionError {
  timestamp: string;
  error: string;
  details?: unknown;
  retry_count?: number;
}

// Type for feed metadata
export interface FeedMetadata {
  order?: unknown;
  signature?: unknown;
  twapParams?: unknown;
  aaveParams?: {
    depositToAave: boolean;
    recipient: string;
    aavePool: string;
  };
  [key: string]: unknown;
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
  metadata: FeedMetadata;
  bot_execution_count: number;
  last_bot_execution?: string;
  bot_execution_errors: BotExecutionError[];
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

// Type for health history events
export interface HealthEvent {
  timestamp: string;
  health_change: number;
  reason: string;
  details?: unknown;
}

// Type for bot execution metadata
export interface BotExecutionMetadata {
  gas_estimate?: string;
  slippage_used?: number;
  price_impact?: number;
  route_used?: unknown;
  execution_duration_ms?: number;
  retry_count?: number;
  error_details?: unknown;
  [key: string]: unknown;
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
  execution_metadata: BotExecutionMetadata;
}

export interface HealthRecord {
  id: string;
  wallet_address: string;
  current_health: number;
  last_fed_time: string;
  last_health_update: string;
  health_history: HealthEvent[];
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
  async createUser(walletAddress: string, hippoName?: string, timezone?: string): Promise<{ data: User | null; error: unknown }> {
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

  async getUser(walletAddress: string): Promise<{ data: User | null; error: unknown }> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    return { data, error };
  }

  // Feed management
  async createFeed(feedData: Omit<Feed, 'id' | 'created_at'>): Promise<{ data: Feed | null; error: unknown }> {
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

  // Enhanced feed management for external bot execution
  async getFeedsForExecution(): Promise<{ data: Feed[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feeds')
      .select('*')
      .eq('feed_type', 'recurring')
      .eq('status', 'active')
      .lte('next_fill_time', new Date().toISOString())
      .not('metadata->order', 'is', null)
      .not('metadata->signature', 'is', null);

    return { data, error };
  }

  async updateFeedExecutionStatus(
    feedId: string, 
    updates: {
      status?: 'active' | 'completed' | 'cancelled' | 'failed' | 'executing';
      next_fill_time?: string;
      bot_execution_count?: number;
      last_bot_execution?: string;
      transaction_hash?: string;
      bot_execution_errors?: any[];
      metadata?: any;
    }
  ): Promise<{ data: Feed | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feeds')
      .update(updates)
      .eq('id', feedId)
      .select()
      .single();

    return { data, error };
  }

  // Enhanced bot execution logging with better metadata
  async logBotExecutionWithMetadata(
    executionData: Omit<BotExecution, 'id' | 'execution_time'> & {
      execution_metadata?: {
        gas_estimate?: string;
        slippage_used?: number;
        price_impact?: number;
        route_used?: any;
        execution_duration_ms?: number;
        retry_count?: number;
        error_details?: any;
      };
    }
  ): Promise<{ data: BotExecution | null; error: any }> {
    const { data, error } = await this.supabase
      .from('bot_executions')
      .insert(executionData)
      .select()
      .single();

    return { data, error };
  }

  // Get feeds that need attention (failed, stuck, etc.)
  async getFeedsNeedingAttention(): Promise<{ data: Feed[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feeds')
      .select('*')
      .or('status.eq.failed,status.eq.executing')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

    return { data, error };
  }

  // Batch update multiple feeds (for bot efficiency)
  async batchUpdateFeeds(updates: Array<{ id: string; updates: Partial<Feed> }>): Promise<{ data: Feed[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('feeds')
      .upsert(
        updates.map(({ id, updates: feedUpdates }) => ({ id, ...feedUpdates })),
        { onConflict: 'id' }
      )
      .select();

    return { data, error };
  }

  // Get feed execution history
  async getFeedExecutionHistory(feedId: string): Promise<{ data: BotExecution[] | null; error: any }> {
    const { data, error } = await this.supabase
      .from('bot_executions')
      .select('*')
      .eq('feed_id', feedId)
      .order('execution_time', { ascending: false });

    return { data, error };
  }

  // Enhanced real-time subscriptions with better error handling
  subscribeToFeedUpdates(callback: (feed: Feed) => void, errorCallback?: (error: any) => void) {
    return this.supabase
      .channel('feed-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'feeds'
      }, (payload) => {
        callback(payload.new as Feed);
      })
      .on('error', (error: any) => {
        console.error('Supabase subscription error:', error);
        errorCallback?.(error);
      }, () => {})
      .subscribe();
  }

  // Subscribe to bot execution updates
  subscribeToBotExecutions(callback: (execution: BotExecution) => void, errorCallback?: (error: any) => void) {
    return this.supabase
      .channel('bot-executions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bot_executions'
      }, (payload) => {
        callback(payload.new as BotExecution);
      })
      .on('error', (error: any) => {
        console.error('Supabase subscription error:', error);
        errorCallback?.(error);
      }, () => {})
      .subscribe();
  }

  // Get system health metrics for monitoring
  async getSystemHealthMetrics(): Promise<{ data: any; error: any }> {
    const { data: activeFeeds, error: activeError } = await this.supabase
      .from('feeds')
      .select('status')
      .eq('status', 'active');

    const { data: failedFeeds, error: failedError } = await this.supabase
      .from('feeds')
      .select('status')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const { data: recentExecutions, error: execError } = await this.supabase
      .from('bot_executions')
      .select('status')
      .gte('execution_time', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Last hour

    if (activeError || failedError || execError) {
      return { data: null, error: { activeError, failedError, execError } };
    }

    const metrics = {
      activeFeeds: activeFeeds?.length || 0,
      failedFeeds24h: failedFeeds?.length || 0,
      recentExecutions: recentExecutions?.length || 0,
      successRate: recentExecutions ? 
        (recentExecutions.filter(e => e.status === 'success').length / recentExecutions.length) * 100 : 0
    };

    return { data: metrics, error: null };
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
    
    // Preserve existing health history and only add new events
    const existingHealthHistory = healthRecord.health_history || [];
    const existingDecayEvents = existingHealthHistory.filter(event => 
      event.reason === 'Natural decay'
    );
    
    // Get existing feed events to avoid duplicates
    const existingFeedEvents = existingHealthHistory.filter(event => 
      event.reason !== 'Natural decay'
    );
    
    const healthHistory: any[] = [];

    if (feeds) {
      feeds.forEach(feed => {
        const createdAt = new Date(feed.created_at).getTime();
        
        // Feed creation - differentiate between different feed types
        if (feed.feed_type === 'swap') {
          // Check if health has already been calculated for this swap
          const healthCalculated = feed.metadata?.healthCalculated === true;
          const swapId = feed.metadata?.swapId;
          
          // Check if this feed event already exists in health history
          const feedEventExists = existingFeedEvents.some(event => 
            event.timestamp === new Date(createdAt).toISOString() &&
            event.reason === 'Instant swap' &&
            event.details === `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
          );
          
          if (!healthCalculated && !feedEventExists) {
            // Instant swap - give +1.0 health
            totalHealth += 1.0;
            lastFedTime = Math.max(lastFedTime, createdAt);
            healthHistory.push({
              timestamp: new Date(createdAt).toISOString(),
              health_change: 1.0,
              reason: 'Instant swap',
              details: `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
            });
            
            // Mark this swap as health calculated to prevent duplicates
            console.log(`Health calculated for swap: ${swapId}`);
          } else {
            console.log(`Health already calculated for swap: ${swapId} or event exists`);
          }
        } else if (feed.feed_type === 'recurring') {
          // Check for special DCA types based on metadata
          const isPeerDCA = feed.metadata?.feedType === 'peer-dca';
          const isDCAYield = feed.metadata?.feedType === 'dca-yield';
          const isCustomYield = feed.metadata?.feedType === 'custom-yield';
          
          if (isPeerDCA) {
            // DCA to friend - give +2.0 for social interaction
            totalHealth += 2.0;
            lastFedTime = Math.max(lastFedTime, createdAt);
            healthHistory.push({
              timestamp: new Date(createdAt).toISOString(),
              health_change: 2.0,
              reason: 'Created DCA to friend',
              details: `${feed.src_token_symbol} → ${feed.dst_token_symbol} (Social bonus)`
            });
          } else if (isDCAYield) {
            // DCA Yield - give +3.0 for yield strategy
            totalHealth += 3.0;
            lastFedTime = Math.max(lastFedTime, createdAt);
            healthHistory.push({
              timestamp: new Date(createdAt).toISOString(),
              health_change: 3.0,
              reason: 'Created DCA Yield feed',
              details: `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
            });
          } else {
            // DCA to self - give +1.5 health
            totalHealth += 1.5;
            lastFedTime = Math.max(lastFedTime, createdAt);
            healthHistory.push({
              timestamp: new Date(createdAt).toISOString(),
              health_change: 1.5,
              reason: 'Created DCA to self',
              details: `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
            });
          }
        }

        // Bot executions
        if (feed.bot_execution_count > 0) {
          for (let i = 0; i < feed.bot_execution_count; i++) {
            const executionTime = createdAt + (i * feed.period * 1000);
            
            // Check for special DCA types
            const isPeerDCA = feed.metadata?.feedType === 'peer-dca';
            const isDCAYield = feed.metadata?.feedType === 'dca-yield';
            
            let executionHealth = 0.5; // Default for regular DCA
            let executionReason = 'DCA feed executed';
            
            if (isPeerDCA) {
              executionHealth = 0.5; // Same as regular DCA for now
              executionReason = 'Peer DCA feed executed';
            } else if (isDCAYield) {
              executionHealth = 2.0; // +2.0 per execution for DCA Yield
              executionReason = 'DCA Yield feed executed';
            }
            
            totalHealth += executionHealth;
            lastFedTime = Math.max(lastFedTime, executionTime);
            healthHistory.push({
              timestamp: new Date(executionTime).toISOString(),
              health_change: executionHealth,
              reason: executionReason,
              details: `${feed.src_token_symbol} → ${feed.dst_token_symbol}`
            });
          }
        }

        // Status changes - only add health for DCA feeds, not instant swaps
        if (feed.feed_type === 'recurring') {
          if (feed.status === 'completed') {
            // Only give completion bonus for DCA feeds that have been executed multiple times
            // This prevents double-counting the initial creation + completion
            if (feed.bot_execution_count > 0) {
              totalHealth += 1.0;
              lastFedTime = Math.max(lastFedTime, createdAt);
              healthHistory.push({
                timestamp: new Date(createdAt).toISOString(),
                health_change: 1.0,
                reason: 'DCA feed completed successfully',
                details: `${feed.feed_type} feed finished`
              });
            }
          } else if (feed.status === 'failed') {
            totalHealth -= 1.0;
            lastFedTime = Math.max(lastFedTime, createdAt);
            healthHistory.push({
              timestamp: new Date(createdAt).toISOString(),
              health_change: -1.0,
              reason: 'DCA feed failed',
              details: `${feed.feed_type} feed encountered an error`
            });
          }
        }
      });
    }

    // Mark swaps as health calculated to prevent duplicates
    const swapsToUpdate: Array<{ id: string; updates: Partial<Feed> }> = [];
    if (feeds) {
      feeds.forEach(feed => {
        if (feed.feed_type === 'swap' && 
            feed.metadata?.healthCalculated === false && 
            feed.metadata?.swapId) {
          swapsToUpdate.push({
            id: feed.id,
            updates: {
              metadata: {
                ...feed.metadata,
                healthCalculated: true
              }
            }
          });
        }
      });
    }

    // Apply decay - preserve existing decay events and only add new ones
    const currentTime = Date.now();
    const timeSinceLastFed = currentTime - lastFedTime;
    const decayInterval = 6 * 60 * 60 * 1000; // 6 hours
    const decayCycles = Math.floor(timeSinceLastFed / decayInterval);
    
    // Get the latest decay event timestamp to avoid duplicates
    const latestDecayTime = existingDecayEvents.length > 0 
      ? Math.max(...existingDecayEvents.map(e => new Date(e.timestamp).getTime()))
      : lastFedTime;
    
    if (decayCycles > 0) {
      const totalDecay = decayCycles * 0.5; // 0.5 points per cycle
      totalHealth = Math.max(0, totalHealth - totalDecay);
      
      // Add only new decay events (after the latest existing decay)
      for (let i = 0; i < decayCycles; i++) {
        const decayTime = lastFedTime + (i + 1) * decayInterval;
        
        // Only add if this decay event is newer than the latest existing decay
        if (decayTime > latestDecayTime) {
          healthHistory.push({
            timestamp: new Date(decayTime).toISOString(),
            health_change: -0.5,
            reason: 'Natural decay',
            details: 'No food for 6 hours'
          });
        }
      }
    }
    
    // Add back existing feed events and decay events
    healthHistory.push(...existingFeedEvents);
    healthHistory.push(...existingDecayEvents);

    // Cap health between 0 and 10
    totalHealth = Math.max(0, Math.min(10, totalHealth));

    // Sort history by timestamp (newest first)
    healthHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Update health record
    const updates = {
      current_health: totalHealth,
      last_fed_time: new Date(lastFedTime).toISOString(),
      last_health_update: now,
      health_history: healthHistory,
      updated_at: now
    };

    let result;
    if (!currentHealth) {
      result = await this.createHealthRecord({
        wallet_address: walletAddress,
        current_health: totalHealth,
        last_fed_time: new Date(lastFedTime).toISOString(),
        last_health_update: now,
        health_history: healthHistory
      });
    } else {
      result = await this.updateHealthRecord(walletAddress, updates);
    }

    // Update feeds to mark swaps as health calculated
    if (swapsToUpdate.length > 0) {
      try {
        await this.batchUpdateFeeds(swapsToUpdate);
        console.log(`Updated ${swapsToUpdate.length} swaps as health calculated`);
      } catch (updateError) {
        console.error('Failed to update swap health flags:', updateError);
        // Don't fail the health calculation if feed updates fail
      }
    }

    return result;
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService(); 