import { createClient, SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Support multiple environment variable names for flexibility
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                    process.env.SUPABASE_ANON_KEY ||
                    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
                    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
                    process.env.SUPABASE_SERVICE_KEY

let supabase: SupabaseClient

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
  console.warn('⚠️  Supabase credentials not configured. Database features will not work.')
  console.warn('   Please update backend/.env with your Supabase credentials.')

  // Create a mock client for development
  supabase = {
    from: () => ({
      select: () => ({ data: [], error: null, single: () => ({ data: null, error: null }) }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      update: () => ({ eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ select: () => ({ single: () => ({ data: null, error: null }) }) }),
      delete: () => ({ eq: () => ({ data: null, error: null }) })
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Not configured' } })
    }
  } as unknown as SupabaseClient
} else {
  // Create base client with anon/publishable key
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Create a Supabase client authenticated with a user's JWT token
 * This client will respect RLS policies for that user
 */
export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) {
    return supabase // Return base client if not configured
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}

export { supabase }

// Export types
export type { User } from '@supabase/supabase-js'
