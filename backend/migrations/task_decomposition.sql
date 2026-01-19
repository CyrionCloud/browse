-- Task Decomposition Migration
-- Enables AI-powered breakdown of complex tasks into manageable sub-tasks

-- Task decompositions table
CREATE TABLE IF NOT EXISTS task_decompositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID, -- Optional reference to session
    user_id UUID NOT NULL,
    
    -- Original request
    original_task TEXT NOT NULL,
    
    -- Decomposition
    subtasks JSONB NOT NULL, -- Array of subtask objects
    dependencies JSONB DEFAULT '{}', -- Map of subtask dependencies
    
    -- Progress tracking
    current_subtask_index INTEGER DEFAULT 0,
    completed_subtasks INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    failed_subtasks INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    
    -- Timing
    total_estimated_duration INTEGER, -- seconds
    actual_duration INTEGER, -- seconds
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Subtask execution logs
CREATE TABLE IF NOT EXISTS subtask_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decomposition_id UUID REFERENCES task_decompositions(id) ON DELETE CASCADE,
    subtask_index INTEGER NOT NULL,
    
    -- Subtask details
    subtask_description TEXT NOT NULL,
    expected_outcome TEXT,
    success_criteria TEXT,
    
    -- Execution
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, failed, skipped
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration INTEGER, -- seconds
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Results
    result_data JSONB,
    screenshot_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_decompositions_session ON task_decompositions(session_id);
CREATE INDEX IF NOT EXISTS idx_decompositions_user ON task_decompositions(user_id);
CREATE INDEX IF NOT EXISTS idx_decompositions_created ON task_decompositions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subtask_executions_decomposition ON subtask_executions(decomposition_id);
CREATE INDEX IF NOT EXISTS idx_subtask_executions_status ON subtask_executions(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_decomposition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_decomposition_timestamp ON task_decompositions;
CREATE TRIGGER trigger_update_decomposition_timestamp
    BEFORE UPDATE ON task_decompositions
    FOR EACH ROW
    EXECUTE FUNCTION update_decomposition_updated_at();

-- Enable RLS
ALTER TABLE task_decompositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtask_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for development)
DROP POLICY IF EXISTS "decompositions_select_policy" ON task_decompositions;
DROP POLICY IF EXISTS "decompositions_insert_policy" ON task_decompositions;
DROP POLICY IF EXISTS "decompositions_update_policy" ON task_decompositions;
DROP POLICY IF EXISTS "decompositions_delete_policy" ON task_decompositions;

CREATE POLICY "decompositions_select_policy"
ON task_decompositions FOR SELECT
USING (true);

CREATE POLICY "decompositions_insert_policy"
ON task_decompositions FOR INSERT
WITH CHECK (true);

CREATE POLICY "decompositions_update_policy"
ON task_decompositions FOR UPDATE
USING (true);

CREATE POLICY "decompositions_delete_policy"
ON task_decompositions FOR DELETE
USING (true);

-- Subtask executions RLS
DROP POLICY IF EXISTS "subtask_executions_select_policy" ON subtask_executions;
DROP POLICY IF EXISTS "subtask_executions_insert_policy" ON subtask_executions;
DROP POLICY IF EXISTS "subtask_executions_update_policy" ON subtask_executions;
DROP POLICY IF EXISTS "subtask_executions_delete_policy" ON subtask_executions;

CREATE POLICY "subtask_executions_select_policy"
ON subtask_executions FOR SELECT
USING (true);

CREATE POLICY "subtask_executions_insert_policy"
ON subtask_executions FOR INSERT
WITH CHECK (true);

CREATE POLICY "subtask_executions_update_policy"
ON subtask_executions FOR UPDATE
USING (true);

CREATE POLICY "subtask_executions_delete_policy"
ON subtask_executions FOR DELETE
USING (true);

-- View for active decompositions
CREATE OR REPLACE VIEW active_decompositions AS
SELECT 
    d.*,
    COUNT(se.id) FILTER (WHERE se.status = 'completed') as completed_count,
    COUNT(se.id) FILTER (WHERE se.status = 'failed') as failed_count,
    COUNT(se.id) as total_subtasks
FROM task_decompositions d
LEFT JOIN subtask_executions se ON d.id = se.decomposition_id
WHERE d.completed_at IS NULL
GROUP BY d.id;

-- Verify table creation
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name IN ('task_decompositions', 'subtask_executions')
ORDER BY table_name, ordinal_position;
