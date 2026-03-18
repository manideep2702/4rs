import { createClient } from '@supabase/supabase-js'
import type { VercelRequest } from '@vercel/node'

// Service-role client — never expose to browser
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

/** Extract and validate JWT from Authorization header. Returns user or null. */
export async function getAuthUser(req: VercelRequest) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  return user
}

/** Get user's tier from profiles table */
export async function getUserTier(userId: string): Promise<'free' | 'pro'> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single()
  return (data?.tier as 'free' | 'pro') ?? 'free'
}

/** Count user's projects */
export async function getProjectCount(userId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  return count ?? 0
}
