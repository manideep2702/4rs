import { useCallback } from 'react'
import { useAuthStore } from '../store/authStore'

export function useBilling() {
  const { session, tier } = useAuthStore()

  const upgrade = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error('[Billing] checkout error', e)
    }
  }, [session])

  const openPortal = useCallback(async () => {
    if (!session) return
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error('[Billing] portal error', e)
    }
  }, [session])

  return { tier, isPro: tier === 'pro', upgrade, openPortal }
}
