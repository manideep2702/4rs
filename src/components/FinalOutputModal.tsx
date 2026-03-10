import React, { useState } from 'react'
import { useAgencyStore } from '../store/agencyStore'

export function FinalOutputModal() {
  const { isFinalOutputOpen, setFinalOutputOpen, finalOutput } = useAgencyStore()
  const [showSource, setShowSource] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!isFinalOutputOpen || !finalOutput) return null

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setFinalOutputOpen(false)}
    >
      <div
        className="bg-zinc-50 border border-black/10 rounded-2xl w-[90vw] max-w-[1200px] h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-800">
              Your Web App is Ready
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Built by your agency team
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSource(!showSource)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                showSource
                  ? 'bg-zinc-800 text-white'
                  : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
              }`}
            >
              {showSource ? 'Preview' : 'View Source'}
            </button>
            <button
              onClick={() => setFinalOutputOpen(false)}
              className="text-zinc-400 hover:text-zinc-700 transition-colors text-lg leading-none ml-2"
            >
              {'\u2715'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showSource ? (
            <pre className="w-full h-full overflow-auto px-6 py-4 bg-zinc-900 text-zinc-200 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
              {finalOutput}
            </pre>
          ) : (
            <iframe
              srcDoc={finalOutput}
              title="Final Web App"
              className="w-full h-full border-0 bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5 flex justify-end gap-3">
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 bg-zinc-200 text-zinc-800 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-zinc-300 active:scale-[0.98] transition-all"
          >
            Download HTML
          </button>
          <button
            onClick={handleCopy}
            className="px-5 py-2.5 bg-zinc-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all"
          >
            {copied ? 'Copied!' : 'Copy Source'}
          </button>
        </div>
      </div>
    </div>
  )
}
