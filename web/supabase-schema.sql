-- Petfolio Guardian Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (wallet-based auth)
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  hippo_name TEXT,
  timezone TEXT DEFAULT 'UTC', -- Added timezone support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feeds table (DCA orders + swaps)
CREATE TABLE feeds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  feed_type TEXT NOT NULL CHECK (feed_type IN ('swap', 'recurring')),
  
  -- Token info
  src_token TEXT NOT NULL,
  dst_token TEXT NOT NULL,
  src_token_symbol TEXT,
  dst_token_symbol TEXT,
  
  -- Amounts
  from_amount TEXT,
  to_amount TEXT,
  chunk_size DECIMAL,
  
  -- Timing
  period INTEGER DEFAULT 0, -- 0 for swaps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_fill_time TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'failed')),
  
  -- DCA specific
  stop_condition TEXT CHECK (stop_condition IN ('end-date', 'total-amount')),
  end_date TIMESTAMP WITH TIME ZONE,
  total_amount DECIMAL,
  
  -- Blockchain
  transaction_hash TEXT,
  order_hash TEXT,
  
  -- Bot-specific metadata for order execution
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Structure:
  -- {
  --   "order": {
  --     "makerAsset": "0x...",
  --     "takerAsset": "0x...",
  --     "makingAmount": "1000000000000000000",
  --     "takingAmount": "1000000000000000000",
  --     "maker": "0x...",
  --     "salt": "0x...",
  --     "receiver": "0x...",
  --     "allowedSender": "0x...",
  --     "offsets": "0x...",
  --     "interactions": "0x..."
  --   },
  --   "signature": "0x...",
  --   "gas_used": "21000",
  --   "gas_price": "20000000000",
  --   "slippage": 1.0,
  --   "quote_amount": "1000000000000000000",
  --   "protocol_info": {
  --     "name": "Uniswap V3",
  --     "part": 100
  --   }
  -- }
  
  -- Bot execution tracking
  bot_execution_count INTEGER DEFAULT 0,
  last_bot_execution TIMESTAMP WITH TIME ZONE,
  bot_execution_errors JSONB DEFAULT '[]'::jsonb
);

-- User settings table
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  slippage_tolerance DECIMAL DEFAULT 1.0,
  gas_preference TEXT DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bot execution log table
