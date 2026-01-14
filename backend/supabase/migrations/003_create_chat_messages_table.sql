-- ============================================
-- CHAT MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES public.browser_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX idx_chat_messages_session_created ON public.chat_messages(session_id, created_at);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages from their own sessions
CREATE POLICY "Users can view messages from own sessions"
    ON public.chat_messages FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.browser_sessions
            WHERE browser_sessions.id = chat_messages.session_id
            AND browser_sessions.user_id = auth.uid()
        )
    );

-- Users can insert messages to their own sessions
CREATE POLICY "Users can insert messages to own sessions"
    ON public.chat_messages FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.browser_sessions
            WHERE browser_sessions.id = chat_messages.session_id
            AND browser_sessions.user_id = auth.uid()
        )
    );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.chat_messages IS 'Chat messages between user and AI agent';
COMMENT ON COLUMN public.chat_messages.metadata IS 'Additional message metadata like actions, URLs, screenshots';
