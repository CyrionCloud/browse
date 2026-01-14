// ============================================
// USER TYPES
// ============================================

export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  subscription_tier: 'free' | 'pro' | 'enterprise'
  created_at: string
  updated_at: string
}

export interface UserProfile extends User {
  usage_quota: {
    monthly_sessions: number
    used_sessions: number
    max_concurrent_sessions: number
  }
  preferences: Record<string, any>
}

// ============================================
// SESSION TYPES
// ============================================

export type SessionStatus = 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled'
export type TaskType = 'research' | 'shopping' | 'job_search' | 'form_filling' | 'monitoring' | 'custom'

export interface BrowserSession {
  id: string
  user_id: string
  status: SessionStatus
  task_description: string
  task_type?: TaskType
  agent_config?: AgentConfig
  result?: any
  error_message?: string
  duration_seconds?: number
  actions_count: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

// ============================================
// AGENT TYPES
// ============================================

export interface AgentConfig {
  model: 'browser-use-llm' | 'claude-sonnet-4.5'
  maxSteps: number
  outputType: 'streaming' | 'batch'
  highlightElements: boolean
  hashMode: boolean
  thinking: boolean
  vision: boolean
  profile: string | null
  proxyLocation: string
  allowedDomains: string[]
  secrets: Record<string, string>
  enabledSkills: string[]
}

// ============================================
// MESSAGE TYPES
// ============================================

export interface ChatMessage {
  id: string
  session_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: {
    action?: string
    url?: string
    screenshot?: string
    error?: string
    [key: string]: any
  }
  created_at: string
}

// ============================================
// WEBSOCKET EVENT TYPES
// ============================================

export type WSEventType =
  | 'session_start'
  | 'session_update'
  | 'session_complete'
  | 'action_executed'
  | 'browser_ready'
  | 'planning'
  | 'plan_ready'
  | 'action_complete'
  | 'task_complete'
  | 'error'
  | 'paused'
  | 'cancelled'

export interface WSEvent {
  type: WSEventType
  sessionId: string
  data: any
  timestamp: string
}

// ============================================
// BROWSER ACTION TYPES
// ============================================

export type ActionType =
  | 'navigate'
  | 'click'
  | 'type'
  | 'scroll'
  | 'extract'
  | 'wait'
  | 'screenshot'
  | 'select'
  | 'hover'
  | 'drag'
  | 'upload'
  | 'download'

export interface BrowserAction {
  id: string
  session_id: string
  action_type: ActionType
  target_selector?: string
  target_description?: string
  input_value?: string
  output_value?: string
  success: boolean
  error_message?: string
  duration_ms: number
  screenshot_url?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface ActionResult {
  success: boolean
  action: string
  target?: string
  value?: string
  screenshot?: Buffer | string
  error?: string
  duration: number
}

// ============================================
// TASK TYPES
// ============================================

export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  task_config: Record<string, any>
  status: 'saved' | 'scheduled' | 'running' | 'completed' | 'failed'
  schedule_cron?: string
  last_run_at?: string
  next_run_at?: string
  run_count: number
  created_at: string
  updated_at: string
}

// ============================================
// SKILL TYPES
// ============================================

export type SkillCategory = 'research' | 'shopping' | 'automation' | 'monitoring' | 'productivity' | 'social'

export interface Skill {
  id: string
  name: string
  slug: string
  description: string
  category: SkillCategory
  icon?: string
  prompt_template: string
  default_config: Record<string, any>
  is_active: boolean
  requires_pro: boolean
  created_at: string
  updated_at: string
}

export interface UserSkill {
  user_id: string
  skill_id: string
  enabled: boolean
  custom_config: Record<string, any>
  usage_count: number
  last_used_at?: string
  created_at: string
}

// ============================================
// ANALYTICS TYPES
// ============================================

export type AnalyticsEventType =
  | 'session_created'
  | 'session_completed'
  | 'action_executed'
  | 'skill_used'
  | 'error_occurred'
  | 'quota_exceeded'

export interface UsageAnalytics {
  id: string
  user_id: string
  event_type: AnalyticsEventType
  event_data: Record<string, any>
  created_at: string
}

export interface SessionStats {
  total_sessions: number
  completed_sessions: number
  failed_sessions: number
  total_actions: number
  avg_duration_seconds: number
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface APIResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
