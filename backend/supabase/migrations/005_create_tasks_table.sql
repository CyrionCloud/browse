-- ============================================
-- TASKS TABLE (for saved/scheduled tasks)
-- ============================================

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    task_config JSONB NOT NULL,
    status TEXT DEFAULT 'saved' CHECK (status IN ('saved', 'scheduled', 'running', 'completed', 'failed')),
    schedule_cron TEXT,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_run_count CHECK (run_count >= 0),
    CONSTRAINT title_not_empty CHECK (LENGTH(TRIM(title)) > 0),
    CONSTRAINT description_not_empty CHECK (LENGTH(TRIM(description)) > 0),
    CONSTRAINT scheduled_has_cron CHECK (
        (status = 'scheduled' AND schedule_cron IS NOT NULL) OR
        (status != 'scheduled')
    )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_next_run_at ON public.tasks(next_run_at) WHERE status = 'scheduled';
CREATE INDEX idx_tasks_user_status ON public.tasks(user_id, status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tasks
CREATE POLICY "Users can view own tasks"
    ON public.tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
    ON public.tasks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
    ON public.tasks FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.tasks IS 'Saved and scheduled automation tasks';
COMMENT ON COLUMN public.tasks.task_config IS 'Complete task configuration including agent settings';
COMMENT ON COLUMN public.tasks.schedule_cron IS 'Cron expression for scheduled tasks';
