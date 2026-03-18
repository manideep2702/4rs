import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

export type Tier = 'free' | 'pro'

interface AuthState {
  user: User | null
  session: Session | null
  tier: Tier
  isLoading: boolean
  isAuthReady: boolean

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setTier: (tier: Tier) => void
  setLoading: (loading: boolean) => void
  setAuthReady: (ready: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  tier: 'free',
  isLoading: true,
  isAuthReady: false,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setTier: (tier) => set({ tier }),
  setLoading: (isLoading) => set({ isLoading }),
  setAuthReady: (isAuthReady) => set({ isAuthReady }),
  signOut: () => set({ user: null, session: null, tier: 'free' }),
}))
