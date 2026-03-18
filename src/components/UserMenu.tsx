import React, { useState, useRef, useEffect } from 'react'
import { LogOut, CreditCard, User, Crown, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'
import { useBilling } from '../hooks/useBilling'

const UserMenu: React.FC = () => {
  const { user, tier } = useAuthStore()
  const { openPortal } = useBilling()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setOpen(false)
  }

  if (!user) return null

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'U'
  const isPro = tier === 'pro'

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isPro ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-zinc-600'}`}>
          {initials}
        </div>
        {isPro && <Crown size={12} className="text-amber-500" />}
        <ChevronDown size={12} className="text-zinc-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-800 z-50 overflow-hidden">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-0.5">
              <User size={12} className="text-zinc-400" />
              <span className="text-xs text-zinc-500 truncate">{user.email}</span>
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${isPro ? 'bg-amber-50 text-amber-600' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800'}`}>
              {isPro && <Crown size={9} />}
              {isPro ? 'Pro' : 'Free Plan'}
            </span>
          </div>

          {/* Actions */}
          <div className="p-1">
            {isPro && (
              <button
                onClick={() => { openPortal(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
              >
                <CreditCard size={14} className="text-zinc-400" />
                Manage Billing
              </button>
            )}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
