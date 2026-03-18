import React, { useEffect, useState } from 'react'
import { X, FolderOpen, Plus, Trash2, Loader2, Clock } from 'lucide-react'
import { useProjects } from '../hooks/useProjects'
import { useAgencyStore } from '../store/agencyStore'
import { useAuthStore } from '../store/authStore'

interface ProjectsModalProps {
  onClose: () => void
  onUpgrade?: () => void
}

const PHASE_LABELS: Record<string, string> = {
  idle: 'Not started',
  briefing: 'Briefing',
  working: 'In progress',
  awaiting_approval: 'Awaiting approval',
  done: 'Completed',
}

const ProjectsModal: React.FC<ProjectsModalProps> = ({ onClose, onUpgrade }) => {
  const { projects, loading, error, list, create, remove } = useProjects()
  const { tier } = useAuthStore()
  const setAgentSet = useAgencyStore(s => s.setAgentSet)
  const resetProject = useAgencyStore(s => s.resetProject)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { list() }, [list])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const id = await create(newName.trim(), 'marketing-agency')
    setCreating(false)
    if (id) {
      setNewName('')
      setShowCreate(false)
      list()
    }
  }

  const handleLoad = (project: { id: string; agentSetId: string }) => {
    resetProject()
    setAgentSet(project.agentSetId)
    // Store project ID in agency store for cloud sync
    useAgencyStore.setState({ currentProjectId: project.id } as any)
    onClose()
  }

  const handleRemove = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Delete this project?')) return
    await remove(id)
  }

  const atLimit = tier === 'free' && projects.length >= 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-zinc-400" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">My Projects</h2>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 max-h-[420px] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-zinc-400">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading…
            </div>
          )}

          {!loading && projects.length === 0 && (
            <div className="text-center py-8 text-zinc-400 text-sm">
              No projects yet. Create your first project below.
            </div>
          )}

          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md px-3 py-2 mb-3">
              {error}
              {error.includes('limit') && (
                <button onClick={onUpgrade} className="ml-2 underline font-semibold">Upgrade</button>
              )}
            </div>
          )}

          <div className="space-y-2">
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => handleLoad(p)}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition text-left group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{p.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Clock size={9} /> {new Date(p.updatedAt).toLocaleDateString()}
                    </span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      p.phase === 'done' ? 'bg-emerald-50 text-emerald-600' :
                      p.phase === 'working' ? 'bg-blue-50 text-blue-600' :
                      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'
                    }`}>
                      {PHASE_LABELS[p.phase] ?? p.phase}
                    </span>
                  </div>
                </div>
                <button
                  onClick={e => handleRemove(e, p.id)}
                  className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-red-400 hover:text-red-600 rounded transition"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>
        </div>

        {/* Create new */}
        <div className="px-4 pb-4 border-t border-zinc-100 dark:border-zinc-800 pt-4">
          {atLimit && !showCreate ? (
            <div className="text-xs text-zinc-500 text-center">
              Free plan: 3 projects max.{' '}
              <button onClick={onUpgrade} className="text-amber-500 font-semibold hover:underline">Upgrade to Pro</button>{' '}
              for unlimited projects.
            </div>
          ) : showCreate ? (
            <form onSubmit={handleCreate} className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Project name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-semibold hover:bg-zinc-700 transition disabled:opacity-50"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : null}
                Create
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-700">
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 text-sm text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-400 transition"
            >
              <Plus size={14} /> New Project
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProjectsModal
