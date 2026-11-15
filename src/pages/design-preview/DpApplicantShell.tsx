import type { ReactNode } from 'react'
import { Bell, FileText, Home, Puzzle, UserRound } from 'lucide-react'

const NAV = [
  { label: 'Dashboard', icon: Home },
  { label: 'My Profile', icon: UserRound },
  { label: 'My Status', icon: FileText },
  { label: 'Jobs & Matches', icon: Puzzle },
  { label: 'Notifications', icon: Bell },
]

/** Preview-only friendly applicant shell — same design system, simpler than admin. */
export default function DpApplicantShell({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="dp-app-shell">
      <aside className="dp-side" style={{ paddingTop: 14 }}>
        <span className="dp-topbar-logo" style={{ padding: '0 10px 10px', display: 'inline-flex' }}>
          <img src="/logo-lipa.png" alt="" style={{ width: 22, height: 22 }} />PESOLUTION
        </span>
        {NAV.map(n => {
          const Icon = n.icon
          return (
            <span key={n.label} className={`dp-side-item ${n.label === active ? 'active' : ''}`}>
              <Icon /><span>{n.label}</span>
            </span>
          )
        })}
      </aside>
      <main className="dp-app-main">{children}</main>
    </div>
  )
}
