import React, { useState } from 'react'
import { useAgencyStore, type Task, type TaskStatus } from '../store/agencyStore'
import { getActiveAgentSet } from '../store/agencyStore'
import { ChevronDown, ChevronRight, Trash2, MessageSquareWarning, Clock, Eye } from 'lucide-react'
import DeleteTaskModal from './DeleteTaskModal'
import { useStore } from '../store/useStore'
import { useElapsedTime } from '../hooks/useElapsedTime'

function TaskOutputModal({ output, title, onClose }: { output: string; title: string; onClose: () => void }) {
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)
  const isHtml = /^\s*(<(!DOCTYPE|html)|<[a-z])/i.test(output)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const ext = isHtml ? 'html' : 'txt'
    const mime = isHtml ? 'text/html' : 'text/plain'
    const blob = new Blob([output], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-50 dark:bg-zinc-900 border border-black/10 dark:border-zinc-700 rounded-2xl w-[90vw] max-w-[1200px] h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800 dark:text-zinc-100">{title}</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">Task output</p>
          </div>
          <div className="flex items-center gap-2">
            {isHtml && (
              <button
                onClick={() => setShowSource(!showSource)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${showSource ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300'}`}
              >
                {showSource ? 'Preview' : 'View Source'}
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {isHtml && !showSource ? (
            <iframe srcDoc={output} title={title} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" />
          ) : (
            <pre className="w-full h-full overflow-auto px-6 py-4 bg-zinc-950 text-zinc-200 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">{output}</pre>
          )}
        </div>
        <div className="px-6 py-4 border-t border-black/5 dark:border-zinc-800 flex justify-end gap-3">
          <button onClick={handleDownload} className="px-5 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-zinc-300 active:scale-[0.98] transition-all">
            Download
          </button>
          <button onClick={handleCopy} className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

const COLUMNS: { status: TaskStatus; label: string; color: string; dot: string; bg: string; border: string }[] = [
  {
    status: 'scheduled',
    label: 'Scheduled',
    color: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    bg: 'bg-violet-50/60 dark:bg-violet-950/20',
    border: 'border-violet-100 dark:border-violet-900/40',
  },
  {
    status: 'on_hold',
    label: 'On Hold',
    color: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50/60 dark:bg-amber-950/20',
    border: 'border-amber-100 dark:border-amber-900/40',
  },
  {
    status: 'in_progress',
    label: 'In Progress',
    color: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    bg: 'bg-sky-50/60 dark:bg-sky-950/20',
    border: 'border-sky-100 dark:border-sky-900/40',
  },
  {
    status: 'done',
    label: 'Done',
    color: 'text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    border: 'border-emerald-100 dark:border-emerald-900/40',
  },
]

interface KanbanPanelProps {
  height?: number;
}

function renderAgentTag(agentIndex: number) {
  if (agentIndex === 0) {
    return (
      <span key={agentIndex} className="flex items-center gap-1 text-[10px] text-sky-500 font-bold">
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-sky-400" />
        You
      </span>
    )
  }
  const agent = getActiveAgentSet().agents.find(a => a.index === agentIndex)
  if (!agent) return null
  return (
    <span key={agentIndex} className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: agent.color }} />
      {agent.name}
    </span>
  )
}

function WorkingTimer({ startMs }: { startMs: number }) {
  const { label, seconds } = useElapsedTime(startMs);
  const isStuck = seconds >= 120;
  const isVeryStuck = seconds >= 600;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
      isVeryStuck ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse' :
      isStuck     ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' :
                    'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400 border border-sky-200 dark:border-sky-800'
    }`}>
      <Clock size={9} />
      {label}
    </span>
  );
}

function TaskCard({ task, colBorder }: { task: Task; colBorder: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const { removeTask } = useAgencyStore()
  const { setSelectedNpc } = useStore()

  const effectiveAgentIds = task.status === 'on_hold'
    ? [...new Set([0, ...task.assignedAgentIds])]
    : task.assignedAgentIds

  const handleSelectAgent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const agentId = task.assignedAgentIds.find(id => id !== 0);
    if (agentId !== undefined) setSelectedNpc(agentId);
  };

  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-xl border ${colBorder} shadow-sm hover:shadow-md transition-shadow p-3 space-y-2 group relative`}>
      {/* Status strip on left */}
      <div
        className="flex items-start justify-between gap-1 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-[12px] text-zinc-900 dark:text-zinc-100 leading-snug font-bold flex-1 pr-1">
          {task.title || 'Untitled Task'}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          {task.status === 'on_hold' && (
            <button
              onClick={handleSelectAgent}
              className="p-1 text-white bg-amber-500 hover:bg-amber-600 rounded-md transition"
              title="Select agent waiting for approval"
            >
              <MessageSquareWarning size={12} />
            </button>
          )}
          {task.status !== 'done' && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setIsDeleteModalOpen(true) }}
                className="p-1 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all opacity-0 group-hover:opacity-100"
                title="Remove task"
              >
                <Trash2 size={11} />
              </button>
              <DeleteTaskModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => removeTask(task.id)}
                taskTitle={task.title}
              />
            </>
          )}
          <button className="text-zinc-300 group-hover:text-zinc-500 transition-colors p-0.5">
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50 dark:bg-zinc-800/70 p-2.5 rounded-lg border border-black/5 dark:border-zinc-700 animate-in fade-in slide-in-from-top-1 duration-150">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-2 gap-y-1 pt-0.5">
        {effectiveAgentIds.map(renderAgentTag)}
      </div>

      {task.status === 'in_progress' && (
        <WorkingTimer startMs={task.updatedAt} />
      )}

      {task.status === 'done' && task.output && (
        <button
          onClick={e => { e.stopPropagation(); setIsOutputOpen(true) }}
          className="mt-1 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
        >
          <Eye size={11} />
          View Output
        </button>
      )}
      {isOutputOpen && task.output && (
        <TaskOutputModal output={task.output} title={task.title} onClose={() => setIsOutputOpen(false)} />
      )}
    </div>
  )
}

export function KanbanPanel({ height = 320 }: KanbanPanelProps) {
  const { tasks } = useAgencyStore()

  return (
    <div
      className="w-full bg-white dark:bg-zinc-900 border-t border-zinc-200/60 dark:border-zinc-800 flex flex-col pointer-events-auto shrink-0 relative"
      style={{ height }}
    >
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max px-4 py-3 gap-3">
          {COLUMNS.map(({ status, label, color, dot, bg, border }) => {
            const colTasks = tasks.filter((t) => t.status === status)
            const isEmpty = colTasks.length === 0

            return (
              <div key={status} className="w-56 flex flex-col gap-2.5">
                {/* Column header */}
                <div className={`flex items-center justify-between shrink-0 px-2.5 py-1.5 rounded-lg ${bg} border ${border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${dot} ${status === 'in_progress' ? 'animate-pulse' : ''}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${color} leading-none`}>
                      {label}
                    </span>
                  </div>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${color} opacity-70`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-0.5">
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} colBorder={border} />
                  ))}
                  {isEmpty && (
                    <div className={`border border-dashed ${border} rounded-xl p-4 flex items-center justify-center select-none opacity-50`}>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${color} opacity-60`}>Empty</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
