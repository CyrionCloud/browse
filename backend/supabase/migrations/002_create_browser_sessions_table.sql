-- ============================================
-- BROWSER SESSIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.browser_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'completed', 'failed', 'cancelled')),
    task_description TEXT NOT NULL,
    task_type TEXT CHECK (task_type IN ('research', 'shopping', 'job_search', 'form_filling', 'monitoring', 'custom')),
    agent_config JSONB DEFAULT '{}'::jsonb,
    result JSONB,
    error_message TEXT,
    duration_seconds INTEGER,
    actions_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    CONSTRAINT valid_actions_count CHECK (actions_count >= 0),
    CONSTRAINT completed_has_completed_at CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR
        (status != 'completed')
    )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_browser_sessions_user_id ON public.browser_sessions(user_id);
CREATE INDEX idx_browser_sessions_status ON public.browser_sessions(status);
CREATE INDEX idx_browser_sessions_task_type ON public.browser_sessions(task_type);
CREATE INDEX idx_browser_sessions_created_at ON public.browser_sessions(created_at DESC);
CREATE INDEX idx_browser_sessions_user_status ON public.browser_sessions(user_id, status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.browser_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
    ON public.browser_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
    ON public.browser_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
    ON public.browser_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own sessions
CREATE POLICY "Users can delete own sessions"
    ON public.browser_sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_browser_sessions_updated_at
    BEFORE UPDATE ON public.browser_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.browser_sessions IS 'Browser automation sessions with execution details';
COMMENT ON COLUMN public.browser_sessions.agent_config IS 'Agent configuration used for this session';
COMMENT ON COLUMN public.browser_sessions.result IS 'Session execution result data';
COMMENT ON COLUMN public.browser_sessions.metadata IS 'Additional session metadata';
