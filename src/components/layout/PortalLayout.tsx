import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { fetchProfileAvatarUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Avatar, Logo, Modal, Button, ThemeToggle, LanguageToggle } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'
import toast from 'react-hot-toast'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Match only exact path (for dashboard roots) */
  end?: boolean
  /** Notification count shown as an animated circle on the right */
  badge?: number
}

function LogoutConfirmModal({ open, onClose, onConfirm, busy }: { open: boolean; onClose: () => void; onConfirm: () => void; busy: boolean }) {
  const pt = usePT()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={pt('Confirm Logout')}
      footer={
        <>
          <Button variant="neutral" onClick={onClose} disabled={busy}>
            {pt('Cancel')}
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={busy}>
            {busy ? pt('Logging out...') : pt('Logout')}
          </Button>
        </>
      }
    >
      <p className="text-lg text-slate-700">{pt('Are you sure you want to log out of the portal?')}</p>
    </Modal>
  )
}

/**
 * Shared shell for BOTH Admin and Applicant portals so they look identical:
 *  - Red top header: logo (left), Logout button (right)
 *  - White left sidebar: nav items, signed-in account card + Lipa tagline at the bottom
 *  - On mobile the sidebar becomes a slide-in drawer (hamburger button)
 */
export function PortalLayout({ nav, homePath }: { nav: NavItem[]; homePath: string }) {
  const [drawer, setDrawer] = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const pt = usePT()

  // Close mobile drawer when navigating
  useEffect(() => setDrawer(false), [location.pathname])

  const handleConfirmLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : pt('Could not log out. Please retry.'))
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <LogoutConfirmModal open={logoutModal} onClose={() => { if (!loggingOut) setLogoutModal(false) }} onConfirm={handleConfirmLogout} busy={loggingOut} />

      <header className="force-light no-print sticky top-0 z-30 flex h-20 items-center gap-2 bg-brand-600 px-4 shadow-md sm:gap-4 lg:px-6">
        <button className="shrink-0 rounded-lg p-2 text-white hover:bg-white/10 lg:hidden" onClick={() => setDrawer(true)} aria-label={pt('Open menu')}>
          <Menu className="h-7 w-7" />
        </button>
        <Logo variant="light" to={homePath} />
        <div className="flex-1" />
        <LanguageToggle />
        <ThemeToggle />
        <button
          onClick={() => setLogoutModal(true)}
          aria-label={pt('Logout')}
          title={pt('Logout')}
          className="flex shrink-0 items-center gap-2 rounded-lg p-2 font-semibold text-white transition-colors hover:bg-white/10 sm:px-4"
        >
          <LogOut className="h-5 w-5" /><span className="hidden sm:inline">{pt('Logout')}</span>
        </button>
      </header>

      <div className="flex">
        {/* Mobile overlay */}
        {drawer && <div className="fixed inset-0 z-40 bg-ink/60 lg:hidden" onClick={() => setDrawer(false)} />}

        <aside
          className={cn(
            'no-print fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-20 lg:z-0 lg:h-[calc(100vh-5rem)] lg:translate-x-0',
            drawer ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-200 p-4 lg:hidden">
            <span className="text-lg font-bold">{pt('Menu')}</span>
            <button onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label={pt('Close menu')}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <SidebarNav nav={nav} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[90rem]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarNav({ nav }: { nav: NavItem[] }) {
  const pt = usePT()
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <nav className="flex flex-col gap-1 p-4" aria-label="Main">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 text-[1.05rem] font-semibold transition-colors [&>svg]:h-6 [&>svg]:w-6',
                isActive ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-transparent text-slate-700 hover:bg-slate-100',
              )
            }
          >
            {item.icon}
            {pt(item.label)}
            {(item.badge ?? 0) > 0 && (
              <span className="relative ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <AccountCard />
        <div className="border-t border-slate-200 p-4 text-center">
          <p className="font-bold tracking-wider text-brand-600">LIPA CITY</p>
          <p className="text-[0.80rem] leading-tight text-slate-500">Trabaho | Kabuhayan | Mas Maunlad na Lipa</p>
        </div>
      </div>
    </div>
  )
}

/** Signed-in identity: real name, account type, serial ID and email. */
function AccountCard() {
  const { user } = useAuth()
  const pt = usePT()

  const { data: avatarUrl } = useQuery(
    () => (user?.id ? fetchProfileAvatarUrl(user.id) : Promise.resolve('')),
    [user?.id]
  )

  if (!user) return null

  const roleLabel = pt(user.role === 'admin' ? 'Admin Account' : 'Applicant Account')

  return (
    <div className="border-t border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <Avatar name={user.name} src={avatarUrl || undefined} className="ring-2 ring-brand-100" />
        <div className="min-w-0">
          <p className="font-bold leading-tight text-slate-900">{user.name}</p>
          <p className="text-[0.85rem] font-semibold leading-tight text-brand-600">{roleLabel}</p>
          <p className="text-[0.85rem] leading-tight text-slate-600">{user.code || pt('No serial ID yet')}</p>
          <p className="break-all text-[0.85rem] leading-tight text-slate-500">{user.email}</p>
        </div>
      </div>
    </div>
  )
}
