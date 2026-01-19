-- Session Templates Migration
-- Allows users to save frequently used automation configurations as templates

-- Create session_templates table
CREATE TABLE IF NOT EXISTS session_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Template content
    task_description TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    selected_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Metadata
    use_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_template_name UNIQUE(user_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON session_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_last_used ON session_templates(last_used_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_templates_use_count ON session_templates(use_count DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_template_timestamp ON session_templates;
CREATE TRIGGER trigger_update_template_timestamp
    BEFORE UPDATE ON session_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_template_updated_at();

-- Enable RLS
ALTER TABLE session_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for development)
DROP POLICY IF EXISTS "Allow viewing templates" ON session_templates;
DROP POLICY IF EXISTS "Allow creating templates" ON session_templates;
DROP POLICY IF EXISTS "Allow updating templates" ON session_templates;
DROP POLICY IF EXISTS "Allow deleting templates" ON session_templates;

CREATE POLICY "Allow viewing templates"
ON session_templates FOR SELECT
USING (true);

CREATE POLICY "Allow creating templates"
ON session_templates FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow updating templates"
ON session_templates FOR UPDATE
USING (true);

CREATE POLICY "Allow deleting templates"
ON session_templates FOR DELETE
USING (true);

-- View for popular templates (for future features)
CREATE OR REPLACE VIEW popular_templates AS
SELECT 
    id,
    user_id,
    name,
    description,
    use_count,
    last_used_at,
    created_at
FROM session_templates
WHERE use_count > 0
ORDER BY use_count DESC
LIMIT 100;

-- Example template data (optional - for testing)
INSERT INTO session_templates (user_id, name, description, task_description, config, selected_skills)
VALUES 
    (
        '00000000-0000-0000-0000-000000000000',
        'Daily LinkedIn Scrape',
        'Extract profiles from LinkedIn search results',
        'Search for "Software Engineer in San Francisco" on LinkedIn and extract the first 10 profiles including name, headline, company, and location',
        '{"max_results": 10, "location": "San Francisco", "job_title": "Software Engineer"}',
        ARRAY['linkedin-scraper']
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'Price Monitor',
        'Track Amazon product prices',
        'Monitor price for ASIN B08N5WRWNW and notify if it drops below $100',
        '{"asin": "B08N5WRWNW", "target_price": 100, "check_interval": "daily"}',
        ARRAY['amazon-price-tracker']
    )
ON CONFLICT (user_id, name) DO NOTHING;

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'session_templates'
ORDER BY ordinal_position;
