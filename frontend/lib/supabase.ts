import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
// Support both legacy ANON_KEY and new PUBLISHABLE_DEFAULT_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || ''

// Create Supabase client (or a mock if not configured)
let supabase: SupabaseClient

if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    })
} else {
    console.warn('Supabase not configured. Auth features will not work.', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
    })
    // Create a dummy client that won't work but won't crash
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key', {
        auth: {
            persistSession: false,
        },
    })
}

export { supabase }

