import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { supabase } from './supabase'
import { formatApplicantName } from './applicantName'

export type Role = 'admin' | 'applicant'
export interface User { id: string; role: Role; name: string; email: string; code: string }
interface AuthContextValue {
  user: User | null
  isLoading: boolean
  /** Timestamp of the last logout — lets the app replay the intro splash before showing the landing page. */
  logoutAt: number
  login: (email: string, password: string) => Promise<Role | null>
  logout: () => Promise<void>
}
export const roleHome = (role: Role) => role === 'admin' ? '/admin' : '/applicant'
const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(authUser: SupabaseUser): Promise<User> {
  const admin = await supabase.from('admins').select('*').eq('profile_id', authUser.id).maybeSingle()
  if (admin.error) throw new Error('Could not verify your account. Please contact PESO.')
  if (admin.data) return { id: authUser.id, role: 'admin', name: formatApplicantName(admin.data, 'Admin User'), email: authUser.email || '', code: admin.data.account_number || '' }
  const applicant = await supabase.from('applicants').select('*').eq('profile_id', authUser.id).maybeSingle()
  if (applicant.error || !applicant.data) throw new Error('Your applicant record could not be found. Please contact PESO.')
  const record = applicant.data
  return { id: authUser.id, role: 'applicant', name: formatApplicantName(record), email: authUser.email || '',
    code: record.applicant_code || `APP-${new Date(record.date_registered).getFullYear()}-${String(record.applicant_number || record.id.slice(0, 8)).padStart(4, '0')}` }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [logoutAt, setLogoutAt] = useState(0)
  useEffect(() => {
    let active = true
    let revision = 0
    const update = async (authUser: SupabaseUser | null) => {
      const current = ++revision
      try {
        const profile = authUser ? await loadProfile(authUser) : null
        if (active && current === revision) setUser(profile)
      } catch {
        if (active && current === revision) setUser(null)
      } finally {
        if (active && current === revision) setIsLoading(false)
      }
    }
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) { if (active) setIsLoading(false); return }
      if (revision === 0) void update(data.session?.user || null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer data queries until Supabase releases its authentication callback lock.
      setTimeout(() => { if (active) void update(session?.user || null) }, 0)
    })
    return () => { active = false; revision++; subscription.unsubscribe() }
  }, [])
  const login = async (email: string, password: string): Promise<Role | null> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
    if (!data.user) return null
    const profile = await loadProfile(data.user)
    setUser(profile)
    return profile.role
  }
  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setLogoutAt(Date.now())
    toast.success('Logged out successfully')
  }
  return <AuthContext.Provider value={{ user, isLoading, logoutAt, login, logout }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
