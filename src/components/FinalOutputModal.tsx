import React, { useState } from 'react'
import { useAgencyStore } from '../store/agencyStore'
import { Code2, Download, Copy, Check, X, RefreshCw, ExternalLink, Sparkles } from 'lucide-react'

export function FinalOutputModal() {
  const { isFinalOutputOpen, setFinalOutputOpen, finalOutput, requestProjectUpdate, tasks } = useAgencyStore()
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showUpdateInput, setShowUpdateInput] = useState(false)
  const [updateFeedback, setUpdateFeedback] = useState('')

  if (!isFinalOutputOpen) return null
  // finalOutput may be null/empty if LLM returned empty — show error rather than nothing
  if (finalOutput === null || finalOutput.trim() === '') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }} onClick={() => setFinalOutputOpen(false)}>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="text-4xl">⚠️</div>
          <h2 className="text-sm font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-widest">Output Not Ready</h2>
          <p className="text-[12px] text-zinc-400 text-center max-w-xs">The final output is still being assembled. Check the Activity log and try again in a moment.</p>
          <button onClick={() => setFinalOutputOpen(false)} className="px-6 py-2 bg-zinc-900 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider">Close</button>
        </div>
      </div>
    )
  }

  const agentCount = tasks.filter(t => t.output).length

  const handleCopy = async () => {
    await navigator.clipboard.writeText(finalOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([finalOutput], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'webapp.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleOpenNew = () => {
    const blob = new Blob([finalOutput], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  const handleSendUpdate = () => {
    if (updateFeedback.trim()) {
      requestProjectUpdate(updateFeedback.trim())
      setUpdateFeedback('')
      setShowUpdateInput(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={() => setFinalOutputOpen(false)}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-2xl w-[96vw] max-w-[1300px] flex flex-col shadow-2xl overflow-hidden"
        style={{ height: 'min(92vh, 900px)', boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-900 shrink-0">
          {/* Left: title + badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
              <Sparkles size={14} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                  Your Web App is Ready
                </h2>
                {agentCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                    {agentCount} agent{agentCount !== 1 ? 's' : ''} contributed
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Built by your agency team</p>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-2">
            {/* Preview / Source toggle */}
            <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setShowSource(false)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  !showSource
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setShowSource(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  showSource
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
                }`}
              >
                <Code2 size={11} />
                Source
              </button>
            </div>

            <button
              onClick={handleOpenNew}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              title="Open in new tab"
            >
              <ExternalLink size={15} />
            </button>

            <button
              onClick={() => setFinalOutputOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative">
          {showSource ? (
            <div className="w-full h-full bg-zinc-950 overflow-auto">
              {/* Source code toolbar */}
              <div className="sticky top-0 flex items-center gap-2 px-4 py-2 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800 z-10">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                </div>
                <span className="text-[11px] text-zinc-500 font-mono ml-2">webapp.html</span>
              </div>
              <pre className="px-6 py-5 text-[12px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-words">
                {finalOutput}
              </pre>
            </div>
          ) : (
            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-800 flex flex-col">
              {/* Browser chrome bar */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-200/80 dark:bg-zinc-800 border-b border-zinc-300/60 dark:border-zinc-700 shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 flex items-center bg-white dark:bg-zinc-900 rounded-md px-3 py-1 gap-2 max-w-md mx-auto border border-zinc-300/50 dark:border-zinc-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">localhost • built by maxxyyy</span>
                </div>
              </div>
              <iframe
                srcDoc={finalOutput}
                title="Final Web App"
                className="w-full flex-1 border-0 bg-white"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
          {/* Update input */}
          {showUpdateInput && (
            <div className="px-5 pt-3 pb-0 flex gap-2">
              <input
                autoFocus
                type="text"
                value={updateFeedback}
                onChange={e => setUpdateFeedback(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSendUpdate()
                  if (e.key === 'Escape') { setShowUpdateInput(false); setUpdateFeedback('') }
                }}
                placeholder="Describe what you'd like changed or improved…"
                className="flex-1 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[12px] text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition"
              />
              <button
                disabled={!updateFeedback.trim()}
                onClick={handleSendUpdate}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider hover:from-violet-700 hover:to-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Send
              </button>
              <button
                onClick={() => { setShowUpdateInput(false); setUpdateFeedback('') }}
                className="px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-300 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center justify-between px-5 py-3">
            <button
              onClick={() => { setShowUpdateInput(v => !v); setUpdateFeedback('') }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30 dark:hover:text-violet-400 active:scale-[0.98] transition-all"
            >
              <RefreshCw size={12} />
              Request Updates
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-zinc-300 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all"
              >
                <Download size={12} />
                Download
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[11px] font-bold uppercase tracking-wider hover:bg-black dark:hover:bg-white active:scale-[0.98] transition-all"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy Source'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
