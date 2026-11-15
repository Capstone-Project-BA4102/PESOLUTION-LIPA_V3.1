import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight, LogIn, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, LanguageToggle, Logo, ThemeToggle } from '@/components/ui'
import { LoginModal } from '@/components/auth/LoginModal'
import { PublicSiteProvider, usePublicSite } from '@/lib/publicSite'
import { usePT } from '@/lib/portalCopy'
import { usePublicPreferences } from '@/lib/publicPreferences'
import { useEntranceReplay } from '@/lib/useEntranceReplay'

const LINKS = [
  { to: '/', label: 'home', end: true },
  { to: '/about', label: 'about' },
  { to: '/jobs', label: 'jobs' },
  { to: '/how-it-works', label: 'guide' },
  { to: '/contact', label: 'contact' },
]

/** Layout for the public website: white top navbar + footer. */
export function PublicLayout() {
  return <PublicSiteProvider><PublicShell /></PublicSiteProvider>
}
function PublicShell() {
  const { t, locale, theme } = usePublicPreferences()
  const pt = usePT()
  const pageRef = useEntranceReplay<HTMLElement>(locale, theme)
  const { data } = usePublicSite()
  const office = data?.content
  const [year] = useState(() => new Date().getFullYear())
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [showLogin, setShowLogin] = useState(false)
  const location = useLocation()
  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [location.pathname])

  useEffect(() => {
    const timer = window.setTimeout(() => { void import('@/pages/public/ResumeMakerPage').catch(() => {}) }, 2500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!open || showLogin) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); menuButton.current?.focus() }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open, showLogin])

  const openLogin = () => setShowLogin(true)
  const closeLogin = () => setShowLogin(false)

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'border-b-2 py-2 text-[13.5px] font-semibold transition-colors',
      isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-slate-900',
    )

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 transition-colors">
      <LoginModal open={showLogin} onClose={closeLogin} />
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-[56px] max-w-7xl items-center justify-between gap-2 px-4 sm:gap-6 sm:px-6">
          <Logo compact className="shrink-0" />
          <nav className="hidden items-center gap-5 lg:flex" aria-label="Main">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkCls}>
                {t(l.label as 'home')}
              </NavLink>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle tone="neutral" />
            <ThemeToggle tone="neutral" />
            <div className="hidden sm:block"><Button onClick={openLogin} variant="neutral" icon={<LogIn className="h-5 w-5" />} className="border-none !text-brand-600 hover:!text-brand-700 font-bold">{t('login')}</Button></div>
            <button ref={menuButton} type="button" className="ui-icon-button flex items-center justify-center rounded-md p-1 text-slate-700 hover:bg-slate-100 lg:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? pt('Close menu') : pt('Open menu')} aria-expanded={open} aria-controls="public-mobile-menu">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="public-mobile-menu" className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => cn('block rounded-md px-3 py-2.5 text-[15px] font-medium', isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100')}
              >
                {t(l.label as 'home')}
              </NavLink>
            ))}
            <Button onClick={openLogin} variant="neutral" fullWidth className="mt-2 !text-brand-600 hover:!text-brand-700" icon={<LogIn className="h-5 w-5" />}>{t('login')}</Button>
          </nav>
        )}
      </header>

      <main ref={pageRef} key={location.pathname} className="ui-page-enter flex-1">
        <Outlet />
      </main>

      <footer className="force-light bg-slate-900 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 text-[14px] sm:px-6 md:grid-cols-[1.2fr_.7fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white">
                <img src="/logo-lipa.png" alt="" className="h-11 w-11" />
              </span>
              <div className="leading-tight">
                <p className="font-bold text-white">PESOLUTION</p>
                <p className="text-[0.95rem]">Public Employment Service Office – Lipa City</p>
              </div>
            </div>
            {office?.tagline && <p className="mt-4">{office.tagline}</p>}
          </div>
          <div>
            <p className="mb-3 text-lg font-bold text-white">{t('quickLinks')}</p>
            <ul className="space-y-2">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} className="hover:text-white hover:underline">
                    {t(l.label as 'home')}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xl font-bold text-white">{t('assistance')}</p>
            <p className="max-w-sm text-base leading-7 text-slate-300">{t('assistanceText')}</p>
            <NavLink to="/contact" className="mt-5 inline-flex items-center gap-2 text-base font-bold text-white hover:underline">{t('contactPeso')} <ArrowRight className="h-4 w-4" /></NavLink>
          </div>
        </div>
        <div className="border-t border-slate-800 px-5 py-5 text-[0.95rem]">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row"><span>© {year} Public Employment Service Office – Lipa City.</span><span className="flex gap-5"><NavLink to="/privacy" className="hover:text-white hover:underline">{t('privacy')}</NavLink><NavLink to="/terms" className="hover:text-white hover:underline">{t('terms')}</NavLink></span></div>
        </div>
      </footer>
    </div>
  )
}













