# PHASE 2: DATABASE SCHEMA & SUPABASE SETUP

**Duration:** ~20 minutes  
**Steps:** 16-25

This phase creates all database tables, migrations, Row Level Security policies, and database functions needed for the application.

---

## Step 15: Create Initial Project Documentation

**File:** `README.md` (in root)

**Content:**
```markdown
# 🤖 AutoBrowse - AI-Powered Browser Automation SaaS

> Automate web tasks using natural language with AI-powered browser control

## Overview

AutoBrowse is a SaaS platform that enables users to automate browser tasks through natural language commands powered by AI. It combines the power of Claude AI with browser automation frameworks to execute complex web tasks automatically.

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO
- **Browser Automation:** browser-use, Playwright, Owl
- **Database:** Supabase (PostgreSQL)
- **AI:** Anthropic Claude API (Sonnet 4.5)
- **Deployment:** Vercel (Frontend) + Railway (Backend)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Anthropic API key

### Installation

1. Clone the repository
2. Install dependencies: `npm run install:all`
3. Configure environment variables (see `.env.example` files)
4. Setup Supabase database (run migrations)
5. Run development servers: `npm run dev`

### Development

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- WebSocket: ws://localhost:4000

## Project Structure

```
autobrowse-saas/
├── frontend/          # Next.js 14 application
├── backend/           # Express API server
├── shared/            # Shared TypeScript types
└── docs/              # Documentation
```

## Features

- ✅ Natural language task input
- ✅ Real-time browser automation
- ✅ Session management
- ✅ Pre-built automation skills
- ✅ Advanced agent configuration
- ✅ Usage analytics
- ✅ Multi-user authentication

## License

MIT
```

---

## Step 16: Create Database Migrations Directory

**Action:**
```bash
cd backend
mkdir -p supabase/migrations
```

---

## Step 17: Create Profiles Table Migration

**File:** `backend/supabase/migrations/001_create_profiles_table.sql`

**Content:**
```sql
-- ============================================
-- PROFILES TABLE (extends auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
    usage_quota JSONB DEFAULT jsonb_build_object(
        'monthly_sessions', 10,
        'used_sessions', 0,
        'max_concurrent_sessions', 1
    ),
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_subscription_tier ON public.profiles(subscription_tier);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for new signups)
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================
-- TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles table
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON COLUMN public.profiles.usage_quota IS 'JSON object tracking usage limits and consumption';
COMMENT ON COLUMN public.profiles.preferences IS 'User preferences and settings';
```

---

## Step 18: Create Browser Sessions Table Migration

**File:** `backend/supabase/migrations/002_create_browser_sessions_table.sql`

**Content:**
```sql
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
```

---

## Step 19: Create Chat Messages Table Migration

**File:** `backend/supabase/migrations/003_create_chat_messages_table.sql`

**Content:**
```sql
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
```

---

## Step 20: Create Browser Actions Table Migration

**File:** `backend/supabase/migrations/004_create_browser_actions_table.sql`

**Content:**
```sql
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
```

---

## Step 21: Create Tasks Table Migration

**File:** `backend/supabase/migrations/005_create_tasks_table.sql`

**Content:**
```sql
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
```

---

## Step 22: Create Skills Tables Migration

**File:** `backend/supabase/migrations/006_create_skills_tables.sql`

