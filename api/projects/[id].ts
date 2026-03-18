import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser, getUserTier, supabaseAdmin } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const projectId = req.query.id as string

  // Verify ownership
  const { data: project, error: fetchError } = await supabaseAdmin
    .from('projects')
    .select('id, user_id, name, agent_set_id, phase, client_brief, final_output, updated_at')
    .eq('id', projectId)
    .single()

  if (fetchError || !project) return res.status(404).json({ error: 'Not found' })
  if (project.user_id !== user.id) return res.status(403).json({ error: 'Forbidden' })

  // GET — full project state
  if (req.method === 'GET') {
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at')

    return res.json({
      id: project.id,
      name: project.name,
      agentSetId: project.agent_set_id,
      phase: project.phase,
      clientBrief: project.client_brief,
      finalOutput: project.final_output,
      updatedAt: project.updated_at,
      tasks: (tasks ?? []).map(t => ({
        id: t.id, title: t.title, description: t.description,
        assignedAgentIds: t.assigned_agent_ids, status: t.status,
        requiresClientApproval: t.requires_client_approval,
        output: t.output, parentTaskId: t.parent_task_id,
        createdAt: new Date(t.created_at).getTime(),
        updatedAt: new Date(t.updated_at).getTime(),
      })),
    })
  }

  // PATCH — update project state
  if (req.method === 'PATCH') {
    const { clientBrief, phase, finalOutput, agentSetId, name } = req.body ?? {}

    // Free users can only use marketing-agency
    if (agentSetId && agentSetId !== 'marketing-agency') {
      const tier = await getUserTier(user.id)
      if (tier === 'free') {
        return res.status(403).json({ error: 'Upgrade to Pro to access other agent teams.' })
      }
    }

    const updates: Record<string, any> = {}
    if (name !== undefined) updates.name = name
    if (clientBrief !== undefined) updates.client_brief = clientBrief
    if (phase !== undefined) updates.phase = phase
    if (finalOutput !== undefined) updates.final_output = finalOutput
    if (agentSetId !== undefined) updates.agent_set_id = agentSetId
    updates.updated_at = new Date().toISOString()

    const { error } = await supabaseAdmin
      .from('projects')
      .update(updates)
      .eq('id', projectId)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  // DELETE
  if (req.method === 'DELETE') {
    await supabaseAdmin.from('projects').delete().eq('id', projectId)
    return res.json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
