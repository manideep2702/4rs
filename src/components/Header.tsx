import React from 'react';
import { useAgencyStore } from '../store/agencyStore';
import { useStore } from '../store/useStore';
import { Maximize2, Zap, ZapOff, Key, Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

const Header: React.FC = () => {
  const { pauseOnCall, togglePauseOnCall } = useAgencyStore();
  const { llmConfig, setBYOKOpen } = useStore();
  const hasKey = !!llmConfig.apiKey;
  const { isDark, toggle } = useDarkMode();

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <header className="h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-900 dark:text-zinc-100 shrink-0 relative z-40">
      {/* Left: Project Title */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-zinc-900 leading-none tracking-tight">The</span>
          <span className="text-lg font-bold text-zinc-900 leading-none tracking-tighter">Maxxyyy</span>
        </div>
      </div>

      {/* Right: Global Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePauseOnCall}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
            pauseOnCall
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-zinc-100 hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700'
          }`}
          title={pauseOnCall ? "Pause on AI Call: ON" : "Pause on AI Call: OFF"}
        >
          {pauseOnCall ? <Zap size={14} fill="currentColor" /> : <ZapOff size={14} />}
          <span>{pauseOnCall ? 'Debug Mode ON' : 'Debug Mode'}</span>
        </button>

        <button
          onClick={() => setBYOKOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
            hasKey
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
              : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 animate-pulse'
          }`}
          title={hasKey ? 'API Key configured' : 'No API Key — click to add'}
        >
          <Key size={14} />
          <span>{hasKey ? 'API Key' : 'Add API Key'}</span>
        </button>

        <button
          onClick={toggle}
          className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-[1px] h-4 bg-zinc-200 mx-1" />

        <button
          onClick={handleFullscreen}
          className="text-zinc-400 hover:text-zinc-900 transition-colors flex items-center gap-2"
          title="Fullscreen Browser"
        >
          <Maximize2 size={18} />
        </button>
      </div>


    </header>
  );
};

export default Header;