**Content:**
```sql
-- ============================================
-- SKILLS TABLE (pre-built automation skills)
-- ============================================

CREATE TABLE IF NOT EXISTS public.skills (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('research', 'shopping', 'automation', 'monitoring', 'productivity', 'social')),
    icon TEXT,
    prompt_template TEXT NOT NULL,
    default_config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    requires_pro BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT prompt_template_not_empty CHECK (LENGTH(TRIM(prompt_template)) > 0)
);

-- ============================================
-- USER_SKILLS TABLE (junction table)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_skills (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT true,
    custom_config JSONB DEFAULT '{}'::jsonb,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (user_id, skill_id),
    CONSTRAINT valid_usage_count CHECK (usage_count >= 0)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_skills_category ON public.skills(category);
CREATE INDEX idx_skills_is_active ON public.skills(is_active);
CREATE INDEX idx_skills_slug ON public.skills(slug);
CREATE INDEX idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX idx_user_skills_enabled ON public.user_skills(enabled);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- Anyone can view active skills
CREATE POLICY "Anyone can view active skills"
    ON public.skills FOR SELECT
    USING (is_active = true);

-- Users can view their own skill settings
CREATE POLICY "Users can view own skill settings"
    ON public.user_skills FOR SELECT
    USING (auth.uid() = user_id);

-- Users can manage their own skill settings
CREATE POLICY "Users can insert own skill settings"
    ON public.user_skills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skill settings"
    ON public.user_skills FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_skills_updated_at
    BEFORE UPDATE ON public.skills
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DEFAULT SKILLS
-- ============================================

INSERT INTO public.skills (name, slug, description, category, prompt_template, default_config, requires_pro) VALUES

('Job Search', 'job-search', 'Search for jobs on popular job boards based on your criteria', 'productivity',
 'Search for {job_title} positions in {location} on {job_boards}. Filter by: {criteria}. Extract and organize job listings with company names, salaries, and application links.',
 '{"job_boards": ["LinkedIn", "Indeed", "Glassdoor"], "extract_salary": true}'::jsonb, false),

('Product Research', 'product-research', 'Research and compare products across e-commerce sites', 'shopping',
 'Compare {product_name} across {sites}. Find best prices, customer reviews (rating and count), availability, and shipping options. Create comparison table.',
 '{"sites": ["Amazon", "eBay", "Walmart"], "include_reviews": true}'::jsonb, false),

('Price Monitor', 'price-monitor', 'Monitor price changes for specific products', 'monitoring',
 'Track price for product at {product_url}. Check current price, price history if available. Notify when price drops below {target_price}.',
 '{"check_frequency": "daily", "notify_on_drop": true}'::jsonb, true),

('Data Extraction', 'data-extraction', 'Extract structured data from websites', 'research',
 'Extract {data_fields} from {target_url}. Organize data into structured format ({output_format}). Handle pagination if present.',
 '{"output_format": "json", "handle_pagination": true}'::jsonb, false),

('Form Filler', 'form-filler', 'Automatically fill forms with provided data', 'automation',
 'Navigate to {form_url}. Fill the form with provided data: {form_data}. Handle multi-step forms. Submit if {auto_submit} is true.',
 '{"auto_submit": false, "validate_fields": true}'::jsonb, false),

('Social Media Poster', 'social-media-poster', 'Post content to social media platforms', 'social',
 'Post {content} to {platforms}. Schedule for {schedule} if provided. Add {hashtags} and {media} if specified.',
 '{"platforms": ["Twitter", "LinkedIn"], "add_hashtags": true}'::jsonb, true),

('Email Finder', 'email-finder', 'Find contact information from websites or LinkedIn profiles', 'research',
 'Find email addresses and contact information for {target} from {sources}. Verify email format. Compile into list.',
 '{"sources": ["company_website", "linkedin"], "verify_format": true}'::jsonb, true),

('News Aggregator', 'news-aggregator', 'Aggregate news from multiple sources on specific topics', 'research',
 'Collect news articles about {topic} from {news_sources}. Filter by {date_range}. Summarize key points from each article.',
 '{"news_sources": ["Google News", "Reddit"], "date_range": "last_24h"}'::jsonb, false),

('Screenshot Taker', 'screenshot-taker', 'Take screenshots of websites or specific elements', 'automation',
 'Navigate to {url} and take {screenshot_type} screenshot. Capture {specific_element} if provided. Save with {filename}.',
 '{"screenshot_type": "full_page", "format": "png"}'::jsonb, false),

('Availability Checker', 'availability-checker', 'Check availability of products, appointments, or reservations', 'monitoring',
 'Check availability at {target_url} for {item}. Monitor {schedule}. Alert when available.',
 '{"check_frequency": "hourly", "alert_method": "email"}'::jsonb, true);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.skills IS 'Pre-built automation skill templates';
COMMENT ON TABLE public.user_skills IS 'User-specific skill configurations and usage tracking';
COMMENT ON COLUMN public.skills.prompt_template IS 'Template with placeholders for skill execution';
COMMENT ON COLUMN public.user_skills.custom_config IS 'User-specific overrides for skill configuration';
```

---

## Step 23: Create Usage Analytics Table Migration

**File:** `backend/supabase/migrations/007_create_analytics_table.sql`

**Content:**
```sql
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
```

---

## Step 24: Create Database Functions Migration

**File:** `backend/supabase/migrations/008_create_functions.sql`

