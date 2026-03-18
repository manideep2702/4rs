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
    <header className="h-14 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-900 dark:text-zinc-100 shrink-0 relative z-40">
      {/* Left: Brand */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none tracking-tight">The</span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-none tracking-tighter">Maxxyyy</span>
        </div>

        {/* Projects button (auth users) */}
        {user && (
          <button
            onClick={onShowProjects}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
          >
            <FolderOpen size={13} />
            Projects
          </button>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Debug mode */}
        <button
          onClick={togglePauseOnCall}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
            pauseOnCall
              ? 'bg-amber-50 text-amber-600 border-amber-200'
              : 'bg-zinc-50 text-zinc-400 border-zinc-100 hover:bg-zinc-100 hover:text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 dark:hover:bg-zinc-700'
          }`}
          title={pauseOnCall ? 'Debug Mode: ON' : 'Debug Mode'}
        >
          {pauseOnCall ? <Zap size={14} fill="currentColor" /> : <ZapOff size={14} />}
          <span className="hidden sm:inline">{pauseOnCall ? 'Debug ON' : 'Debug'}</span>
        </button>

        {/* API Key (only for non-Pro or unauthenticated users) */}
        {!isPro && (
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
            <span className="hidden sm:inline">{hasKey ? 'API Key' : 'Add Key'}</span>
          </button>
        )}

        {/* Pro badge (shows instead of API key button) */}
        {isPro && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">
            <Crown size={12} fill="currentColor" />
            Pro
          </div>
        )}

        {/* Upgrade to Pro */}
        {user && !isPro && (
          <button
            onClick={onShowPricing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-300 transition border border-transparent"
          >
            <Crown size={12} />
            <span className="hidden sm:inline">Upgrade</span>
          </button>
        )}

        {/* Sign in / User menu */}
        {user ? (
          <UserMenu />
        ) : (
          <button
            onClick={onSignIn}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition border border-zinc-200 dark:border-zinc-700"
          >
            <LogIn size={13} />
            Sign In
          </button>
        )}

        <button
          onClick={toggle}
          className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 transition-colors"
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />

        <button
          onClick={handleFullscreen}
          className="text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100 transition-colors"
          title="Fullscreen"
        >
          <Maximize2 size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
