import { useState } from 'react'
import { Archive, Building2, Download, Plus, Search } from 'lucide-react'
import PreviewShell from './PreviewShell'
import DpWorkspace from './DpWorkspace'
import DpTable, { type DpCol } from './DpTable'
import { COMPANIES, downloadCsv, type FixtureCompany } from './fixtures'

/** Second CRUD module using the SAME global table — proves consistency. */
export default function DesignPreviewAdminCompanies() {
  const [rows, setRows] = useState<FixtureCompany[]>(COMPANIES)
  const [selected, setSelected] = useState<FixtureCompany>(COMPANIES[0])

  const archive = (ids: string[]) =>
    setRows(prev => prev.map(r => ids.includes(r.id) ? { ...r, status: 'Archived' as const } : r))

  const columns: DpCol<FixtureCompany>[] = [
    {
      key: 'company', label: 'Company', width: '30%',
      render: c => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dp-mono">{c.name.slice(0, 2).toUpperCase()}</span>
          <div><div className="t-main">{c.name}</div><div className="t-sub">{c.id} · {c.industry}</div></div>
        </div>
      ),
    },
    { key: 'contact', label: 'Contact person', render: c => c.contact },
    { key: 'location', label: 'Location', width: 110, render: c => c.location },
    { key: 'jobs', label: 'Active jobs', width: 100, render: c => <b className="dp-score">{c.activeJobs}</b> },
    {
      key: 'status', label: 'Status', width: 120,
      render: c => <span className={`dp-badge ${c.status === 'Active' ? 'success' : c.status === 'Paused' ? 'warning' : ''}`}><span className="dot" />{c.status}</span>,
    },
  ]

  return (
    <PreviewShell>
      <DpWorkspace
        active="Companies"
        crumbs={['Admin', 'Companies']}
        title="Companies"
        sub="58 employer partners · identical table system to Applicants"
        actions={<button type="button" className="dp-btn primary"><Plus style={{ width: 14, height: 14 }} />Add company</button>}
      >
        <div className="dp-toolbar">
          <span className="dp-topbar-search" style={{ width: 240, border: '1px solid var(--dp-border-strong)', background: 'var(--dp-panel)' }}>
            <Search style={{ width: 13, height: 13 }} />Search company or contact…
          </span>
          <select className="dp-select" aria-label="Filter by industry"><option>All industries</option><option>Hospitality</option><option>Manufacturing</option><option>Logistics</option></select>
          <span className="spacer" />
          <button type="button" className="dp-btn neutral"><Download style={{ width: 14, height: 14 }} />Export all</button>
        </div>

        <div className="dp-split">
          <section className="dp-card" style={{ overflow: 'visible' }}>
            <DpTable
              columns={columns}
              rows={rows}
              activeId={selected.id}
              onRowClick={setSelected}
              footer={`Showing 1–${rows.length} of 58 companies`}
              bulkActions={[
                { label: 'Archive selected', icon: <Archive style={{ width: 13, height: 13 }} />, danger: true, run: rs => archive(rs.map(r => r.id)) },
                { label: 'Export CSV', icon: <Download style={{ width: 13, height: 13 }} />, run: rs => downloadCsv('companies-fixtures.csv', rs.map(r => ({ ID: r.id, Company: r.name, Industry: r.industry, Contact: r.contact, Location: r.location, Status: r.status }))) },
              ]}
              rowActions={[
                { label: 'View details', run: r => setSelected(r) },
                { label: 'Edit company', run: () => {} },
                { label: 'Archive company', danger: true, run: r => archive([r.id]) },
              ]}
            />
          </section>

          <aside className="dp-card dp-detail">
            <div className="dp-panel-head"><h3>{selected.name}</h3><span className="dp-badge">{selected.id}</span></div>
            <div>
              <div className="row"><span>Industry</span><b>{selected.industry}</b></div>
              <div className="row"><span>Contact person</span><b>{selected.contact}</b></div>
              <div className="row"><span>Location</span><b>{selected.location}</b></div>
              <div className="row"><span>Active jobs</span><b>{selected.activeJobs}</b></div>
              <div className="row"><span>Headcount</span><b>{selected.headcount} employees</b></div>
              <div className="row"><span>Status</span><b>{selected.status}</b></div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '11px 13px 13px', flexWrap: 'wrap' }}>
              <button type="button" className="dp-btn primary sm"><Building2 style={{ width: 13, height: 13 }} />Post a job</button>
              <button type="button" className="dp-btn neutral sm">Edit company</button>
            </div>
          </aside>
        </div>
      </DpWorkspace>
    </PreviewShell>
  )
}
