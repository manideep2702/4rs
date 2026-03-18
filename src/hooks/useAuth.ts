import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { setUser, setSession, setTier, setLoading, setAuthReady } = useAuthStore()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchTier(session.access_token)
      setLoading(false)
      setAuthReady(true)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchTier(session.access_token)
      } else {
        setTier('free')
      }
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTier(accessToken: string) {
    try {
      const res = await fetch('/api/billing/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTier(data.tier ?? 'free')
      }
    } catch {
      setTier('free')
    }
  }

  return useAuthStore()
}
