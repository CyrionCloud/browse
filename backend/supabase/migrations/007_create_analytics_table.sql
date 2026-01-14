-- ============================================
-- USAGE ANALYTICS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.usage_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'session_created',
        'session_completed',
        'session_failed',
        'action_executed',
        'skill_used',
        'error_occurred',
        'quota_exceeded'
    )),
    event_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_analytics_user_id ON public.usage_analytics(user_id);
CREATE INDEX idx_analytics_event_type ON public.usage_analytics(event_type);
CREATE INDEX idx_analytics_created_at ON public.usage_analytics(created_at DESC);
CREATE INDEX idx_analytics_user_created ON public.usage_analytics(user_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.usage_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view their own analytics
CREATE POLICY "Users can view own analytics"
    ON public.usage_analytics FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert analytics (backend only)
CREATE POLICY "Service can insert analytics"
    ON public.usage_analytics FOR INSERT
    WITH CHECK (true);

-- ============================================
-- PARTITIONING (Optional - for better performance)
-- ============================================

-- Note: Implement partitioning by month for better query performance in production

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.usage_analytics IS 'Usage analytics and event tracking';
COMMENT ON COLUMN public.usage_analytics.event_data IS 'Event-specific data and context';
