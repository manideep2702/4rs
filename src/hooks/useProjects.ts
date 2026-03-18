import { useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

export interface ProjectSummary {
  id: string
  name: string
  agentSetId: string
  phase: string
  updatedAt: string
}

export function useProjects() {
  const { session } = useAuthStore()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = useCallback(() => ({
    Authorization: `Bearer ${session?.access_token ?? ''}`,
    'Content-Type': 'application/json',
  }), [session])

  const list = useCallback(async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch('/api/projects', { headers: headers() })
      if (res.ok) setProjects(await res.json())
      else setError('Failed to load projects')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [session, headers])

  const create = useCallback(async (name: string, agentSetId: string): Promise<string | null> => {
    if (!session) return null
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ name, agentSetId }),
    })
    if (res.status === 403) { setError('Project limit reached — upgrade to Pro for unlimited projects'); return null }
    if (!res.ok) { setError('Failed to create project'); return null }
    const project = await res.json()
    setProjects(prev => [project, ...prev])
    return project.id
  }, [session, headers])

  const save = useCallback(async (id: string, data: Partial<{ clientBrief: string; phase: string; finalOutput: string | null; agentSetId: string }>) => {
    if (!session || !id) return
    await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify(data),
    })
  }, [session, headers])

  const remove = useCallback(async (id: string) => {
    if (!session) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE', headers: headers() })
    setProjects(prev => prev.filter(p => p.id !== id))
  }, [session, headers])

  return { projects, loading, error, list, create, save, remove }
}
