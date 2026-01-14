import axios from 'axios'
import type { BrowserSession, ChatMessage, Skill, AgentConfig, APIResponse } from '@autobrowse/shared'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const sessionsApi = {
  getAll: async (): Promise<BrowserSession[]> => {
    const { data } = await api.get<APIResponse<BrowserSession[]>>('/api/sessions')
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
    const { data } = await api.post<APIResponse>(`/api/sessions/${id}/start`)
    if (data.error) throw new Error(data.error)
  },

  pause: async (id: string): Promise<void> => {
    const { data } = await api.post<APIResponse>(`/api/sessions/${id}/pause`)
    if (data.error) throw new Error(data.error)
  },

  cancel: async (id: string): Promise<void> => {
    const { data } = await api.post<APIResponse>(`/api/sessions/${id}/cancel`)
    if (data.error) throw new Error(data.error)
  },

  delete: async (id: string): Promise<void> => {
    const { data } = await api.delete<APIResponse>(`/api/sessions/${id}`)
    if (data.error) throw new Error(data.error)
  },

  getActions: async (sessionId: string): Promise<any[]> => {
    const { data } = await api.get<APIResponse<any[]>>(`/api/sessions/${sessionId}/actions`)
    return data.data || []
  },
}

export const chatApi = {
  sendMessage: async (sessionId: string, content: string): Promise<ChatMessage> => {
    const { data } = await api.post<APIResponse<ChatMessage>>('/api/chat', {
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

  getUserSkills: async (): Promise<Skill[]> => {
    const { data } = await api.get<APIResponse<Skill[]>>('/api/users/me/skills')
    return data.data || []
  },

  toggleSkill: async (skillId: string, enabled: boolean): Promise<void> => {
    const { data } = await api.put<APIResponse>(`/api/skills/${skillId}/toggle`, { enabled })
    if (data.error) throw new Error(data.error)
  },

  updateSkillConfig: async (skillId: string, config: Record<string, any>): Promise<void> => {
    const { data } = await api.put<APIResponse>(`/api/skills/${skillId}/config`, config)
    if (data.error) throw new Error(data.error)
  },
}

export const authApi = {
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token)
  },

  clearToken: () => {
    localStorage.removeItem('auth_token')
  },

  getToken: (): string | null => {
    return localStorage.getItem('auth_token')
  },
}

export default api
