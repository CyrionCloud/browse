import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { BrowserSession, ChatMessage, Skill, WSEvent, AgentConfig } from '@autobrowse/shared'

export type UserProfile = SupabaseUser & {
  subscription_tier?: 'free' | 'pro' | 'enterprise'
  created_at?: string
  updated_at?: string
}

const defaultAgentConfig: AgentConfig = {
  model: 'autobrowse-llm',
  maxSteps: 50,
  outputType: 'streaming',
  highlightElements: true,
  hashMode: false,
  thinking: true,
  vision: true,
  profile: null,
  proxyLocation: '',
  allowedDomains: [],
  secrets: {},
  enabledSkills: [],
}

// Per-session data for screenshots and timeline (persisted across navigation)
export interface SessionDataEntry {
  screenshot: string | null
  timeline: any[]
  actions: any[]
}

interface AppState {
  user: UserProfile | null
  sessions: BrowserSession[]
  currentSession: BrowserSession | null
  messages: ChatMessage[]
  skills: Skill[]
  wsConnected: boolean
  wsEvents: WSEvent[]
  isLoading: boolean
  error: string | null
  agentConfig: AgentConfig
  sessionData: Record<string, SessionDataEntry>  // Per-session data

  setUser: (user: UserProfile | null) => void
  setSessions: (sessions: BrowserSession[]) => void
  addSession: (session: BrowserSession) => void
  updateSession: (id: string, updates: Partial<BrowserSession>) => void
  removeSession: (id: string) => void
  setCurrentSession: (session: BrowserSession | null) => void
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setSkills: (skills: Skill[]) => void
  setWsConnected: (connected: boolean) => void
  addWsEvent: (event: WSEvent) => void
  clearWsEvents: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setAgentConfig: (config: AgentConfig) => void
  updateSessionData: (sessionId: string, data: Partial<SessionDataEntry> | ((current: SessionDataEntry) => Partial<SessionDataEntry>)) => void
  reset: () => void
}

const initialState = {
  user: null,
  sessions: [],
  currentSession: null,
  messages: [],
  skills: [],
  wsConnected: false,
  wsEvents: [],
  isLoading: false,
  error: null,
  agentConfig: defaultAgentConfig,
  sessionData: {},
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setSessions: (sessions) => set({ sessions }),

      addSession: (session) =>
        set((state) => ({ sessions: [session, ...state.sessions] })),

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
          currentSession:
            state.currentSession?.id === id
              ? { ...state.currentSession, ...updates }
              : state.currentSession,
        })),

      removeSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSession:
            state.currentSession?.id === id ? null : state.currentSession,
        })),

      setCurrentSession: (session) => set({ currentSession: session }),

      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      setSkills: (skills) => set({ skills }),

      setWsConnected: (connected) => set({ wsConnected: connected }),

      addWsEvent: (event) =>
        set((state) => ({
          wsEvents: [...state.wsEvents, event].slice(-100),
        })),

      clearWsEvents: () => set({ wsEvents: [] }),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setAgentConfig: (config) => set({ agentConfig: config }),

      updateSessionData: (sessionId, data) =>
        set((state) => {
          const currentData = state.sessionData[sessionId] || {
            screenshot: null,
            timeline: [],
            actions: [],
          }

          // Support functional updates
          const updates = typeof data === 'function' ? data(currentData) : data

          return {
            sessionData: {
              ...state.sessionData,
              [sessionId]: { ...currentData, ...updates },
            },
          }
        }),

      reset: () => set(initialState),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        agentConfig: state.agentConfig,
        sessionData: state.sessionData,
        // user: state.user // optionally persist user
      }),
    }
  )
)
