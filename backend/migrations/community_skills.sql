-- Community Skills Library Migration
-- Created: 2026-01-18
-- Purpose: Enable public skill sharing, importing, forking, and rating

-- Add public sharing fields to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS author_user_id UUID REFERENCES profiles(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS fork_count INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS import_count INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE skills ADD COLUMN IF NOT EXISTS forked_from_id UUID REFERENCES skills(id);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS version TEXT DEFAULT '1.0.0';
ALTER TABLE skills ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create skill_ratings table
CREATE TABLE IF NOT EXISTS skill_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(skill_id, user_id)  -- One rating per user per skill
);

-- Create skill_forks table to track fork relationships
CREATE TABLE IF NOT EXISTS skill_forks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    forked_skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(original_skill_id, forked_skill_id)
);

-- Create skill_imports table to track who imported what
CREATE TABLE IF NOT EXISTS skill_imports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,  -- User can disable imported skills
    UNIQUE(skill_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skills_public ON skills(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_skills_author ON skills(author_user_id);
CREATE INDEX IF NOT EXISTS idx_skills_rating ON skills(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_skills_imports ON skills(import_count DESC);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_skill ON skill_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_ratings_user ON skill_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_forks_original ON skill_forks(original_skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_imports_user ON skill_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_tags ON skills USING gin(tags);

-- Function: update_skill_rating_stats
-- Automatically updates average rating when a new rating is added
CREATE OR REPLACE FUNCTION update_skill_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE skills
    SET 
        rating_avg = (
            SELECT AVG(rating)::DECIMAL(3,2)
            FROM skill_ratings
            WHERE skill_id = NEW.skill_id
        ),
        rating_count = (
            SELECT COUNT(*)
            FROM skill_ratings
            WHERE skill_id = NEW.skill_id
        )
    WHERE id = NEW.skill_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: update_rating_stats_trigger
CREATE TRIGGER update_rating_stats_trigger
AFTER INSERT OR UPDATE OR DELETE ON skill_ratings
FOR EACH ROW
EXECUTE FUNCTION update_skill_rating_stats();

-- Function: increment_fork_count
CREATE OR REPLACE FUNCTION increment_fork_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE skills
    SET fork_count = fork_count + 1
    WHERE id = NEW.original_skill_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: increment_fork_count_trigger
CREATE TRIGGER increment_fork_count_trigger
AFTER INSERT ON skill_forks
FOR EACH ROW
EXECUTE FUNCTION increment_fork_count();

-- Function: increment_import_count
CREATE OR REPLACE FUNCTION increment_import_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE skills
        SET import_count = import_count + 1
        WHERE id = NEW.skill_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: increment_import_count_trigger
CREATE TRIGGER increment_import_count_trigger
AFTER INSERT ON skill_imports
FOR EACH ROW
EXECUTE FUNCTION increment_import_count();

-- Function: decrement_import_count_on_deactivate
CREATE OR REPLACE FUNCTION decrement_import_count_on_deactivate()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_active = true AND NEW.is_active = false THEN
        UPDATE skills
        SET import_count = import_count - 1
        WHERE id = NEW.skill_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
        UPDATE skills
        SET import_count = import_count + 1
        WHERE id = NEW.skill_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: decrement_import_count_trigger
CREATE TRIGGER decrement_import_count_trigger
AFTER UPDATE ON skill_imports
FOR EACH ROW
EXECUTE FUNCTION decrement_import_count_on_deactivate();

-- Views for analytics

-- View: popular_skills
CREATE OR REPLACE VIEW popular_skills AS
SELECT 
    s.*,
    p.email as author_email,
    p.full_name as author_name
FROM skills s
LEFT JOIN profiles p ON s.author_user_id = p.id
WHERE s.is_public = true
ORDER BY s.import_count DESC, s.rating_avg DESC
LIMIT 100;

-- View: trending_skills (imported in last 7 days)
CREATE OR REPLACE VIEW trending_skills AS
SELECT 
    s.*,
    p.email as author_email,
    p.full_name as author_name,
    COUNT(si.id) as recent_imports
FROM skills s
LEFT JOIN profiles p ON s.author_user_id = p.id
LEFT JOIN skill_imports si ON s.id = si.skill_id AND si.imported_at > NOW() - INTERVAL '7 days'
WHERE s.is_public = true
GROUP BY s.id, p.email, p.full_name
ORDER BY recent_imports DESC, s.rating_avg DESC
LIMIT 100;

-- View: top_rated_skills
CREATE OR REPLACE VIEW top_rated_skills AS
SELECT 
    s.*,
    p.email as author_email,
    p.full_name as author_name
FROM skills s
LEFT JOIN profiles p ON s.author_user_id = p.id
WHERE s.is_public = true AND s.rating_count >= 3  -- Minimum 3 ratings
ORDER BY s.rating_avg DESC, s.rating_count DESC
LIMIT 100;

-- Row Level Security (RLS) Policies

ALTER TABLE skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_forks ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_imports ENABLE ROW LEVEL SECURITY;

-- Users can view all public skill ratings
CREATE POLICY "Skill ratings are publicly viewable"
ON skill_ratings FOR SELECT
USING (true);

-- Users can only insert/update/delete their own ratings
CREATE POLICY "Users can manage own ratings"
ON skill_ratings FOR ALL
USING (auth.uid() = user_id);

-- Users can view all skill forks
CREATE POLICY "Skill forks are publicly viewable"
ON skill_forks FOR SELECT
USING (true);

-- Users can only create forks for themselves
CREATE POLICY "Users can create own forks"
ON skill_forks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own imports
CREATE POLICY "Users can view own imports"
ON skill_imports FOR SELECT
USING (auth.uid() = user_id);

-- Users can manage their own imports
CREATE POLICY "Users can manage own imports"
ON skill_imports FOR ALL
USING (auth.uid() = user_id);

-- Insert some example public skills for testing
INSERT INTO skills (name, slug, description, category, icon, prompt_template, default_config, is_active, requires_pro, is_public, author_user_id, tags)
VALUES 
(
    'LinkedIn Profile Scraper',
    'linkedin-profile-scraper',
    'Extract profile information from LinkedIn including name, headline, experience, and skills',
    'research',
    '🔍',
    'Go to {profile_url} and extract: name, headline, current company, experience, education, skills',
    '{"wait_for_load": true, "screenshot_results": true}'::jsonb,
    true,
    false,
    true,
    NULL,  -- Will be set to actual user ID
    ARRAY['linkedin', 'scraping', 'research', 'profile']
),
(
    'Amazon Price Tracker',
    'amazon-price-tracker',
    'Monitor Amazon product prices and get alerts on price drops',
    'shopping',
    '🛒',
    'Navigate to {product_url}, extract current price, compare with target price {target_price}, notify if lower',
    '{"check_interval_hours": 6, "notify_on_drop": true}'::jsonb,
    true,
    false,
    true,
    NULL,
    ARRAY['amazon', 'shopping', 'price', 'monitoring']
),
(
    'Gmail Inbox Cleaner',
    'gmail-inbox-cleaner',
    'Automatically archive or delete emails based on rules (age, sender, subject)',
    'productivity',
    '📧',
    'Login to Gmail, filter emails by {criteria}, perform {action} (archive/delete/label)',
    '{"criteria": "older_than_30_days", "action": "archive"}'::jsonb,
    true,
    true,
    true,
    NULL,
    ARRAY['gmail', 'email', 'productivity', 'cleanup']
)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE skill_ratings IS 'User ratings and reviews for community skills';
COMMENT ON TABLE skill_forks IS 'Tracks fork relationships between skills';
COMMENT ON TABLE skill_imports IS 'Tracks which users have imported which skills';
COMMENT ON VIEW popular_skills IS 'Most imported public skills';
COMMENT ON VIEW trending_skills IS 'Skills with most imports in last 7 days';
COMMENT ON VIEW top_rated_skills IS 'Highest rated skills (min 3 ratings)';
