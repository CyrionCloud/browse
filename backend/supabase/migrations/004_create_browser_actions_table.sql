-- ============================================
-- BROWSER ACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.browser_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.browser_sessions(id) ON DELETE CASCADE NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN (
        'navigate', 'click', 'type', 'scroll', 'extract', 'wait',
        'screenshot', 'select', 'hover', 'drag', 'upload', 'download'
    )),
    target_selector TEXT,
    target_description TEXT,
    input_value TEXT,
    output_value TEXT,
    success BOOLEAN DEFAULT true NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    screenshot_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_duration CHECK (duration_ms IS NULL OR duration_ms >= 0),
    CONSTRAINT failed_has_error CHECK (
        (success = false AND error_message IS NOT NULL) OR
        (success = true)
    )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_browser_actions_session_id ON public.browser_actions(session_id);
CREATE INDEX idx_browser_actions_created_at ON public.browser_actions(created_at);
CREATE INDEX idx_browser_actions_action_type ON public.browser_actions(action_type);
CREATE INDEX idx_browser_actions_success ON public.browser_actions(success);
CREATE INDEX idx_browser_actions_session_created ON public.browser_actions(session_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.browser_actions ENABLE ROW LEVEL SECURITY;

-- Users can view actions from their own sessions
CREATE POLICY "Users can view actions from own sessions"
    ON public.browser_actions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.browser_sessions
            WHERE browser_sessions.id = browser_actions.session_id
            AND browser_sessions.user_id = auth.uid()
        )
    );

-- Service role can insert actions (backend only)
CREATE POLICY "Service can insert actions"
    ON public.browser_actions FOR INSERT
    WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.browser_actions IS 'Individual browser actions executed during sessions';
COMMENT ON COLUMN public.browser_actions.target_selector IS 'CSS selector or XPath for target element';
COMMENT ON COLUMN public.browser_actions.target_description IS 'Human-readable description of target';
COMMENT ON COLUMN public.browser_actions.metadata IS 'Additional action metadata';
