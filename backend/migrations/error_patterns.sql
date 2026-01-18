-- Error Pattern Database Migration
-- Created: 2026-01-18
-- Purpose: Track error patterns and recovery strategies for self-healing agents

-- Table: error_patterns
-- Stores known error patterns and their recovery strategies
CREATE TABLE IF NOT EXISTS error_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_name TEXT NOT NULL UNIQUE,
    error_signature TEXT NOT NULL,
    description TEXT,
    recovery_strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: error_recovery_history
-- Tracks each error occurrence and recovery attempt
CREATE TABLE IF NOT EXISTS error_recovery_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES browser_sessions(id) ON DELETE CASCADE,
    error_pattern_id UUID REFERENCES error_patterns(id),
    error_type TEXT NOT NULL,
    error_message TEXT,
    strategy_used TEXT,
    success BOOLEAN NOT NULL,
    retry_count INTEGER DEFAULT 0,
    context JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_error_recovery_session ON error_recovery_history(session_id);
CREATE INDEX IF NOT EXISTS idx_error_recovery_pattern ON error_recovery_history(error_pattern_id);
CREATE INDEX IF NOT EXISTS idx_error_recovery_created ON error_recovery_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_patterns_name ON error_patterns(pattern_name);

-- View: recovery_success_rates
-- Aggregates success rates per error type and strategy
CREATE OR REPLACE VIEW recovery_success_rates AS
SELECT 
    error_type,
    strategy_used,
    COUNT(*) FILTER (WHERE success = true) * 100.0 / NULLIF(COUNT(*), 0) as success_rate,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE success = true) as successful_attempts,
    COUNT(*) FILTER (WHERE success = false) as failed_attempts
FROM error_recovery_history
WHERE strategy_used IS NOT NULL
GROUP BY error_type, strategy_used
ORDER BY success_rate DESC, total_attempts DESC;

-- Function: update_error_pattern_stats
-- Automatically updates error pattern statistics
CREATE OR REPLACE FUNCTION update_error_pattern_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE error_patterns
    SET 
        total_attempts = (
            SELECT COUNT(*) 
            FROM error_recovery_history 
            WHERE error_pattern_id = NEW.error_pattern_id
        ),
        successful_attempts = (
            SELECT COUNT(*) 
            FROM error_recovery_history 
            WHERE error_pattern_id = NEW.error_pattern_id AND success = true
        ),
        success_rate = (
            SELECT COUNT(*) FILTER (WHERE success = true) * 100.0 / NULLIF(COUNT(*), 0)
            FROM error_recovery_history 
            WHERE error_pattern_id = NEW.error_pattern_id
        ),
        updated_at = NOW()
    WHERE id = NEW.error_pattern_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: update_pattern_stats_trigger
-- Fires after insert on error_recovery_history
CREATE TRIGGER update_pattern_stats_trigger
AFTER INSERT ON error_recovery_history
FOR EACH ROW
EXECUTE FUNCTION update_error_pattern_stats();

-- Function: update_updated_at_timestamp
-- Updates updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: error_patterns_updated_at
CREATE TRIGGER error_patterns_updated_at
BEFORE UPDATE ON error_patterns
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_timestamp();

-- Insert default error patterns
INSERT INTO error_patterns (pattern_name, error_signature, description, recovery_strategies) VALUES
('element_not_found', 'ElementNotFoundError|NoSuchElementException|Element .* not found', 'Target element could not be located on the page', 
 '[
    {"name": "wait_longer", "timeout_ms": 5000, "priority": 1},
    {"name": "scroll_into_view", "scroll_behavior": "smooth", "priority": 2},
    {"name": "use_vision_fallback", "confidence_threshold": 0.7, "priority": 3}
 ]'::jsonb),

('timeout', 'TimeoutError|Timeout.*exceeded|Operation timed out', 'Operation exceeded time limit',
 '[
    {"name": "retry_with_longer_timeout", "timeout_multiplier": 2, "priority": 1},
    {"name": "check_network_idle", "wait_for": "networkidle", "priority": 2},
    {"name": "reload_page", "wait_after_reload_ms": 2000, "priority": 3}
 ]'::jsonb),

('security_challenge', 'Cloudflare|CAPTCHA|reCAPTCHA|Security check', 'Security challenge detected',
 '[
    {"name": "wait_for_manual_intervention", "timeout_s": 60, "priority": 1},
    {"name": "use_different_approach", "alternative_path": true, "priority": 2}
 ]'::jsonb),

('page_load_failure', 'ERR_CONNECTION_REFUSED|ERR_NAME_NOT_RESOLVED|Failed to load', 'Page failed to load',
 '[
    {"name": "retry_navigation", "max_retries": 3, "priority": 1},
    {"name": "check_dns", "fallback_dns": "8.8.8.8", "priority": 2},
    {"name": "use_cached_version", "cache_timeout_s": 300, "priority": 3}
 ]'::jsonb),

('action_execution_failure', 'Click failed|Type failed|Action .* failed', 'Browser action could not be executed',
 '[
    {"name": "wait_and_retry", "wait_ms": 1000, "max_retries": 2, "priority": 1},
    {"name": "use_alternative_selector", "try_vision": true, "priority": 2},
    {"name": "refresh_dom_state", "wait_after_refresh_ms": 500, "priority": 3}
 ]'::jsonb),

('network_error', 'ERR_INTERNET_DISCONNECTED|Network error|Connection lost', 'Network connectivity issue',
 '[
    {"name": "wait_for_reconnection", "timeout_s": 30, "priority": 1},
    {"name": "retry_request", "exponential_backoff": true, "priority": 2}
 ]'::jsonb)

ON CONFLICT (pattern_name) DO NOTHING;

-- Row Level Security (RLS) Policies
ALTER TABLE error_recovery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_patterns ENABLE ROW LEVEL SECURITY;

-- Users can view recovery history for their own sessions
CREATE POLICY "Users can view own error recovery history"
ON error_recovery_history FOR SELECT
USING (
    session_id IN (
        SELECT id FROM browser_sessions WHERE user_id = auth.uid()
    )
);

-- Service role can insert error recovery history
CREATE POLICY "Service role can insert error recovery history"
ON error_recovery_history FOR INSERT
WITH CHECK (true);

-- Everyone can view error patterns (public knowledge)
CREATE POLICY "Error patterns are publicly viewable"
ON error_patterns FOR SELECT
USING (true);

-- Only service role can modify error patterns
CREATE POLICY "Only service role can modify error patterns"
ON error_patterns FOR ALL
USING (auth.role() = 'service_role');

COMMENT ON TABLE error_patterns IS 'Known error patterns and their recovery strategies for self-healing agents';
COMMENT ON TABLE error_recovery_history IS 'Historical record of error occurrences and recovery attempts';
COMMENT ON VIEW recovery_success_rates IS 'Aggregated success rates for error recovery strategies';
