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
  model: 'autobrowse-llm' | 'claude-sonnet-4.5' | 'claude-opus-4.5' | 'deepseek-v3' | 'deepseek-r1' | 'gemini-2.5-pro' | 'gemini-2.5-flash' | 'gpt-4o' | 'deepseek-chat' | 'deepseek-reasoner' | 'claude-sonnet' | 'gpt-4' | 'gemini-pro'
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
  | 'action_log'
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
  | 'highlight'

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
  description?: string
  screenshot?: Buffer | string
  error?: string
  duration?: number
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

// ============================================
// PYTHON BRIDGE TYPES
// ============================================

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type PythonServiceType = 'browser_use' | 'owl'

export interface PythonMessage {
  id: string
  type: PythonServiceType
  method: string
  params: Record<string, any>
  sessionId?: string
}

export interface PythonResponse {
  id: string
  success: boolean
  data?: any
  error?: string
  sessionId?: string
}

export interface PythonProcessConfig {
  maxProcesses?: number
  timeout?: number
  maxMemoryMB?: number
  maxCpuPercent?: number
}

export interface PythonProcessInfo {
  pid: number
  status: 'running' | 'stopped' | 'crashed'
  startTime: Date
  process: any
  memoryUsageMB?: number
  cpuPercent?: number
}

// ============================================
// BROWSER-USE TYPES
// ============================================

export interface DomTree {
  url: string
  title: string
  elements: DomElement[]
}

export interface DomElement {
  id: string
  tag: string
  text?: string
  attributes: Record<string, string>
  children?: DomElement[]
  coordinates?: { x: number; y: number }
  boundingBox?: { x: number; y: number; width: number; height: number }
}

export interface BrowserUseAction {
  type: ActionType
  description: string
  selector?: string
  coordinates?: { x: number; y: number }
  value?: string
  waitAfter?: number
}

export interface BrowserUseResult {
  success: boolean
  action: string
  description?: string
  screenshot?: string
  extractedData?: any
  error?: string
  duration: number
}

export interface BrowserUseSessionConfig {
  headless: boolean
  viewport: { width: number; height: number }
  userAgent?: string
  proxy?: { server: string; username?: string; password?: string }
  highlightElements: boolean
}

// ============================================
// OWL TYPES
// ============================================

export interface OwlAnalysisResult {
  elements: OwlElement[]
  text: string[]
  layout: OwlLayout
  image_size: { width: number; height: number }
  ml_detection_used: boolean
  timestamp: string
}

export interface OwlElement {
  id: string
  type: string
  boundingBox: BoundingBox
  coordinates: { x: number; y: number }
  confidence: number
  text?: string
  element_class?: number
}

export interface OwlLayout {
  header: BoundingBox | null
  navigation: BoundingBox | null
  main: BoundingBox | null
  sidebar: BoundingBox | null
  footer: BoundingBox | null
}

// Advanced Layout Types
export interface LayoutAnalysis {
  layout_type: 'grid' | 'flex' | 'table' | 'flow' | 'absolute' | 'unknown'
  grids: GridCell[][]
  flex_containers: FlexContainer[]
  tables: TableStructure[]
  semantic_regions: SemanticRegions
  reading_order: string[]
  scrollable_areas: ScrollableArea[]
  image_size: { width: number; height: number }
}

export interface GridCell {
  id: string
  bounding_box: BoundingBox
  row: number
  col: number
  rowspan?: number
  colspan?: number
}

export interface FlexContainer {
  id: string
  bounding_box: BoundingBox
  direction: 'row' | 'column'
  wrap?: boolean
  justify?: string
  align?: string
  children?: string[]
}

export interface TableStructure {
  id: string
  bounding_box: BoundingBox
  rows: number
  cols: number
  headers?: string[]
  cells?: any[]
}

export type SemanticRegion = 'header' | 'navigation' | 'main' | 'sidebar' | 'footer' | 'hero' | 'content' | 'aside' | 'breadcrumb' | 'pagination' | 'unknown'

export interface SemanticRegions {
  header?: BoundingBox
  navigation?: BoundingBox
  main?: BoundingBox
  sidebar?: BoundingBox
  footer?: BoundingBox
  hero?: BoundingBox
  content?: BoundingBox
  aside?: BoundingBox
  breadcrumb?: BoundingBox
  pagination?: BoundingBox
}

export interface ScrollableArea {
  type: 'scrollbar' | 'container'
  bounding_box: BoundingBox
  orientation?: 'vertical' | 'horizontal'
}

export interface OwlConfig {
  ocrEnabled: boolean
  elementDetection: boolean
  layoutAnalysis: boolean
  confidenceThreshold: number
  useMLDetection?: boolean
  ocrEngine?: 'tesseract' | 'easyocr' | 'paddleocr'
  languages?: string[]
  visualizeAssociations?: boolean
}

// UI Element Types for ML Detection
export type UIElementType =
  | 'button'
  | 'input'
  | 'text'
  | 'link'
  | 'icon'
  | 'image'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'slider'
  | 'navigation'
  | 'sidebar'
  | 'header'
  | 'footer'
  | 'container'
  | 'card'
  | 'list'
  | 'table'
  | 'tab'
  | 'menu'
