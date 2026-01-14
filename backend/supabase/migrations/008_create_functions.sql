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
