import React, { useState } from 'react'
import { useAgencyStore, type Task, type TaskStatus } from '../store/agencyStore'
import { getActiveAgentSet } from '../store/agencyStore'
import { ChevronDown, ChevronRight, Trash2, MessageSquareWarning, Clock } from 'lucide-react'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-50 border border-black/10 rounded-2xl w-[90vw] max-w-[1200px] h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800">{title}</h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">Task output</p>
          </div>
          <div className="flex items-center gap-2">
            {isHtml && (
              <button
                onClick={() => setShowSource(!showSource)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${showSource ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'}`}
              >
                {showSource ? 'Preview' : 'View Source'}
              </button>
            )}
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 transition-colors text-lg leading-none ml-2">✕</button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {isHtml && !showSource ? (
            <iframe srcDoc={output} title={title} className="w-full h-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" />
          ) : (
            <pre className="w-full h-full overflow-auto px-6 py-4 bg-zinc-900 text-zinc-200 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">{output}</pre>
          )}
        </div>
        <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-3">
          <button onClick={handleDownload} className="px-5 py-2.5 bg-zinc-200 text-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-300 active:scale-[0.98] transition-all">
            Download
          </button>
          <button onClick={handleCopy} className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  )
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'scheduled', label: 'Scheduled' },
  { status: 'on_hold', label: 'On Hold' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'done', label: 'Done' },
]

interface KanbanPanelProps {
  height?: number;
}

function renderAgentTag(agentIndex: number) {
  if (agentIndex === 0) { // Client / You
    return (
      <span key={agentIndex} className="flex items-center gap-1 text-[10px] text-[#7EACEA] font-bold">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#7EACEA]"
        />
        You
      </span>
    )
  }
  const agent = getActiveAgentSet().agents.find(a => a.index === agentIndex)
  if (!agent) return null
  return (
    <span key={agentIndex} className="flex items-center gap-1 text-[10px] text-zinc-500">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: agent.color }}
      />
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
      isStuck     ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                    'bg-blue-50 text-blue-600 border border-blue-200'
    }`}>
      <Clock size={9} />
      {label}
    </span>
  );
}

function TaskCard({ task }: { task: Task; key?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const { removeTask } = useAgencyStore()
  const { setSelectedNpc } = useStore()

  // For visual representation, if on_hold, we "virtualize" the client being assigned
  const effectiveAgentIds = task.status === 'on_hold'
    ? [...new Set([0, ...task.assignedAgentIds])]
    : task.assignedAgentIds

  const handleSelectAgent = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Select the first assigned NPC (not client)
    const agentId = task.assignedAgentIds.find(id => id !== 0);
    if (agentId !== undefined) {
      setSelectedNpc(agentId);
    }
  };

  return (
    <div key={task.id} className="bg-white dark:bg-zinc-900 rounded-lg border border-black/5 dark:border-zinc-700 shadow-sm p-3 space-y-2 group relative">
      <div
        className="flex items-start justify-between gap-1 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-xs text-zinc-900 dark:text-zinc-100 leading-snug font-bold flex-1">
          {task.title || 'Untitled Task'}
        </h3>
        <div className="flex items-center gap-1">
          {task.status === 'on_hold' && (
            <button
              onClick={handleSelectAgent}
              className="p-1 text-white bg-orange-500 hover:bg-orange-600 rounded mr-1"
              title="Select agent waiting for approval"
            >
              <MessageSquareWarning size={14} />
            </button>
          )}
          {task.status !== 'done' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDeleteModalOpen(true)
                }}
                className="p-1 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                title="Remove task"
              >
                <Trash2 size={12} />
              </button>
              <DeleteTaskModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={() => removeTask(task.id)}
                taskTitle={task.title}
              />
            </>
          )}
          <button className="text-zinc-300 group-hover:text-zinc-500 transition-colors">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed bg-zinc-50/50 dark:bg-zinc-800/50 p-2 rounded border border-black/5 dark:border-zinc-700 animate-in fade-in slide-in-from-top-1 duration-200">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-2 gap-y-1 pt-1">
        {effectiveAgentIds.map(renderAgentTag)}
      </div>
      {task.status === 'in_progress' && (
        <WorkingTimer startMs={task.updatedAt} />
      )}
      {task.status === 'done' && task.output && (
        <button
          onClick={e => { e.stopPropagation(); setIsOutputOpen(true) }}
          className="mt-1 w-full px-2 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-black dark:hover:bg-white transition-all active:scale-[0.98]"
        >
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
      className="w-full bg-white dark:bg-zinc-900 border-t border-black/8 dark:border-zinc-700 flex flex-col pointer-events-auto shrink-0 relative"
      style={{ height }}
    >
      {/* Columns Scroll Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden bg-zinc-50/20 dark:bg-zinc-800/20">
        <div className="flex h-full min-w-max px-5 py-4 gap-4">
          {COLUMNS.map(({ status, label }) => {
            const colTasks = tasks.filter((t) => t.status === status)
            return (
              <div key={status} className="w-60 flex flex-col gap-3">
                <div className="flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 leading-none">
                      {label}
                    </span>
                    <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-400 text-[9px] font-bold rounded-md min-w-4.5 text-center">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
                  {colTasks.map((t) => (
                    <TaskCard key={t.id} task={t} />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="border border-dashed border-zinc-100 dark:border-zinc-700 rounded-lg p-4 flex items-center justify-center select-none">
                      <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-600 uppercase tracking-widest">Empty</span>
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
