import { createContext, useContext, useCallback, useState, useEffect, useRef, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { supabase } from './supabase'
import { activityMonitor, sessionKey } from './sessionActivity'
import { activateSession, endSession, readActivity, writeActivity } from './sessionGate'
import { formatApplicantName } from './applicantName'

export type Role = 'admin' | 'applicant'
export interface User { id: string; role: Role; name: string; email: string; code: string }
interface AuthContextValue {
  user: User | null
  isLoading: boolean
  idleSeconds: number
  stayLoggedIn: () => void
  /** Timestamp of manual logout, preserving the existing landing-page transition. */
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
  const [idleSeconds, setIdleSeconds] = useState(1800)
  const stay = useRef<() => void>(() => {})
  const expired = useRef(false)
  const signingIn = useRef(false)
  const expireSession = useCallback(() => {
    if (expired.current) return
    expired.current = true
    endSession()
    setUser(null)
    toast.error('Your session expired after 30 minutes of inactivity. Please sign in again.', { duration: 8000 })
    void supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  }, [])
  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    const monitor = activityMonitor({ read: () => readActivity(userId), write: record => writeActivity(userId, record),
      changed: setIdleSeconds, expired: expireSession })
    let lastWrite = 0
    const interact = (event: Event) => {
      if (!event.isTrusted) return
      // Check before resetting, including the first interaction after browser sleep.
      if (!monitor.check()) return
      if (Date.now() - lastWrite >= 1000) { lastWrite = Date.now(); monitor.interact() }
    }
    const check = () => { monitor.check() }
    const storage = (event: StorageEvent) => { if (event.key === sessionKey(userId) || event.key === null) check() }
    stay.current = () => { monitor.interact() }
    for (const name of ['pointerdown', 'keydown', 'input']) window.addEventListener(name, interact, true)
    window.addEventListener('storage', storage)
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, 1000)
    check()
    return () => {
      monitor.dispose(); stay.current = () => {}; window.clearInterval(timer)
      for (const name of ['pointerdown', 'keydown', 'input']) window.removeEventListener(name, interact, true)
      window.removeEventListener('storage', storage); window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [userId, expireSession])
  useEffect(() => {
    let active = true
    let revision = 0
    const update = async (authUser: SupabaseUser | null) => {
      const current = ++revision
      try {
        if (authUser && !activateSession(authUser.id)) { expireSession(); return }
        if (!authUser) endSession()
        else expired.current = false
        const profile = authUser ? await loadProfile(authUser) : null
        if (active && current === revision && (!authUser || !readActivity(authUser.id).ended)) setUser(profile)
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
      setTimeout(() => { if (active && !signingIn.current) void update(session?.user || null) }, 0)
    })
    return () => { active = false; revision++; subscription.unsubscribe() }
  }, [expireSession])
  const login = async (email: string, password: string): Promise<Role | null> => {
    signingIn.current = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      if (!data.user) return null
      expired.current = false
      activateSession(data.user.id, true)
      const profile = await loadProfile(data.user)
      setUser(profile)
      return profile.role
    } finally { signingIn.current = false }
  }

  const logout = async () => {
    endSession()
    setUser(null)
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setLogoutAt(Date.now())
    toast.success('Logged out successfully')
  }
  return <AuthContext.Provider value={{ user, isLoading, logoutAt, login, logout, idleSeconds, stayLoggedIn: () => stay.current() }}>{children}</AuthContext.Provider>
}
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
