import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser, supabaseAdmin } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('tier, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const { count: projectCount } = await supabaseAdmin
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: llmCallsThisMonth } = await supabaseAdmin
    .from('usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('current_period_end, status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  return res.json({
    tier: profile?.tier ?? 'free',
    projectCount: projectCount ?? 0,
    llmCallsThisMonth: llmCallsThisMonth ?? 0,
    subscriptionEnd: subscription?.current_period_end ?? null,
  })
}
