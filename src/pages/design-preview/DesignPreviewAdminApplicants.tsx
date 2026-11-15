import { useState } from 'react'
import { Download, Filter, Search, Trash2, UserPlus, UserRoundCheck, UserRoundX } from 'lucide-react'
import PreviewShell from './PreviewShell'
import DpWorkspace from './DpWorkspace'
import DpTable, { type DpCol } from './DpTable'
import { APPLICANTS, downloadCsv, type FixtureApplicant } from './fixtures'

const TABS = ['All', 'Active', 'For follow-up', 'Referred', 'Hired']

const statusTone = (s: FixtureApplicant['status']) =>
  s === 'Hired' ? 'success' : s === 'Referred' ? 'info' : s === 'For follow-up' ? 'warning' : ''

/** Record-management exemplar: identical global table + sticky detail panel. */
export default function DesignPreviewAdminApplicants() {
  const [rows, setRows] = useState<FixtureApplicant[]>(APPLICANTS)
  const [selected, setSelected] = useState(APPLICANTS[0])

  const setStatus = (ids: string[], status: FixtureApplicant['status']) =>
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, status } : r))
  const remove = (ids: string[]) => setRows(prev => prev.filter(r => !ids.includes(r.id)))

  const columns: DpCol<FixtureApplicant>[] = [
    {
      key: 'applicant', label: 'Applicant', width: '32%',
      render: a => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dp-avatar">{a.initials}</span>
          <div><div className="t-main">{a.name}</div><div className="t-sub">{a.id} · {a.location}</div></div>
        </div>
      ),
    },
    { key: 'position', label: 'Position sought', render: a => a.position },
    { key: 'education', label: 'Education', render: a => <span className="t-sub">{a.education}</span> },
    { key: 'status', label: 'Status', width: 130, render: a => <span className={`dp-badge ${statusTone(a.status)}`}><span className="dot" />{a.status}</span> },
  ]

  return (
    <PreviewShell>
      <DpWorkspace
        active="Applicants"
        crumbs={['Admin', 'Applicants']}
        title="Applicants"
        sub="1,284 registered · one global table system across every CRUD screen"
        actions={<button type="button" className="dp-btn primary"><UserPlus style={{ width: 14, height: 14 }} />Register walk-in</button>}
      >
        <div className="dp-toolbar">
          <span className="dp-topbar-search" style={{ width: 240, border: '1px solid var(--dp-border-strong)', background: 'var(--dp-panel)' }}>
            <Search style={{ width: 13, height: 13 }} />Search name, ID, position…
          </span>
          <select className="dp-select" aria-label="Filter by location"><option>All locations</option><option>Lipa City</option><option>Malvar</option><option>Sto. Tomas</option></select>
          <div className="dp-tabs" role="tablist">
            {TABS.map(t => <button key={t} type="button" className={t === 'All' ? 'on' : ''}>{t}</button>)}
          </div>
          <span className="spacer" />
          <button type="button" className="dp-btn neutral"><Filter style={{ width: 14, height: 14 }} />More filters</button>
        </div>

        <div className="dp-split">
          <section className="dp-card" style={{ overflow: 'visible' }}>
            <DpTable
              columns={columns}
              rows={rows}
              activeId={selected.id}
              onRowClick={setSelected}
              footer={`Showing 1–${rows.length} of 1,284 applicants`}
              bulkActions={[
                { label: 'Refer', icon: <UserRoundCheck style={{ width: 13, height: 13 }} />, run: rs => setStatus(rs.map(r => r.id), 'Referred') },
                { label: 'Follow-up', icon: <UserRoundX style={{ width: 13, height: 13 }} />, run: rs => setStatus(rs.map(r => r.id), 'For follow-up') },
                { label: 'Export CSV', icon: <Download style={{ width: 13, height: 13 }} />, run: rs => downloadCsv('applicants-fixtures.csv', rs.map(r => ({ ID: r.id, Name: r.name, Position: r.position, Location: r.location, Status: r.status }))) },
                { label: 'Delete', icon: <Trash2 style={{ width: 13, height: 13 }} />, danger: true, run: rs => remove(rs.map(r => r.id)) },
              ]}
              rowActions={[
                { label: 'View details', run: r => setSelected(r) },
                { label: 'Account receipt', run: () => {} },
                { label: 'Delete applicant', danger: true, run: r => remove([r.id]) },
              ]}
            />
          </section>

          <aside className="dp-card dp-detail">
            <div className="dp-panel-head"><h3>{selected.name}</h3><span className="dp-badge">{selected.id}</span></div>
            <div>
              <div className="row"><span>Position sought</span><b>{selected.position}</b></div>
              <div className="row"><span>Location</span><b>{selected.location}</b></div>
              <div className="row"><span>Phone</span><b>{selected.phone}</b></div>
              <div className="row"><span>Registered</span><b>{selected.registered}</b></div>
              <div className="row"><span>Education</span><b>{selected.education}</b></div>
              <div className="row"><span>Status</span><b>{selected.status}</b></div>
            </div>
            <div style={{ padding: '11px 13px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--dp-text-faint)' }}>Skills from profile / OCR</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                {selected.skills.map(s => <span key={s} className="dp-chip">{s}</span>)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '4px 13px 13px', flexWrap: 'wrap' }}>
              <button type="button" className="dp-btn primary sm">Match jobs</button>
              <button type="button" className="dp-btn neutral sm">Account receipt</button>
              <button type="button" className="dp-btn ghost sm">Edit profile</button>
            </div>
          </aside>
        </div>
      </DpWorkspace>
    </PreviewShell>
  )
}
