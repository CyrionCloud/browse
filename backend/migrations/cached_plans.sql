-- Action Cache Migration
-- Enables "Instant Replay" by storing successful execution plans

CREATE TABLE IF NOT EXISTS cached_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Cache Key (Deterministic hash of goal + url)
    cache_key TEXT NOT NULL UNIQUE,
    
    -- Context
    goal TEXT NOT NULL,
    url TEXT NOT NULL,
    
    -- The Plan (List of actions to replay)
    -- Storing as JSONB allows flexibility for different action formats
    actions JSONB NOT NULL,
    
    -- Metadata
    avg_duration_ms INTEGER,
    success_count INTEGER DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cached_plans_key ON cached_plans(cache_key);
CREATE INDEX IF NOT EXISTS idx_cached_plans_url ON cached_plans(url);

-- RLS
ALTER TABLE cached_plans ENABLE ROW LEVEL SECURITY;

-- Policies (Permissive for now, similar to other tables)
DROP POLICY IF EXISTS "cached_plans_select_policy" ON cached_plans;
DROP POLICY IF EXISTS "cached_plans_insert_policy" ON cached_plans;
DROP POLICY IF EXISTS "cached_plans_update_policy" ON cached_plans;
DROP POLICY IF EXISTS "cached_plans_delete_policy" ON cached_plans;

CREATE POLICY "cached_plans_select_policy" ON cached_plans FOR SELECT USING (true);
CREATE POLICY "cached_plans_insert_policy" ON cached_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "cached_plans_update_policy" ON cached_plans FOR UPDATE USING (true);
CREATE POLICY "cached_plans_delete_policy" ON cached_plans FOR DELETE USING (true);
