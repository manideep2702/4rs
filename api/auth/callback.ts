import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = req.query.code as string
  const next = (req.query.next as string) ?? '/'

  if (!code) return res.redirect(302, `/?error=missing_code`)

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return res.redirect(302, `/?error=${encodeURIComponent(error.message)}`)

  return res.redirect(302, next)
}
