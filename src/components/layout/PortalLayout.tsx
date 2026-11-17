import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useDialog } from '@/components/ui/useDialog'
import { SessionStatus } from './SessionStatus'
import { LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useQuery } from '@/lib/useQuery'
import { fetchAdminNavCounts, fetchProfileAvatarUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Avatar, Modal, Button, IconButton, ThemeToggle, LanguageToggle } from '@/components/ui'
import { usePT } from '@/lib/portalCopy'
import { usePublicPreferences } from '@/lib/publicPreferences'
import { useEntranceReplay } from '@/lib/useEntranceReplay'
import { useLiveRefresh } from '@/lib/useLiveRefresh'
import { GlobalSearch } from './GlobalSearch'
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
 * Shared compact shell for Admin and Applicant portals:
 *  - Neutral toolbar with official seal, preferences and confirmed logout
 *  - Collapsible navigation with signed-in identity
 *  - On mobile the sidebar becomes a slide-in drawer (hamburger button)
 */
export function PortalLayout({ nav, homePath }: { nav: NavItem[]; homePath: string }) {
  const [drawer, setDrawer] = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const { logout, user } = useAuth()
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('peso:sidebar-collapsed') === 'true' } catch { return false } })
  const { data: avatarUrl, reload: reloadAvatar } = useQuery(() => user?.id ? fetchProfileAvatarUrl(user.id) : Promise.resolve(''), [user?.id])
  const toggleSidebar = () => setCollapsed(value => {
    try { localStorage.setItem('peso:sidebar-collapsed', String(!value)) } catch { /* Storage is optional for presentation. */ }
    return !value
  })
  const navigate = useNavigate()
  const location = useLocation()
  const pt = usePT()
  const { locale, theme } = usePublicPreferences()
  const pageRef = useEntranceReplay<HTMLDivElement>(locale, theme)
  const isAdmin = homePath === '/admin'
  const { data: navCounts, reload: reloadCounts } = useQuery(
    () => (isAdmin ? fetchAdminNavCounts() : Promise.resolve(null)),
    [isAdmin],
  )
  useLiveRefresh(reloadCounts, ['applicants', 'companies', 'job_listings'], isAdmin)

  useEffect(() => {
    window.addEventListener('pesolution:avatar-updated', reloadAvatar)
    window.addEventListener('focus', reloadAvatar)
    return () => { window.removeEventListener('pesolution:avatar-updated', reloadAvatar); window.removeEventListener('focus', reloadAvatar) }
  }, [reloadAvatar])

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

  const sidebar = (compact: boolean) => <SidebarNav nav={nav} collapsed={compact} avatarUrl={avatarUrl || undefined} counts={navCounts} workspace={isAdmin} />
  return (
    <div className="portal-shell min-h-screen bg-slate-50">
      <a href="#portal-content" className="sr-only z-[80] rounded-md bg-white p-3 text-brand-700 focus:not-sr-only focus:fixed focus:left-3 focus:top-3">{pt('Skip to content')}</a>
      <LogoutConfirmModal open={logoutModal} onClose={() => { if (!loggingOut) setLogoutModal(false) }} onConfirm={handleConfirmLogout} busy={loggingOut} />
      <header className="no-print sticky top-0 z-30 flex h-[52px] items-center gap-1.5 border-b border-slate-200 bg-white px-2 sm:gap-2 sm:px-3">
        <IconButton className="lg:hidden" label="Open menu" aria-expanded={drawer} aria-controls="portal-mobile-menu" onClick={() => setDrawer(true)}><Menu /></IconButton>
        <Link to={homePath} className="flex shrink-0 items-center gap-2" aria-label="PESOLUTION – PESO Lipa City">
          <img src="/logo-lipa.png" alt="" className="h-[26px] w-[26px] object-contain" />
          <span className="hidden text-[14.5px] font-bold tracking-tight text-slate-900 sm:block">PESOLUTION <span className="text-brand-600 uppercase">{pt(isAdmin ? 'Admin' : 'Applicant')}</span></span>
        </Link>
        <IconButton className="ml-1 hidden lg:inline-flex" label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="portal-desktop-menu" onClick={toggleSidebar}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</IconButton>
        {isAdmin && <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2"><GlobalSearch /></div>}
        <div className="flex-1" />
        <div className="hidden xl:block"><SessionStatus /></div>
        <LanguageToggle tone="neutral" />
        <ThemeToggle tone="neutral" />
        <IconButton label="Logout" onClick={() => setLogoutModal(true)}><LogOut /></IconButton>
      </header>
      <div className="flex">
        <aside id="portal-desktop-menu" className={cn('no-print sticky top-[52px] hidden h-[calc(100dvh-52px)] shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-150 lg:flex', collapsed ? 'w-[64px]' : 'w-[236px]')}>
          {sidebar(collapsed)}
        </aside>
        {drawer && <MobileDrawer onClose={() => setDrawer(false)}>{sidebar(false)}</MobileDrawer>}
        <main id="portal-content" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
          <PortalBreadcrumbs nav={nav} homePath={homePath} pathname={location.pathname} />
          <div ref={pageRef} key={location.pathname} className={cn('ui-page-enter mx-auto px-3 py-4 sm:px-6 sm:py-5 lg:px-8', /\/(new|register|renew|website|profile)$/.test(location.pathname) ? 'max-w-[1040px]' : 'max-w-[1600px]')}><Outlet /></div>
        </main>
      </div>
    </div>
  )
}

function MobileDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const pt = usePT()
  useDialog(true, panel, onClose)
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)')
    const check = () => { if (wide.matches) onClose() }
    check(); wide.addEventListener('change', check)
    return () => wide.removeEventListener('change', check)
  }, [onClose])
  return createPortal(<div className="no-print fixed inset-0 z-50 bg-ink/40" onClick={onClose}>
    <div id="portal-mobile-menu" ref={panel} role="dialog" aria-modal="true" aria-label={pt('Menu')} tabIndex={-1} onClick={event => event.stopPropagation()} className="ui-drawer-panel flex h-dvh w-[min(288px,85vw)] flex-col border-r border-slate-200 bg-white">
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-slate-200 px-4"><span className="text-[14px] font-bold">PESOLUTION</span><IconButton label="Close menu" onClick={onClose}><X /></IconButton></div>
      {children}
    </div>
  </div>, document.body)
}

function SidebarNav({ nav, collapsed, avatarUrl, counts, workspace }: { nav: NavItem[]; collapsed: boolean; avatarUrl?: string; counts?: Record<string, number> | null; workspace?: boolean }) {
  const pt = usePT()
  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
    <nav className="flex flex-col gap-0.5 p-2.5" aria-label={pt('Main navigation')}>
      {workspace && !collapsed && <p className="px-2.5 pt-2 pb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-slate-500">{pt('Workspace')}</p>}
      {nav.map(item => {
        const count = counts?.[item.to]
        return <NavLink key={item.to} to={item.to} end={item.end} title={collapsed ? pt(item.label) : undefined} aria-label={collapsed ? pt(item.label) : undefined}
          className={({ isActive }) => cn('portal-nav-link relative flex min-h-[34px] items-center rounded-md text-[13.5px] font-medium transition-colors [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0', collapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5', isActive ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
          {item.icon}{!collapsed && <span>{pt(item.label)}</span>}
          {(item.badge ?? 0) > 0 && <span className={cn('rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white', collapsed ? 'absolute -right-1 -top-1' : 'ml-auto')}>{item.badge}</span>}
          {count !== undefined && !collapsed && <span className="ml-auto text-[11px] font-medium tabular-nums text-slate-500">{count.toLocaleString()}</span>}
        </NavLink>
      })}
    </nav>
    <div className="mt-auto"><AccountCard collapsed={collapsed} avatarUrl={avatarUrl} />{!collapsed && <p className="px-3 pb-2.5 text-[10.5px] text-slate-500">Trabaho · Kabuhayan · Mas Maunlad na Lipa</p>}</div>
  </div>
}

/** Signed-in identity: real name, account type, serial ID and email. */
function AccountCard({ collapsed, avatarUrl }: { collapsed: boolean; avatarUrl?: string }) {
  const { user } = useAuth()
  const pt = usePT()
  if (!user) return null
  return <div className={cn('border-t border-slate-200 py-3', collapsed ? 'px-2.5' : 'px-3')}>
    <div className="flex items-center gap-2.5" title={collapsed ? `${user.name} · ${user.email}` : undefined}>
      <Avatar name={user.name} src={avatarUrl} className="!h-[30px] !w-[30px] shrink-0 !text-[11px]" />
      <div className={collapsed ? 'sr-only' : 'min-w-0'}>
        <p className="truncate text-[13px] font-semibold text-slate-900">{user.name}</p>
        <p className="text-[11px] text-slate-500">{pt(user.role === 'admin' ? 'Admin Account' : 'Applicant Account')} · {user.code || pt('No serial ID yet')}</p>
        <p className="truncate text-[11px] text-slate-500" title={user.email}>{user.email}</p>
      </div>
    </div>
  </div>
}

/** Human-readable route context: never expose record identifiers as breadcrumb labels. */
function PortalBreadcrumbs({ nav, homePath, pathname }: { nav: NavItem[]; homePath: string; pathname: string }) {
  const pt = usePT()
  const section = [...nav].sort((a, b) => b.to.length - a.to.length).find(item => item.end ? item.to === pathname : pathname === item.to || pathname.startsWith(`${item.to}/`))
  const crumbs = [{ label: homePath === '/admin' ? 'Admin Portal' : 'Applicant Portal', to: homePath }]
  if (section) crumbs.push({ label: section.label, to: section.to })
  if (section?.to.endsWith('/matching') && pathname !== section.to) {
    const matchPath = pathname.split('/').slice(0, 4).join('/')
    crumbs.push({ label: 'Match Results', to: matchPath })
  }
  const suffix = pathname.split('/').at(-1) || ''
  const labels: Record<string, string> = { new: 'Add New', register: 'Register Applicant', renew: 'Renew Applicant Registration', 'account-receipt': 'Account Receipt', referral: 'Referral Slip', 'referral-slip': 'Referral Slip', previous: 'Previous Applications' }
  if (labels[suffix]) crumbs.push({ label: labels[suffix], to: pathname })
  return <nav aria-label={pt('Breadcrumb')} className="flex min-h-[36px] flex-wrap items-center gap-x-2 gap-y-1 border-b border-slate-200 bg-white px-3 py-1.5 text-[12.5px] sm:px-6">
    {crumbs.map((crumb, index) => <span key={`${crumb.to}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
      {index > 0 && <ChevronRight aria-hidden="true" className="h-3 w-3 text-slate-400" />}
      {index === crumbs.length - 1 ? <span aria-current="page" className="font-medium text-slate-800">{pt(crumb.label)}</span> : <Link to={crumb.to} className="text-slate-500 hover:text-slate-900">{pt(crumb.label)}</Link>}
    </span>)}
  </nav>
}
