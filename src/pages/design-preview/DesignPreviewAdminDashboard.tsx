import { useState } from 'react'
import { ArrowRight, Download, UserPlus, UserRoundCheck } from 'lucide-react'
import PreviewShell from './PreviewShell'
import DpWorkspace from './DpWorkspace'
import DpTable, { type DpCol } from './DpTable'
import { ACTIVITIES, APPLICANTS, KPI_STATS, downloadCsv, type FixtureApplicant } from './fixtures'

export default function DesignPreviewAdminDashboard() {
  const [rows, setRows] = useState<FixtureApplicant[]>(APPLICANTS.slice(0, 5))

  const columns: DpCol<FixtureApplicant>[] = [
    {
      key: 'applicant', label: 'Applicant',
      render: a => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dp-avatar">{a.initials}</span>
          <div><div className="t-main">{a.name}</div><div className="t-sub">{a.id} · {a.location}</div></div>
        </div>
      ),
    },
    { key: 'position', label: 'Position sought', render: a => a.position },
    {
      key: 'status', label: 'Status', width: 130,
      render: a => <span className={`dp-badge ${a.status === 'Hired' ? 'success' : a.status === 'Referred' ? 'info' : a.status === 'For follow-up' ? 'warning' : ''}`}><span className="dot" />{a.status}</span>,
    },
    { key: 'registered', label: 'Registered', width: 120, render: a => <span className="t-sub">{a.registered}</span> },
  ]

  return (
    <PreviewShell>
      <DpWorkspace
        active="Home"
        crumbs={['Admin', 'Dashboard']}
        title="Dashboard"
        sub="Lipa City employment operations at a glance — all figures are fixtures."
        actions={<><button type="button" className="dp-btn neutral"><UserPlus style={{ width: 14, height: 14 }} />Register walk-in</button><button type="button" className="dp-btn primary">Go to matching</button></>}
      >
        <div className="dp-kpis">
          {KPI_STATS.map(k => (
            <div key={k.label} className="dp-card dp-kpi">
              <div className="k-label"><span>{k.label}</span></div>
              <div className="k-value">{k.value}</div>
              <div className="k-foot"><span className={k.trend}>{k.trend === 'up' ? '▲' : '▼'}</span> {k.foot}</div>
            </div>
          ))}
        </div>

        <div className="dp-split">
          <section className="dp-card" style={{ overflow: 'visible' }}>
            <div className="dp-panel-head"><h3>Recent applicants</h3><span className="hint">Same global table system as Applicants</span></div>
            <DpTable
              columns={columns}
              rows={rows}
              footer="Showing 5 most recent registrations"
              bulkActions={[
                { label: 'Mark referred', icon: <UserRoundCheck style={{ width: 13, height: 13 }} />, run: rs => setRows(prev => prev.map(r => rs.some(x => x.id === r.id) ? { ...r, status: 'Referred' } : r)) },
                { label: 'Export CSV', icon: <Download style={{ width: 13, height: 13 }} />, run: rs => downloadCsv('recent-applicants-fixtures.csv', rs.map(r => ({ ID: r.id, Name: r.name, Position: r.position, Status: r.status }))) },
              ]}
            />
            <div style={{ padding: '9px 13px', borderTop: '1px solid var(--dp-border)' }}>
              <button type="button" className="dp-btn ghost sm">View all 1,284 applicants<ArrowRight style={{ width: 13, height: 13 }} /></button>
            </div>
          </section>

          <aside style={{ display: 'grid', gap: 12 }}>
            <section className="dp-card">
              <div className="dp-panel-head"><h3>Referral pipeline</h3><span className="hint">This month</span></div>
              <div style={{ padding: '12px 13px', display: 'grid', gap: 10 }}>
                {[['Matched', 84, 'good'], ['Referred', 52, ''], ['Interview', 31, 'mid'], ['Hired', 27, 'good']].map(([label, pct, tone]) => (
                  <div key={label as string} className="dp-skillrow" style={{ padding: 0 }}>
                    <span className="name">{label}</span>
                    <div className={`dp-progress ${tone}`}><i style={{ width: `${pct}%` }} /></div>
                    <b className="dp-score" style={{ width: 34, textAlign: 'right' }}>{pct}</b>
                  </div>
                ))}
              </div>
            </section>
            <section className="dp-card">
              <div className="dp-panel-head"><h3>Activity</h3><span className="hint">Realtime feed</span></div>
              <div>
                {ACTIVITIES.map((a, i) => (
                  <div key={i} style={{ padding: '9px 13px', borderBottom: '1px solid var(--dp-border)', fontSize: 12.5 }}>
                    <b>{a.who}</b> — {a.what}
                    <div style={{ marginTop: 2, fontSize: 12, color: 'var(--dp-text-faint)' }}>{a.when}</div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </DpWorkspace>
    </PreviewShell>
  )
}
