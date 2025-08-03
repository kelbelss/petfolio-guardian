-- Migration script to update existing Petfolio Guardian schema for external bot monitoring
-- Run this on your existing Supabase database

-- 1. Add portfolio_tokens array to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS portfolio_tokens TEXT[] DEFAULT '{}';

-- 2. Add new status 'executing' to feeds table
ALTER TABLE feeds 
DROP CONSTRAINT IF EXISTS feeds_status_check;

ALTER TABLE feeds 
ADD CONSTRAINT feeds_status_check 
CHECK (status IN ('active', 'completed', 'cancelled', 'failed', 'executing'));

-- 3. Add new monitoring fields to feeds table
ALTER TABLE feeds 
ADD COLUMN IF NOT EXISTS last_status_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE feeds 
ADD COLUMN IF NOT EXISTS status_change_reason TEXT;

ALTER TABLE feeds 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

ALTER TABLE feeds 
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3;

-- 4. Add new fields to bot_executions table
ALTER TABLE bot_executions 
ADD COLUMN IF NOT EXISTS block_number BIGINT;

ALTER TABLE bot_executions 
ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 0;

ALTER TABLE bot_executions 
ADD COLUMN IF NOT EXISTS execution_duration_ms INTEGER;

ALTER TABLE bot_executions 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 5. Create new indexes for better performance
CREATE INDEX IF NOT EXISTS idx_feeds_status_executing ON feeds(status) WHERE status = 'executing';
CREATE INDEX IF NOT EXISTS idx_feeds_metadata_order ON feeds USING GIN ((metadata->'order'));
CREATE INDEX IF NOT EXISTS idx_feeds_metadata_signature ON feeds USING GIN ((metadata->'signature'));
CREATE INDEX IF NOT EXISTS idx_bot_executions_time ON bot_executions(execution_time);
CREATE INDEX IF NOT EXISTS idx_bot_executions_metadata ON bot_executions USING GIN (execution_metadata);

-- 6. Update existing analytics views
DROP VIEW IF EXISTS feed_analytics;
CREATE VIEW feed_analytics AS
SELECT 
  wallet_address,
  feed_type,
  COUNT(*) as total_feeds,
  SUM(chunk_size) as total_volume,
  AVG(period) as avg_period,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_feeds,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_feeds,
  COUNT(CASE WHEN status = 'executing' THEN 1 END) as executing_feeds,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_feeds,
  SUM(bot_execution_count) as total_executions,
  AVG(retry_count) as avg_retry_count
FROM feeds 
GROUP BY wallet_address, feed_type;

DROP VIEW IF EXISTS bot_execution_analytics;
CREATE VIEW bot_execution_analytics AS
SELECT 
  wallet_address,
  COUNT(*) as total_executions,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_executions,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_executions,
  AVG(CAST(gas_used AS DECIMAL)) as avg_gas_used,
  SUM(CAST(gas_used AS DECIMAL) * CAST(gas_price AS DECIMAL)) as total_gas_cost,
  AVG(execution_duration_ms) as avg_execution_duration_ms,
  AVG(retry_count) as avg_retry_count
FROM bot_executions
GROUP BY wallet_address;

-- 7. Create new system health monitoring view
CREATE VIEW IF NOT EXISTS system_health_metrics AS
SELECT 
  (SELECT COUNT(*) FROM feeds WHERE status = 'active') as active_feeds,
  (SELECT COUNT(*) FROM feeds WHERE status = 'executing') as executing_feeds,
  (SELECT COUNT(*) FROM feeds WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours') as failed_feeds_24h,
  (SELECT COUNT(*) FROM bot_executions WHERE execution_time >= NOW() - INTERVAL '1 hour') as recent_executions_1h,
  (SELECT 
    CASE 
      WHEN COUNT(*) = 0 THEN 0 
      ELSE (COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*))
    END
   FROM bot_executions 
   WHERE execution_time >= NOW() - INTERVAL '1 hour') as success_rate_1h;