**Content:**
```sql
-- ============================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================

-- --------------------------------------------
-- Check if user can create new session
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.can_create_session(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tier TEXT;
    v_quota JSONB;
    v_used INTEGER;
    v_limit INTEGER;
    v_active_sessions INTEGER;
    v_max_concurrent INTEGER;
BEGIN
    -- Get user tier and quota
    SELECT subscription_tier, usage_quota
    INTO v_tier, v_quota
    FROM public.profiles
    WHERE id = p_user_id;
    
    -- Check if user exists
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Get current usage
    v_used := (v_quota->>'used_sessions')::INTEGER;
    v_limit := (v_quota->>'monthly_sessions')::INTEGER;
    v_max_concurrent := (v_quota->>'max_concurrent_sessions')::INTEGER;
    
    -- Check monthly quota
    IF v_used >= v_limit THEN
        RAISE NOTICE 'Monthly quota exceeded: % / %', v_used, v_limit;
        RETURN FALSE;
    END IF;
    
    -- Check concurrent sessions
    SELECT COUNT(*)
    INTO v_active_sessions
    FROM public.browser_sessions
    WHERE user_id = p_user_id
    AND status IN ('active', 'pending');
    
    IF v_active_sessions >= v_max_concurrent THEN
        RAISE NOTICE 'Concurrent session limit reached: % / %', v_active_sessions, v_max_concurrent;
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------
-- Increment usage counter
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET usage_quota = jsonb_set(
        usage_quota,
        '{used_sessions}',
        to_jsonb((COALESCE((usage_quota->>'used_sessions')::INTEGER, 0)) + 1)
    )
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------
-- Reset monthly usage (call via cron)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET usage_quota = jsonb_set(
        usage_quota,
        '{used_sessions}',
        '0'::jsonb
    );
    
    RAISE NOTICE 'Monthly usage reset completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------
-- Get user session statistics
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.get_session_stats(p_user_id UUID)
RETURNS TABLE(
    total_sessions BIGINT,
    completed_sessions BIGINT,
    failed_sessions BIGINT,
    total_actions BIGINT,
    avg_duration_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_sessions,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_sessions,
        COALESCE(SUM(actions_count), 0) as total_actions,
        COALESCE(ROUND(AVG(duration_seconds)::NUMERIC, 2), 0) as avg_duration_seconds
    FROM public.browser_sessions
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------
-- Increment skill usage count
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_skill_usage(
    p_user_id UUID,
    p_skill_id UUID
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_skills (user_id, skill_id, usage_count, last_used_at)
    VALUES (p_user_id, p_skill_id, 1, NOW())
    ON CONFLICT (user_id, skill_id)
    DO UPDATE SET
        usage_count = public.user_skills.usage_count + 1,
        last_used_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------
-- Clean old analytics (call via cron)
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.cleanup_old_analytics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.usage_analytics
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % old analytics records', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.can_create_session(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_skill_usage(UUID, UUID) TO authenticated;

-- Service role only functions
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_monthly_usage() TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_old_analytics() TO service_role;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.can_create_session(UUID) IS 'Check if user can create a new session based on quota and concurrent limits';
COMMENT ON FUNCTION public.increment_usage(UUID) IS 'Increment user session usage counter';
COMMENT ON FUNCTION public.get_session_stats(UUID) IS 'Get aggregated session statistics for a user';
COMMENT ON FUNCTION public.increment_skill_usage(UUID, UUID) IS 'Track skill usage by user';
```

---

## Step 25: Create Supabase Client Libraries

**File:** `frontend/lib/supabase/client.ts`

**Content:**
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const supabase = createClientComponentClient()

export type { User } from '@supabase/supabase-js'
```

**File:** `frontend/lib/supabase/server.ts`

**Content:**
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createClient = () => {
  return createServerComponentClient({ cookies })
}
```

**File:** `frontend/lib/supabase/middleware.ts`

**Content:**
```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function createClient(req: NextRequest, res: NextResponse) {
  return createMiddlewareClient({ req, res })
}
```

**File:** `backend/src/lib/supabase.ts`

**Content:**
```typescript
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Export types
export type { User } from '@supabase/supabase-js'
```

---

## ✅ Phase 2 Complete

All database tables, migrations, RLS policies, functions, and Supabase client libraries have been created.

**Next Steps:**
- Execute all migration files in Supabase SQL Editor (in order 001-008)
- Verify tables were created successfully
- Test RLS policies
- Proceed to Phase 3: Backend Core Architecture
