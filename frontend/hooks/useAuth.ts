import { useEffect, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/useAppStore'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
}

export function useAuth() {
  const { user, setUser, setLoading } = useAppStore()
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
  })

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setAuthState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      }))
      setUser(session?.user ?? null)
    } catch (error) {
      console.error('Error refreshing session:', error)
      setAuthState((prev) => ({
        ...prev,
        user: null,
        loading: false,
        initialized: true,
      }))
      setUser(null)
    }
  }, [setUser])

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        setUser(data.user)
        setAuthState((prev) => ({ ...prev, user: data.user }))
        return { success: true, data }
      } catch (error: any) {
        return { success: false, error: error.message }
      } finally {
        setLoading(false)
      }
    },
    [setUser, setLoading]
  )

  const signUp = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        return { success: true, data }
      } catch (error: any) {
        return { success: false, error: error.message }
      } finally {
        setLoading(false)
      }
    },
    [setLoading]
  )

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setAuthState((prev) => ({ ...prev, user: null }))
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }, [setUser])

  const signInWithOAuth = useCallback(
    async (provider: 'github' | 'google') => {
      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        return { success: true, data }
      } catch (error: any) {
        return { success: false, error: error.message }
      } finally {
        setLoading(false)
      }
    },
    [setLoading]
  )

  useEffect(() => {
    refreshSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      setAuthState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        loading: false,
        initialized: true,
      }))
    })

    return () => subscription.unsubscribe()
  }, [refreshSession, setUser])

  return {
    user: authState.user,
    loading: authState.loading,
    initialized: authState.initialized,
    signIn,
    signUp,
    signOut,
    signInWithOAuth,
    refreshSession,
  }
}
