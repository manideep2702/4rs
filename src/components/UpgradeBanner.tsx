import React from 'react'
import { Crown, X } from 'lucide-react'
import { useBilling } from '../hooks/useBilling'

interface UpgradeBannerProps {
  message: string
  onClose?: () => void
}

const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ message, onClose }) => {
  const { upgrade } = useBilling()

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
      <Crown size={14} className="text-amber-500 shrink-0" />
      <span className="flex-1 text-zinc-700 dark:text-zinc-200">{message}</span>
      <button
        onClick={upgrade}
        className="shrink-0 px-3 py-1 bg-amber-400 hover:bg-amber-500 text-white text-xs font-bold rounded-md transition"
      >
        Upgrade
      </button>
      {onClose && (
        <button onClick={onClose} className="shrink-0 text-zinc-400 hover:text-zinc-600">
          <X size={12} />
        </button>
      )}
    </div>
  )
}

export default UpgradeBanner
