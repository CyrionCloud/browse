import axios, { AxiosError } from 'axios'
import type { BrowserSession, ChatMessage, Skill, AgentConfig, APIResponse } from '@autobrowse/shared'
import { supabase } from '../supabase/client'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

// Add auth token from Supabase session to all requests
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
  } catch (error) {
    console.error('Error getting auth session:', error)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the session
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

        if (session && !refreshError) {
          // Update the token and retry the request
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`
          return api(originalRequest)
        }
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr)
      }

      // If refresh failed, check if we should redirect to login
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// Helper to get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    throw new Error('User not authenticated')
  }
  return session.user.id
}

// Helper to extract error message
function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.error || error.response?.data?.message || error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

export const sessionsApi = {
  getAll: async (): Promise<BrowserSession[]> => {
    const userId = await getCurrentUserId()
    const { data } = await api.get<APIResponse<BrowserSession[]>>(`/api/users/${userId}/sessions`)
    return data.data || []
  },

  getById: async (id: string): Promise<BrowserSession> => {
    const { data } = await api.get<APIResponse<BrowserSession>>(`/api/sessions/${id}`)
    if (!data.data) throw new Error(data.error || 'Session not found')
    return data.data
  },

  create: async (taskDescription: string, agentConfig?: AgentConfig): Promise<BrowserSession> => {
    const { data } = await api.post<APIResponse<BrowserSession>>('/api/sessions', {
      task_description: taskDescription,
      agent_config: agentConfig,
    })
    if (!data.data) throw new Error(data.error || 'Failed to create session')
    return data.data
  },

  start: async (id: string): Promise<void> => {
    const { data } = await api.post<{ message: string; sessionId: string }>(`/api/sessions/${id}/start`)
    if (!data.message) throw new Error('Failed to start session')
  },

  pause: async (id: string): Promise<void> => {
    const { data } = await api.post<{ message: string; sessionId: string }>(`/api/sessions/${id}/pause`)
    if (!data.message) throw new Error('Failed to pause session')
  },

  resume: async (id: string): Promise<void> => {
    const { data } = await api.post<{ message: string; sessionId: string }>(`/api/sessions/${id}/resume`)
    if (!data.message) throw new Error('Failed to resume session')
  },

  cancel: async (id: string): Promise<void> => {
    const { data } = await api.post<{ message: string; sessionId: string }>(`/api/sessions/${id}/cancel`)
    if (!data.message) throw new Error('Failed to cancel session')
  },

  delete: async (id: string): Promise<void> => {
    const { data } = await api.delete<APIResponse>(`/api/sessions/${id}`)
    if (data.error) throw new Error(data.error)
  },

  getActions: async (sessionId: string): Promise<any[]> => {
    const { data } = await api.get<APIResponse<any[]>>(`/api/sessions/${sessionId}/actions`)
    return data.data || []
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const { data } = await api.get<APIResponse<ChatMessage[]>>(`/api/sessions/${sessionId}/messages`)
    return data.data || []
  },
}

export const chatApi = {
  sendMessage: async (sessionId: string, content: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> => {
    const { data } = await api.post<APIResponse<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>>('/api/chat', {
      session_id: sessionId,
      content,
    })
    if (!data.data) throw new Error(data.error || 'Failed to send message')
    return data.data
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const { data } = await api.get<APIResponse<ChatMessage[]>>(`/api/sessions/${sessionId}/messages`)
    return data.data || []
  },
}

export const skillsApi = {
  getAll: async (): Promise<Skill[]> => {
    const { data } = await api.get<APIResponse<Skill[]>>('/api/skills')
    return data.data || []
  },

  getUserSkills: async (): Promise<any[]> => {
    const userId = await getCurrentUserId()
    const { data } = await api.get<APIResponse<any[]>>(`/api/users/${userId}/skills`)
    return data.data || []
  },

  toggleSkill: async (skillId: string, enabled: boolean): Promise<void> => {
    const { data } = await api.put<APIResponse>(`/api/skills/${skillId}/toggle`, { enabled })
    if (data.error) throw new Error(data.error)
  },

  updateSkillConfig: async (skillId: string, config: Record<string, any>): Promise<void> => {
    const { data } = await api.put<APIResponse>(`/api/skills/${skillId}/config`, { custom_config: config })
    if (data.error) throw new Error(data.error)
  },
}

// Health check to verify backend connectivity
export const healthApi = {
  check: async (): Promise<boolean> => {
    try {
      await api.get('/health', { timeout: 5000 })
      return true
    } catch {
      return false
    }
  },
}

// Available AI models
export const AVAILABLE_MODELS = {
  'deepseek-chat': { name: 'DeepSeek Chat', provider: 'deepseek' },
  'deepseek-reasoner': { name: 'DeepSeek Reasoner', provider: 'deepseek' },
  'claude-sonnet': { name: 'Claude Sonnet 4.5', provider: 'anthropic' },
  'gpt-4': { name: 'GPT-4', provider: 'openai' },
  'gemini-pro': { name: 'Gemini Pro', provider: 'google' },
} as const

export type ModelId = keyof typeof AVAILABLE_MODELS

export interface UserSettings {
  model: ModelId
  maxSteps: number
  vision: boolean
  thinking: boolean
  highlightElements: boolean
  notifications: boolean
  emailAlerts: boolean
  proxyEnabled: boolean
  proxyLocation: string
}

const DEFAULT_SETTINGS: UserSettings = {
  model: 'deepseek-chat',
  maxSteps: 50,
  vision: true,
  thinking: true,
  highlightElements: true,
  notifications: true,
  emailAlerts: false,
  proxyEnabled: false,
  proxyLocation: 'auto',
}

// Settings API - persists to Supabase profiles table
export const settingsApi = {
  get: async (): Promise<UserSettings> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return DEFAULT_SETTINGS

      const { data, error } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (error || !data?.preferences) {
        return DEFAULT_SETTINGS
      }

      return { ...DEFAULT_SETTINGS, ...data.preferences }
    } catch (error) {
      console.error('Failed to load settings:', error)
      return DEFAULT_SETTINGS
    }
  },

  save: async (settings: Partial<UserSettings>): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    // Get current preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .single()

    const currentPrefs = profile?.preferences || {}
    const updatedPrefs = { ...currentPrefs, ...settings }

    const { error } = await supabase
      .from('profiles')
      .update({ preferences: updatedPrefs, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      console.error('Failed to save settings:', error)
      throw new Error(error.message)
    }
  },

  getDefaultModel: () => 'deepseek-chat' as ModelId,
}

export default api
