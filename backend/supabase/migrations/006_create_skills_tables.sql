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
