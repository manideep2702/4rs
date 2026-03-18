import React from 'react'
import { X, Check, Crown, Zap } from 'lucide-react'
import { useBilling } from '../hooks/useBilling'
import { useAuthStore } from '../store/authStore'

interface PricingModalProps {
  onClose: () => void
  onSignIn?: () => void
}

const FREE_FEATURES = [
  '3 projects',
  '1 agent team (Marketing Agency)',
  'Bring your own API key (BYOK)',
  'All 7 agent tools',
  'Kanban + activity log',
  '3D office simulation',
]

const PRO_FEATURES = [
  'Unlimited projects',
  'All 4 agent teams',
  'Platform API keys — no BYOK needed',
  'Cloud project sync',
  'Priority support',
  'Early access to new teams',
]

const PricingModal: React.FC<PricingModalProps> = ({ onClose, onSignIn }) => {
  const { isPro, upgrade } = useBilling()
  const { user } = useAuthStore()

  const handleUpgrade = () => {
    if (!user) { onSignIn?.(); return }
    upgrade()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
          <X size={18} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Choose your plan</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Scale your AI agency — no prompting, just delegating</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Free */}
          <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-6">
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Free</span>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">$0</span>
                <span className="text-zinc-400 text-sm mb-0.5">/mo</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                  <Check size={14} className="text-zinc-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="w-full py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center text-sm font-semibold text-zinc-400 cursor-default">
              Current Plan
            </div>
          </div>

          {/* Pro */}
          <div className="border-2 border-amber-400 rounded-xl p-6 relative bg-amber-50/30 dark:bg-amber-900/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-amber-400 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                <Crown size={10} /> Most Popular
              </span>
            </div>
            <div className="mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500">Pro</span>
              <div className="flex items-end gap-1 mt-1">
                <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">$29</span>
                <span className="text-zinc-400 text-sm mb-0.5">/mo</span>
              </div>
            </div>
            <ul className="space-y-2.5 mb-6">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <Check size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            {isPro ? (
              <div className="w-full py-2.5 rounded-lg bg-amber-100 text-center text-sm font-semibold text-amber-600 cursor-default flex items-center justify-center gap-2">
                <Crown size={14} /> Active Plan
              </div>
            ) : (
              <button
                onClick={handleUpgrade}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-bold hover:bg-zinc-700 dark:hover:bg-zinc-200 transition"
              >
                <Zap size={14} />
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PricingModal
