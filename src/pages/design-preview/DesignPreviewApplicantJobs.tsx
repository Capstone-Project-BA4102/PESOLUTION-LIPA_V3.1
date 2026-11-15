import { MapPin, Search } from 'lucide-react'
import PreviewShell from './PreviewShell'
import DpApplicantShell from './DpApplicantShell'
import { JOBS } from './fixtures'

const FILTERS = ['All', 'High match (≥80%)', 'Lipa City', 'Full-time', 'With openings']

/** Job discovery wireframe — compatibility + skill gaps, minimal technical clutter. */
export default function DesignPreviewApplicantJobs() {
  const sorted = [...JOBS].sort((a, b) => b.match - a.match)
  return (
    <PreviewShell>
      <DpApplicantShell active="Jobs & Matches">
        <div className="dp-pagehead" style={{ marginTop: 0 }}>
          <div><h1>Jobs &amp; matches</h1><p>Sorted by compatibility with your profile. Fixtures shown.</p></div>
        </div>

        <div className="dp-toolbar">
          <span className="dp-topbar-search" style={{ width: 240, border: '1px solid var(--dp-border-strong)', background: 'var(--dp-panel)' }}>
            <Search style={{ width: 13, height: 13 }} />Search job title or company…
          </span>
          <select className="dp-select" aria-label="Filter by location"><option>All locations</option><option>Lipa City</option><option>Malvar</option></select>
          <div className="dp-tabs">
            {FILTERS.map((f, i) => <button key={f} type="button" className={i === 0 ? 'on' : ''}>{f}</button>)}
          </div>
        </div>

        <div className="dp-job-grid">
          {sorted.map(j => {
            const strong = j.match >= 80
            const near = j.match >= 60
            return (
              <article key={j.id} className="dp-card dp-job">
                <div className="j-top">
                  <h4>{j.title}</h4>
                  <span className={`dp-badge ${strong ? 'success' : near ? 'brand' : ''}`}>{j.match}% match</span>
                </div>
                <div className="j-meta">
                  <span>{j.company}</span><span>·</span>
                  <span><MapPin style={{ width: 12, height: 12, verticalAlign: '-2px' }} /> {j.location}</span><span>·</span>
                  <span>{j.type}</span><span>·</span><span>{j.salary}</span>
                </div>
                {/* Skill overlap vs. gap — readable, no NLP jargon */}
                <div style={{ display: 'grid', gap: 3 }}>
                  {j.skills.map((s, si) => {
                    const has = (j.id.charCodeAt(5) + si) % 3 !== 0 // fixture visualization only
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                        <span style={{ width: 8, textAlign: 'center', color: has ? 'var(--dp-success)' : 'var(--dp-warning)' }}>{has ? '✓' : '＋'}</span>
                        <span style={{ color: has ? 'var(--dp-text)' : 'var(--dp-text-muted)' }}>{s}</span>
                        {!has && <span className="dp-chip" style={{ marginLeft: 'auto' }}>skill to build</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="j-foot">
                  <span style={{ fontSize: 12, color: 'var(--dp-text-faint)' }}>{j.slots} open slots · posted {j.posted}</span>
                  <button type="button" className="dp-btn primary sm">View details</button>
                </div>
              </article>
            )
          })}
        </div>
      </DpApplicantShell>
    </PreviewShell>
  )
}