CREATE TABLE bot_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feed_id UUID REFERENCES feeds(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  transaction_hash TEXT,
  gas_used TEXT,
  gas_price TEXT,
  status TEXT CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  execution_metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_feeds_wallet_address ON feeds(wallet_address);
CREATE INDEX idx_feeds_feed_type ON feeds(feed_type);
CREATE INDEX idx_feeds_status ON feeds(status);
CREATE INDEX idx_feeds_created_at ON feeds(created_at);
CREATE INDEX idx_feeds_next_fill_time ON feeds(next_fill_time);
CREATE INDEX idx_feeds_bot_execution ON feeds(bot_execution_count, last_bot_execution);
CREATE INDEX idx_user_settings_wallet_address ON user_settings(wallet_address);
CREATE INDEX idx_bot_executions_feed_id ON bot_executions(feed_id);
CREATE INDEX idx_bot_executions_wallet_address ON bot_executions(wallet_address);
CREATE INDEX idx_bot_executions_status ON bot_executions(status);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_executions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

-- Feeds policies
CREATE POLICY "Users can view own feeds" ON feeds
  FOR SELECT USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own feeds" ON feeds
  FOR INSERT WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own feeds" ON feeds
  FOR UPDATE USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can delete own feeds" ON feeds
  FOR DELETE USING (wallet_address = current_setting('app.wallet_address', true));

-- Bot can access all feeds for execution (no RLS for bot)
CREATE POLICY "Bot can access all feeds" ON feeds
  FOR ALL USING (true);

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (wallet_address = current_setting('app.wallet_address', true));

-- Bot execution policies
CREATE POLICY "Users can view own bot executions" ON bot_executions
  FOR SELECT USING (wallet_address = current_setting('app.wallet_address', true));

CREATE POLICY "Bot can insert executions" ON bot_executions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Bot can update executions" ON bot_executions
  FOR UPDATE USING (true);

-- Analytics view
CREATE VIEW feed_analytics AS
SELECT 
  wallet_address,
  feed_type,
  COUNT(*) as total_feeds,
  SUM(chunk_size) as total_volume,
  AVG(period) as avg_period,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_feeds,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_feeds,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_feeds,
  SUM(bot_execution_count) as total_executions
FROM feeds 
GROUP BY wallet_address, feed_type;

-- Bot execution analytics
CREATE VIEW bot_execution_analytics AS
SELECT 
  wallet_address,
  COUNT(*) as total_executions,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
  AVG(CAST(gas_used AS DECIMAL)) as avg_gas_used,
  SUM(CAST(gas_used AS DECIMAL) * CAST(gas_price AS DECIMAL)) as total_gas_cost
FROM bot_executions
GROUP BY wallet_address;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log bot execution
CREATE OR REPLACE FUNCTION log_bot_execution(
  p_feed_id UUID,
  p_wallet_address TEXT,
  p_transaction_hash TEXT DEFAULT NULL,
  p_gas_used TEXT DEFAULT NULL,
  p_gas_price TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_error_message TEXT DEFAULT NULL,
  p_execution_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  execution_id UUID;
BEGIN
  INSERT INTO bot_executions (
    feed_id,
    wallet_address,
    transaction_hash,
    gas_used,
    gas_price,
    status,
    error_message,
    execution_metadata
  ) VALUES (
    p_feed_id,
    p_wallet_address,
    p_transaction_hash,
    p_gas_used,
    p_gas_price,
    p_status,
    p_error_message,
    p_execution_metadata
  ) RETURNING id INTO execution_id;
  
  -- Update feed execution tracking
  UPDATE feeds 
  SET 
    bot_execution_count = bot_execution_count + 1,
    last_bot_execution = NOW(),
    bot_execution_errors = CASE 
      WHEN p_status = 'failed' THEN 
        bot_execution_errors || jsonb_build_object('timestamp', NOW(), 'error', p_error_message)
      ELSE bot_execution_errors
    END
  WHERE id = p_feed_id;
  
  RETURN execution_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get feeds ready for bot execution
CREATE OR REPLACE FUNCTION get_feeds_for_bot_execution()
RETURNS TABLE (
  id UUID,
  wallet_address TEXT,
  feed_type TEXT,
  src_token TEXT,
  dst_token TEXT,
  chunk_size DECIMAL,
  period INTEGER,
  next_fill_time TIMESTAMP WITH TIME ZONE,
  status TEXT,
  metadata JSONB,
  bot_execution_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.wallet_address,
    f.feed_type,
    f.src_token,
    f.dst_token,
    f.chunk_size,
    f.period,
    f.next_fill_time,
    f.status,
    f.metadata,
    f.bot_execution_count
  FROM feeds f
  WHERE 
    f.feed_type = 'recurring' 
    AND f.status = 'active'
    AND f.next_fill_time <= NOW()
    AND f.metadata->>'order' IS NOT NULL
    AND f.metadata->>'signature' IS NOT NULL;
END;
$$ LANGUAGE plpgsql; 

-- Health Records Table
CREATE TABLE IF NOT EXISTS health_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL UNIQUE,
    current_health DECIMAL(3,1) NOT NULL DEFAULT 8.0,
    last_fed_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_health_update TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    health_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for wallet address lookups
CREATE INDEX IF NOT EXISTS idx_health_records_wallet_address ON health_records(wallet_address);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_health_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_health_records_updated_at
    BEFORE UPDATE ON health_records
    FOR EACH ROW
    EXECUTE FUNCTION update_health_records_updated_at(); 