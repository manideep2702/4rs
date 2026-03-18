import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser, supabaseAdmin } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  // GET — list tasks for a project
  if (req.method === 'GET') {
    const projectId = req.query.projectId as string
    if (!projectId) return res.status(400).json({ error: 'projectId required' })

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .order('created_at')

    if (error) return res.status(500).json({ error: error.message })
    return res.json(data)
  }

  // POST — create task
  if (req.method === 'POST') {
    const { projectId, id, title, description, assignedAgentIds, requiresClientApproval = false, parentTaskId } = req.body ?? {}

    if (!projectId || !id || !title || !description) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Verify project ownership
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (!project) return res.status(403).json({ error: 'Forbidden' })

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        id, project_id: projectId, user_id: user.id,
        title, description,
        assigned_agent_ids: assignedAgentIds ?? [],
        requires_client_approval: requiresClientApproval,
        parent_task_id: parentTaskId ?? null,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data)
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
