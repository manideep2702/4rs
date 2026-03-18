import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Safe singleton — returns a no-op stub when env vars are missing so the app
// doesn't crash on boot when Supabase isn't configured yet.
function createSafeClient(): SupabaseClient {
  if (supabaseUrl && supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  }
  // Return a stub that silently no-ops — auth features just won't work
  console.warn('[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — auth disabled')
  return createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const supabase = createSafeClient()
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey)
