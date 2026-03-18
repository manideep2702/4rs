import React from 'react';
import { useAgencyStore } from '../store/agencyStore';
import { useStore } from '../store/useStore';
import { Maximize2, Zap, ZapOff, Key, Moon, Sun, FolderOpen, Crown, LogIn } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuthStore } from '../store/authStore';
import UserMenu from './UserMenu';

interface HeaderProps {
  onSignIn: () => void
  onShowProjects: () => void
  onShowPricing: () => void
}

const Header: React.FC<HeaderProps> = ({ onSignIn, onShowProjects, onShowPricing }) => {
  const { pauseOnCall, togglePauseOnCall } = useAgencyStore();
  const { llmConfig, setBYOKOpen } = useStore();
  const hasKey = !!llmConfig.apiKey;
  const { isDark, toggle } = useDarkMode();
  const { user, tier } = useAuthStore();
  const isPro = tier === 'pro';

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <header className="h-14 border-b border-zinc-200/60 dark:border-zinc-800 flex items-center justify-between px-5 bg-white dark:bg-zinc-950 shrink-0 relative z-40">
      {/* Left: Brand */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5">
          {/* Logo mark */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <span className="text-white text-[11px] font-black">M</span>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">The</span>
            <span className="text-[15px] font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Maxxyyy</span>
          </div>
        </div>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800" />

        {/* Projects button (auth users) */}
        {user && (
          <button
            onClick={onShowProjects}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
          >
            <FolderOpen size={13} />
            Projects
          </button>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {/* Debug mode */}
        <button
          onClick={togglePauseOnCall}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
            pauseOnCall
              ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950 dark:border-amber-800'
              : 'text-zinc-400 border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-600 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
          }`}
          title={pauseOnCall ? 'Debug Mode: ON' : 'Debug Mode'}
        >
          {pauseOnCall ? <Zap size={13} fill="currentColor" /> : <ZapOff size={13} />}
          <span className="hidden sm:inline">{pauseOnCall ? 'Debug' : 'Debug'}</span>
        </button>

        {/* API Key (only for non-Pro or unauthenticated users) */}
        {!isPro && (
          <button
            onClick={() => setBYOKOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
              hasKey
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-900'
                : 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 animate-pulse dark:bg-red-950 dark:border-red-900'
            }`}
            title={hasKey ? 'API Key configured' : 'No API Key — click to add'}
          >
            <Key size={13} />
            <span className="hidden sm:inline">{hasKey ? 'API Key ✓' : 'Add Key'}</span>
          </button>
        )}

        {/* Pro badge */}
        {isPro && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-amber-400 to-orange-400 text-white shadow-sm shadow-amber-400/30">
            <Crown size={11} fill="currentColor" />
            Pro
          </div>
        )}

        {/* Upgrade to Pro */}
        {user && !isPro && (
          <button
            onClick={onShowPricing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 transition shadow-sm shadow-violet-500/30 border border-transparent"
          >
            <Crown size={11} />
            <span className="hidden sm:inline">Upgrade</span>
          </button>
        )}

        {/* Sign in / User menu */}
        {user ? (
          <UserMenu />
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200 dark:border-zinc-700"
          >
            <LogIn size={13} />
            <span className="hidden sm:inline">Sign In</span>
          </button>
        )}

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />

        <button
          onClick={toggle}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button
          onClick={handleFullscreen}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          title="Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </header>
  );
};

export default Header;
