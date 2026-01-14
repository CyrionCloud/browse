import type { BrowserSession, ChatMessage, Skill } from '@autobrowse/shared'

export const mockSessions: BrowserSession[] = [
  {
    id: 'session-1',
    user_id: 'user-1',
    status: 'completed',
    task_description: 'Research top 10 AI companies and their valuations',
    task_type: 'research',
    actions_count: 15,
    duration_seconds: 120,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3500000).toISOString(),
    started_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 3500000).toISOString(),
  },
  {
    id: 'session-2',
    user_id: 'user-1',
    status: 'completed',
    task_description: 'Extract pricing data from competitor websites',
    task_type: 'research',
    actions_count: 23,
    duration_seconds: 180,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7000000).toISOString(),
    started_at: new Date(Date.now() - 7200000).toISOString(),
    completed_at: new Date(Date.now() - 7000000).toISOString(),
  },
  {
    id: 'session-3',
    user_id: 'user-1',
    status: 'failed',
    task_description: 'Monitor stock prices for tech companies',
    task_type: 'monitoring',
    actions_count: 5,
    error_message: 'Rate limit exceeded on target website',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86300000).toISOString(),
  },
  {
    id: 'session-4',
    user_id: 'user-1',
    status: 'active',
    task_description: 'Scrape job listings from LinkedIn',
    task_type: 'job_search',
    actions_count: 8,
    created_at: new Date(Date.now() - 300000).toISOString(),
    updated_at: new Date().toISOString(),
    started_at: new Date(Date.now() - 300000).toISOString(),
  },
]

export const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    session_id: 'session-1',
    user_id: 'user-1',
    role: 'user',
    content: 'Find the top 10 AI companies by valuation',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'msg-2',
    session_id: 'session-1',
    user_id: 'user-1',
    role: 'assistant',
    content: 'I\'ll search for the top AI companies by valuation. Let me navigate to relevant sources and compile the data for you.',
    metadata: { action: 'planning' },
    created_at: new Date(Date.now() - 3590000).toISOString(),
  },
  {
    id: 'msg-3',
    session_id: 'session-1',
    user_id: 'user-1',
    role: 'assistant',
    content: 'Found the top 10 AI companies:\n\n1. OpenAI - $86B\n2. Anthropic - $18B\n3. Databricks - $43B\n4. Scale AI - $7.3B\n5. Cohere - $5B\n6. Hugging Face - $4.5B\n7. Stability AI - $4B\n8. Inflection AI - $4B\n9. Adept - $1B\n10. Character.AI - $1B',
    metadata: { action: 'completed' },
    created_at: new Date(Date.now() - 3500000).toISOString(),
  },
]

export const mockSkills: Skill[] = [
  {
    id: 'skill-1',
    name: 'Web Research',
    slug: 'web-research',
    description: 'Deep research across multiple websites with intelligent summarization',
    category: 'research',
    icon: 'search',
    prompt_template: 'Research: {{query}}',
    default_config: { maxSources: 10, summarize: true },
    is_active: true,
    requires_pro: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'skill-2',
    name: 'Data Extraction',
    slug: 'data-extraction',
    description: 'Extract structured data from websites into CSV or JSON format',
    category: 'automation',
    icon: 'download',
    prompt_template: 'Extract data from {{url}}',
    default_config: { format: 'json', maxPages: 50 },
    is_active: true,
    requires_pro: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'skill-3',
    name: 'Price Monitoring',
    slug: 'price-monitoring',
    description: 'Monitor product prices and get alerts on changes',
    category: 'monitoring',
    icon: 'dollar-sign',
    prompt_template: 'Monitor price at {{url}}',
    default_config: { interval: '1h', alertOnDrop: true },
    is_active: true,
    requires_pro: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'skill-4',
    name: 'Form Automation',
    slug: 'form-automation',
    description: 'Automatically fill out forms with your saved data',
    category: 'automation',
    icon: 'file-text',
    prompt_template: 'Fill form at {{url}}',
    default_config: { saveCredentials: false },
    is_active: true,
    requires_pro: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'skill-5',
    name: 'Social Media Tracker',
    slug: 'social-tracker',
    description: 'Track mentions and engagement across social platforms',
    category: 'social',
    icon: 'share-2',
    prompt_template: 'Track mentions of {{keyword}}',
    default_config: { platforms: ['twitter', 'linkedin'] },
    is_active: true,
    requires_pro: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'skill-6',
    name: 'Job Search Agent',
    slug: 'job-search',
    description: 'Automated job searching and application tracking',
    category: 'productivity',
    icon: 'briefcase',
    prompt_template: 'Search jobs for {{role}} in {{location}}',
    default_config: { autoApply: false, filterRemote: true },
    is_active: true,
    requires_pro: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export const mockActions = [
  {
    id: 'action-1',
    session_id: 'session-1',
    action_type: 'navigate',
    target_description: 'Forbes AI Companies List',
    success: true,
    duration_ms: 2500,
    created_at: new Date(Date.now() - 3595000).toISOString(),
  },
  {
    id: 'action-2',
    session_id: 'session-1',
    action_type: 'extract',
    target_selector: '.company-list',
    target_description: 'Company names and valuations',
    success: true,
    duration_ms: 1200,
    created_at: new Date(Date.now() - 3590000).toISOString(),
  },
  {
    id: 'action-3',
    session_id: 'session-1',
    action_type: 'navigate',
    target_description: 'TechCrunch AI Funding Report',
    success: true,
    duration_ms: 3100,
    created_at: new Date(Date.now() - 3585000).toISOString(),
  },
]

// Generate a unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

// Create a new mock session
export function createMockSession(taskDescription: string, agentConfig?: any): BrowserSession {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    user_id: 'user-1',
    status: 'pending',
    task_description: taskDescription,
    task_type: 'custom',
    agent_config: agentConfig,
    actions_count: 0,
    created_at: now,
    updated_at: now,
  }
}

// Create a new mock message
export function createMockMessage(sessionId: string, role: 'user' | 'assistant', content: string): ChatMessage {
  return {
    id: generateId(),
    session_id: sessionId,
    user_id: 'user-1',
    role,
    content,
    created_at: new Date().toISOString(),
  }
}
