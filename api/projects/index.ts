import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser, getUserTier, getProjectCount, supabaseAdmin } from '../_lib/auth'

const FREE_PROJECT_LIMIT = 3

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list all projects
  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('projects')
      .select('id, name, agent_set_id, phase, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    return res.json(data.map(p => ({
      id: p.id,
      name: p.name,
      agentSetId: p.agent_set_id,
      phase: p.phase,
      updatedAt: p.updated_at,
    })))
  }

  // POST — create project
  if (req.method === 'POST') {
    const tier = await getUserTier(user.id)
    if (tier === 'free') {
      const count = await getProjectCount(user.id)
      if (count >= FREE_PROJECT_LIMIT) {
        return res.status(403).json({ error: `Free plan limit: ${FREE_PROJECT_LIMIT} projects. Upgrade to Pro for unlimited.` })
      }
    }

    const { name = 'Untitled Project', agentSetId = 'marketing-agency' } = req.body ?? {}

    // Free tier: only marketing-agency team
    const effectiveAgentSetId = tier === 'free' ? 'marketing-agency' : agentSetId

    const { data, error } = await supabaseAdmin
      .from('projects')
      .insert({ user_id: user.id, name, agent_set_id: effectiveAgentSetId })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    return res.status(201).json({
      id: data.id, name: data.name, agentSetId: data.agent_set_id,
      phase: data.phase, updatedAt: data.updated_at,
    })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
