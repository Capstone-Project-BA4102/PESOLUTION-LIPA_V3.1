import type { ReactNode } from 'react'
import {
  BarChart3, Building2, ClipboardList, Home, MessageSquareText, Puzzle, Search, Settings,
  Users, Workflow,
} from 'lucide-react'

const NAV = [
  { label: 'Home', icon: Home, active: false },
  { label: 'Applicants', icon: Users, active: false, count: '1,284' },
  { label: 'Companies', icon: Building2, active: false, count: '58' },
  { label: 'Job Listings', icon: ClipboardList, active: false, count: '46' },
  { label: 'Matching', icon: Puzzle, active: false },
  { label: 'Activities', icon: Workflow, active: false },
  { label: 'Feedback', icon: MessageSquareText, active: false },
  { label: 'Analytics', icon: BarChart3, active: false },
  { label: 'Settings', icon: Settings, active: false },
]

/** Preview-only Supabase-Studio-style workspace frame for the admin wireframes. */
export default function DpWorkspace({ active, crumbs, title, sub, actions, children }: {
  active: string
  crumbs: string[]
  title: string
  sub?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="dp-ws">
      <header className="dp-topbar">
        <span className="dp-topbar-logo"><img src="/logo-lipa.png" alt="" />PESOLUTION <span style={{ color: 'var(--dp-brand)' }}>Admin</span></span>
        <span className="dp-topbar-search"><Search style={{ width: 13, height: 13 }} />Search applicants, jobs, companies…</span>
        <div className="dp-topbar-right">
          <span className="dp-badge success"><span className="dot" />Realtime on</span>
          <span className="dp-avatar">LC</span>
        </div>
      </header>
      <aside className="dp-side">
        <p className="dp-side-label">Workspace</p>
        {NAV.map(n => {
          const Icon = n.icon
          return (
            <span key={n.label} className={`dp-side-item ${n.label === active ? 'active' : ''}`}>
              <Icon /><span>{n.label}</span>{n.count && <span className="count">{n.count}</span>}
            </span>
          )
        })}
      </aside>
      <main className="dp-main">
        <nav className="dp-crumbs" aria-label="Breadcrumb">{crumbs.map((c, i) => <span key={c}>{i > 0 && <span> / </span>}<b>{c}</b></span>)}</nav>
        <div className="dp-pagehead">
          <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
          {actions && <div className="dp-pagehead-actions">{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  )
}