-- 8. Update the log_bot_execution function
CREATE OR REPLACE FUNCTION log_bot_execution(
  p_feed_id UUID,
  p_wallet_address TEXT,
  p_transaction_hash TEXT DEFAULT NULL,
  p_gas_used TEXT DEFAULT NULL,
  p_gas_price TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_error_message TEXT DEFAULT NULL,
  p_execution_metadata JSONB DEFAULT '{}'::jsonb,
  p_block_number BIGINT DEFAULT NULL,
  p_confirmations INTEGER DEFAULT 0,
  p_execution_duration_ms INTEGER DEFAULT NULL,
  p_retry_count INTEGER DEFAULT 0
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
    execution_metadata,
    block_number,
    confirmations,
    execution_duration_ms,
    retry_count
  ) VALUES (
    p_feed_id,
    p_wallet_address,
    p_transaction_hash,
    p_gas_used,
    p_gas_price,
    p_status,
    p_error_message,
    p_execution_metadata,
    p_block_number,
    p_confirmations,
    p_execution_duration_ms,
    p_retry_count
  ) RETURNING id INTO execution_id;
  
  -- Update feed execution tracking
  UPDATE feeds 
  SET 
    bot_execution_count = bot_execution_count + 1,
    last_bot_execution = NOW(),
    last_status_change = NOW(),
    retry_count = p_retry_count,
    bot_execution_errors = CASE 
      WHEN p_status = 'failed' THEN 
        bot_execution_errors || jsonb_build_object(
          'timestamp', NOW(), 
          'error', p_error_message,
          'retry_count', p_retry_count,
          'execution_id', execution_id
        )
      ELSE bot_execution_errors
    END
  WHERE id = p_feed_id;
  
  RETURN execution_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Update the get_feeds_for_bot_execution function
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
  bot_execution_count INTEGER,
  retry_count INTEGER,
  max_retries INTEGER
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
    f.bot_execution_count,
    f.retry_count,
    f.max_retries
  FROM feeds f
  WHERE 
    f.feed_type = 'recurring' 
    AND f.status = 'active'
    AND f.next_fill_time <= NOW()
    AND f.metadata->>'order' IS NOT NULL
    AND f.metadata->>'signature' IS NOT NULL
    AND f.retry_count < f.max_retries;
END;
$$ LANGUAGE plpgsql;

-- 10. Create new function to get feeds needing attention
CREATE OR REPLACE FUNCTION get_feeds_needing_attention()
RETURNS TABLE (
  id UUID,
  wallet_address TEXT,
  feed_type TEXT,
  src_token TEXT,
  dst_token TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  last_bot_execution TIMESTAMP WITH TIME ZONE,
  bot_execution_count INTEGER,
  retry_count INTEGER,
  bot_execution_errors JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.wallet_address,
    f.feed_type,
    f.src_token,
    f.dst_token,
    f.status,
    f.created_at,
    f.last_bot_execution,
    f.bot_execution_count,
    f.retry_count,
    f.bot_execution_errors
  FROM feeds f
  WHERE 
    (f.status = 'failed' OR f.status = 'executing')
    AND f.created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 11. Add RLS policies for health_records if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'health_records' 
    AND policyname = 'Users can view own health records'
  ) THEN
    CREATE POLICY "Users can view own health records" ON health_records
      FOR SELECT USING (wallet_address = current_setting('app.wallet_address', true));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'health_records' 
    AND policyname = 'Users can insert own health records'
  ) THEN
    CREATE POLICY "Users can insert own health records" ON health_records
      FOR INSERT WITH CHECK (wallet_address = current_setting('app.wallet_address', true));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'health_records' 
    AND policyname = 'Users can update own health records'
  ) THEN
    CREATE POLICY "Users can update own health records" ON health_records
      FOR UPDATE USING (wallet_address = current_setting('app.wallet_address', true));
  END IF;
END $$;

-- 12. Update existing data to set default values for new columns
UPDATE feeds 
SET 
  last_status_change = created_at,
  retry_count = 0,
  max_retries = 3
WHERE last_status_change IS NULL;

UPDATE bot_executions 
SET 
  confirmations = 0,
  retry_count = 0
WHERE confirmations IS NULL OR retry_count IS NULL;

-- Migration completed successfully!
SELECT 'Migration completed successfully! New features for external bot monitoring are now available.' as status; 