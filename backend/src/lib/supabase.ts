import { createClient, SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

let supabase: SupabaseClient

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('your-project')) {
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
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export { supabase }

// Export types
export type { User } from '@supabase/supabase-js'
