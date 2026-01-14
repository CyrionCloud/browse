import { create } from 'zustand'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { BrowserSession, ChatMessage, Skill, WSEvent } from '@autobrowse/shared'

export type UserProfile = SupabaseUser & {
  subscription_tier?: 'free' | 'pro' | 'enterprise'
  created_at?: string
  updated_at?: string
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
}

export const useAppStore = create<AppState>((set) => ({
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

  reset: () => set(initialState),
}))
