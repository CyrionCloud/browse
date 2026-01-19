'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signIn: (email: string, password: string) => Promise<void>
    signUp: (email: string, password: string) => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        const { error, data } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error

        // Update local state immediately
        if (data.session) {
            setSession(data.session)
            setUser(data.session.user)
        }

        // Use window.location for reliable redirect (router.push can fail after auth changes)
        window.location.href = '/dashboard'
    }

    const signUp = async (email: string, password: string) => {
        const { error, data } = await supabase.auth.signUp({
            email,
            password,
        })
        if (error) throw error

        // If auto-confirm is enabled, we get a session immediately
        if (data.session) {
            setSession(data.session)
            setUser(data.session.user)
            window.location.href = '/dashboard'
        } else {
            // Email confirmation required - stay on page and show message
            // The user will need to confirm their email
            throw new Error('Please check your email to confirm your account')
        }
    }

    const signOut = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setSession(null)
        setUser(null)
        window.location.href = '/auth/login'
    }

    return (
        <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
