import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY tidak ditemukan. Gunakan ANON_KEY sebagai fallback.')
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)