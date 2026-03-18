import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Chrome, Loader2, X } from 'lucide-react'

interface AuthModalProps {
  onClose?: () => void
}

type AuthView = 'sign_in' | 'sign_up'

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  const [view, setView] = useState<AuthView>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      if (view === 'sign_up') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Check your email for a confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onClose?.()
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/api/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 relative">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X size={18} />
          </button>
        )}

        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center mb-3">
            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 leading-none tracking-tight">The</span>
            <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 leading-none tracking-tighter">Maxxyyy</span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Your AI-powered agency studio</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 mb-6">
          {(['sign_in', 'sign_up'] as AuthView[]).map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); setError(null); setSuccess(null) }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold transition-all ${
                view === v
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700'
              }`}
            >
              {v === 'sign_in' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-zinc-200 dark:border-zinc-700 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition mb-4"
        >
          <Chrome size={16} />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          <span className="text-xs text-zinc-400">or</span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="space-y-3">
          <div className="relative">
            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>
          <div className="relative">
            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-md px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 rounded-md px-3 py-2">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            {view === 'sign_in' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Free tier note */}
        {view === 'sign_up' && (
          <p className="text-center text-xs text-zinc-400 mt-4">
            Free plan includes 3 projects. No credit card required.
          </p>
        )}
      </div>
    </div>
  )
}

export default AuthModal
