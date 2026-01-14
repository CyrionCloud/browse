import axios from 'axios'
import type { BrowserSession, ChatMessage, Skill, AgentConfig, APIResponse } from '@autobrowse/shared'
import { mockSessions, mockMessages, mockSkills, mockActions, createMockSession, createMockMessage } from '../mockData'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

// Check if we should use mock data (backend not available or demo mode)
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Helper to check if backend is available
async function isBackendAvailable(): Promise<boolean> {
  if (USE_MOCK_DATA) return false
  try {
    await api.get('/health', { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

// In-memory store for mock data during session
let mockSessionStore = [...mockSessions]
let mockMessageStore = [...mockMessages]

export const sessionsApi = {
  getAll: async (): Promise<BrowserSession[]> => {
    try {
      const { data } = await api.get<APIResponse<BrowserSession[]>>('/api/sessions')
      return data.data || []
    } catch {
      console.log('Using mock session data')
      return mockSessionStore
    }
  },

  getById: async (id: string): Promise<BrowserSession> => {
    try {
      const { data } = await api.get<APIResponse<BrowserSession>>(`/api/sessions/${id}`)
      if (!data.data) throw new Error(data.error || 'Session not found')
      return data.data
    } catch {
      const session = mockSessionStore.find(s => s.id === id)
      if (!session) throw new Error('Session not found')
      return session
    }
  },

  create: async (taskDescription: string, agentConfig?: AgentConfig): Promise<BrowserSession> => {
    try {
      const { data } = await api.post<APIResponse<BrowserSession>>('/api/sessions', {
        task_description: taskDescription,
        agent_config: agentConfig,
      })
      if (!data.data) throw new Error(data.error || 'Failed to create session')
      return data.data
    } catch {
      console.log('Creating mock session')
      const newSession = createMockSession(taskDescription, agentConfig)
      mockSessionStore = [newSession, ...mockSessionStore]
      return newSession
    }
  },

  start: async (id: string): Promise<void> => {
    try {
      const { data } = await api.post<APIResponse>(`/api/sessions/${id}/start`)
      if (data.error) throw new Error(data.error)
    } catch {
      console.log('Starting mock session:', id)
      const sessionIndex = mockSessionStore.findIndex(s => s.id === id)
      if (sessionIndex >= 0) {
        mockSessionStore[sessionIndex] = {
          ...mockSessionStore[sessionIndex],
          status: 'active',
          started_at: new Date().toISOString(),
        }

        // Simulate session completion after 3 seconds
        setTimeout(() => {
          const idx = mockSessionStore.findIndex(s => s.id === id)
          if (idx >= 0) {
            mockSessionStore[idx] = {
              ...mockSessionStore[idx],
              status: 'completed',
              completed_at: new Date().toISOString(),
              actions_count: Math.floor(Math.random() * 20) + 5,
              duration_seconds: Math.floor(Math.random() * 120) + 30,
            }
          }
        }, 3000)
      }
    }
  },

  pause: async (id: string): Promise<void> => {
    try {
      const { data } = await api.post<APIResponse>(`/api/sessions/${id}/pause`)
      if (data.error) throw new Error(data.error)
    } catch {
      const sessionIndex = mockSessionStore.findIndex(s => s.id === id)
      if (sessionIndex >= 0) {
        mockSessionStore[sessionIndex] = {
          ...mockSessionStore[sessionIndex],
          status: 'paused',
        }
      }
    }
  },

  cancel: async (id: string): Promise<void> => {
    try {
      const { data } = await api.post<APIResponse>(`/api/sessions/${id}/cancel`)
      if (data.error) throw new Error(data.error)
    } catch {
      const sessionIndex = mockSessionStore.findIndex(s => s.id === id)
      if (sessionIndex >= 0) {
        mockSessionStore[sessionIndex] = {
          ...mockSessionStore[sessionIndex],
          status: 'cancelled',
        }
      }
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const { data } = await api.delete<APIResponse>(`/api/sessions/${id}`)
      if (data.error) throw new Error(data.error)
    } catch {
      mockSessionStore = mockSessionStore.filter(s => s.id !== id)
    }
  },

  getActions: async (sessionId: string): Promise<any[]> => {
    try {
      const { data } = await api.get<APIResponse<any[]>>(`/api/sessions/${sessionId}/actions`)
      return data.data || []
    } catch {
      return mockActions.filter(a => a.session_id === sessionId)
    }
  },
}

export const chatApi = {
  sendMessage: async (sessionId: string, content: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> => {
    try {
      const { data } = await api.post<APIResponse<{ userMessage: ChatMessage; assistantMessage: ChatMessage }>>('/api/chat', {
        session_id: sessionId,
        content,
      })
      if (!data.data) throw new Error(data.error || 'Failed to send message')
      return data.data
    } catch {
      console.log('Creating mock chat response')
      const userMsg = createMockMessage(sessionId, 'user', content)
      mockMessageStore.push(userMsg)

      // Generate a mock AI response
      const responses = [
        `I understand you want me to "${content}". Let me analyze this task and plan the necessary browser actions.`,
        `Processing your request: "${content}". I'll navigate to the relevant websites and gather the information you need.`,
        `Got it! I'll work on "${content}". Starting the automation now...`,
      ]
      const assistantContent = responses[Math.floor(Math.random() * responses.length)]
      const assistantMsg = createMockMessage(sessionId, 'assistant', assistantContent)
      mockMessageStore.push(assistantMsg)

      return { userMessage: userMsg, assistantMessage: assistantMsg }
    }
  },

  getMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    try {
      const { data } = await api.get<APIResponse<ChatMessage[]>>(`/api/sessions/${sessionId}/messages`)
      return data.data || []
    } catch {
      return mockMessageStore.filter(m => m.session_id === sessionId)
    }
  },
}

export const skillsApi = {
  getAll: async (): Promise<Skill[]> => {
    try {
      const { data } = await api.get<APIResponse<Skill[]>>('/api/skills')
      return data.data || []
    } catch {
      return mockSkills
    }
  },

  getUserSkills: async (): Promise<Skill[]> => {
    try {
      const { data } = await api.get<APIResponse<Skill[]>>('/api/users/me/skills')
      return data.data || []
    } catch {
      return mockSkills.filter(s => !s.requires_pro)
    }
  },

  toggleSkill: async (skillId: string, enabled: boolean): Promise<void> => {
    try {
      const { data } = await api.put<APIResponse>(`/api/skills/${skillId}/toggle`, { enabled })
      if (data.error) throw new Error(data.error)
    } catch {
      console.log('Mock toggle skill:', skillId, enabled)
    }
  },

  updateSkillConfig: async (skillId: string, config: Record<string, any>): Promise<void> => {
    try {
      const { data } = await api.put<APIResponse>(`/api/skills/${skillId}/config`, config)
      if (data.error) throw new Error(data.error)
    } catch {
      console.log('Mock update skill config:', skillId, config)
    }
  },
}

export const authApi = {
  setToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  },

  clearToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  },

  getToken: (): string | null => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token')
    }
    return null
  },
}

export default api
