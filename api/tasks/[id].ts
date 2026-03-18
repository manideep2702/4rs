import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getAuthUser, supabaseAdmin } from '../_lib/auth'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await getAuthUser(req)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const taskId = req.query.id as string

  // PATCH — update task
  if (req.method === 'PATCH') {
    const { status, output } = req.body ?? {}
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (status !== undefined) updates.status = status
    if (output !== undefined) updates.output = output

    const { error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', user.id)

    if (error) return res.status(500).json({ error: error.message })
    return res.json({ ok: true })
  }

  // DELETE
  if (req.method === 'DELETE') {
    await supabaseAdmin.from('tasks').delete().eq('id', taskId).eq('user_id', user.id)
    return res.json({ ok: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
