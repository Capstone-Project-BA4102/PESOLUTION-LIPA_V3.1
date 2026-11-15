import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Monitor, Smartphone } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import './design-preview.css'

export const PREVIEW_SCREENS = [
  { path: '/design-preview', label: 'Index & Specs', end: true },
  { path: '/design-preview/landing', label: 'Public Landing' },
  { path: '/design-preview/admin-dashboard', label: 'Admin · Dashboard' },
  { path: '/design-preview/admin-applicants', label: 'Admin · Applicants' },
  { path: '/design-preview/admin-companies', label: 'Admin · Companies' },
  { path: '/design-preview/admin-matching', label: 'Admin · Matching' },
  { path: '/design-preview/applicant-dashboard', label: 'Applicant · Home' },
  { path: '/design-preview/applicant-jobs', label: 'Applicant · Jobs' },
] as const

/**
 * Preview chrome around every /design-preview screen: screen switcher,
 * desktop/mobile viewport toggle, and the real app ThemeToggle (light/dark).
 * This bar is preview-only scaffolding — it is not part of the proposed UI.
 */
export default function PreviewShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const [mobile, setMobile] = useState(false)
  return (
    <div className="dp min-h-screen">
      <div className="dp-chrome">
        <span className="dp-chrome-brand">PESOLUTION <span>Batch 5</span></span>
        <span className="dp-chrome-tag">Wireframes · fixtures only</span>
        <nav className="dp-chrome-nav" aria-label="Preview screens">
          {PREVIEW_SCREENS.map(s => (
            <NavLink key={s.path} to={s.path} end={'end' in s && s.end}>{s.label}</NavLink>
          ))}
        </nav>
        <div className="dp-chrome-right">
          <div className="dp-view-toggle" role="group" aria-label="Preview viewport">
            <button type="button" className={mobile ? '' : 'on'} onClick={() => setMobile(false)} aria-pressed={!mobile}>
              <Monitor style={{ width: 12, height: 12, verticalAlign: '-2px' }} /> Desktop
            </button>
            <button type="button" className={mobile ? 'on' : ''} onClick={() => setMobile(true)} aria-pressed={mobile}>
              <Smartphone style={{ width: 12, height: 12, verticalAlign: '-2px' }} /> Mobile
            </button>
          </div>
          <ThemeToggle tone="neutral" />
        </div>
      </div>
      <div className="dp-note">
        Proposed wireframes for approval — all names, numbers, and records are fixtures. Toggle the theme above to inspect light and dark; switch to Mobile to see the 400px layout.
      </div>
      <div className="dp-stage">
        {mobile ? <div className="dp-mobile-frame">{children}</div> : (
          <div style={wide ? undefined : { maxWidth: 1180, margin: '0 auto' }}>{children}</div>
        )}
      </div>
    </div>
  )
}
