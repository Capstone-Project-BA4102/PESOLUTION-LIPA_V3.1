import { useState } from 'react'
import { FileText, UserRoundCheck } from 'lucide-react'
import PreviewShell from './PreviewShell'
import DpWorkspace from './DpWorkspace'
import DpTable, { type DpCol } from './DpTable'
import { APPLICANTS, JOBS, MATCH_AUDIT, type FixtureJob } from './fixtures'

const recommended = JOBS.filter(j => j.match >= 60).sort((a, b) => b.match - a.match)

/** Detailed Matching & Referrals wireframe — 50/30/20 breakdown, collapsed NLP audit, bulk refer. */
export default function DesignPreviewAdminMatching() {
  const applicant = APPLICANTS[0]
  const [referred, setReferred] = useState<string[]>(['Hotel Front Desk Officer'])

  const columns: DpCol<FixtureJob>[] = [
    {
      key: 'job', label: 'Job', width: '30%',
      render: j => <div><div className="t-main">{j.title}</div><div className="t-sub">{j.company} · {j.location} · {j.slots} slots</div></div>,
    },
    {
      key: 'match', label: 'Compatibility', width: 150,
      render: j => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className={`dp-progress ${j.match >= 80 ? 'good' : 'mid'}`} style={{ flex: 1 }}><i style={{ width: `${j.match}%` }} /></div>
          <b className="dp-score">{j.match}%</b>
        </div>
      ),
    },
    {
      key: 'parts', label: '50 / 30 / 20 breakdown',
      render: j => (
        <div>
          <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
            <span>Hard <b className="dp-score">{j.matchParts.hard}</b></span>
            <span>Soft <b className="dp-score">{j.matchParts.soft}</b></span>
            <span>Educ <b className="dp-score">{j.matchParts.education}</b></span>
          </div>
          <div className="t-sub" style={{ marginTop: 2 }}>Matched: {j.skills.slice(0, 2).join(' · ')}</div>
        </div>
      ),
    },
    {
      key: 'actions', label: 'Actions', width: 200,
      render: j => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="dp-btn primary sm" onClick={() => setReferred(prev => prev.includes(j.title) ? prev : [...prev, j.title])}>
            {referred.includes(j.title) ? 'Referred ✓' : 'Refer'}
          </button>
          <button type="button" className="dp-btn neutral sm">Full breakdown</button>
        </div>
      ),
    },
  ]

  return (
    <PreviewShell>
      <DpWorkspace
        active="Matching"
        crumbs={['Admin', 'Matching', applicant.name]}
        title="Matching & Referrals"
        sub="Smart matching runs automatically; admin reviews scores and manages referrals. Thresholds unchanged (60% cutoff, 50/30/20 scoring)."
      >
        <div className="dp-split">
          <section className="dp-card" style={{ padding: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dp-avatar lg">{applicant.initials}</span>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{applicant.name}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--dp-text-muted)' }}>{applicant.id} · {applicant.position} · {applicant.location}</p>
              </div>
              <button type="button" className="dp-btn neutral sm" style={{ marginLeft: 'auto' }}>Change applicant</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
              {applicant.skills.map(s => <span key={s} className="dp-chip">{s}</span>)}
              <span className="dp-chip" style={{ background: 'var(--dp-brand-soft)', color: 'var(--dp-brand)' }}>{applicant.education}</span>
            </div>
          </section>

          <section className="dp-card" style={{ padding: 13 }}>
            <h3 style={{ fontSize: 13.5, fontWeight: 700 }}>How the score is computed</h3>
            <div className="dp-meter" style={{ marginTop: 8 }}>
              <div className="m ok"><b>Hard Skills · 50%</b><span>Weighted technical skill overlap from sentence embeddings.</span></div>
              <div className="m warn"><b>Soft Skills · 30%</b><span>Behavioral/work-style similarity from profile text.</span></div>
              <div className="m"><b>Education · 20%</b><span>Attainment vs. job requirement level.</span></div>
            </div>
          </section>
        </div>

        <section className="dp-card" style={{ marginTop: 12, overflow: 'visible' }}>
          <div className="dp-panel-head">
            <h3>Recommended jobs for {applicant.name.split(' ')[0]} — {recommended.length} above the 60% cutoff</h3>
            <span className="hint">Below cutoff hidden · “Show all” available</span>
          </div>
          <DpTable
            columns={columns}
            rows={recommended}
            footer={`${recommended.length} recommended jobs · tick rows to refer in bulk`}
            bulkActions={[
              { label: 'Refer selected jobs', icon: <UserRoundCheck style={{ width: 13, height: 13 }} />, run: rs => setReferred(prev => Array.from(new Set([...prev, ...rs.map(r => r.title)]))) },
              { label: 'Export CSV', icon: <FileText style={{ width: 13, height: 13 }} />, run: () => {} },
            ]}
          />

          <details style={{ borderTop: '1px solid var(--dp-border)' }}>
            <summary style={{ cursor: 'pointer', padding: '10px 13px', fontSize: 13, fontWeight: 700, color: 'var(--dp-text-muted)' }}>
              NLP matching audit — technical detail, collapsed by default
            </summary>
            <table className="dp-table" style={{ borderTop: '1px solid var(--dp-border)' }}>
              <thead><tr><th>Extracted skill</th><th>Source</th><th>Applicant vector</th><th>Job vector</th><th>Explanation</th></tr></thead>
              <tbody>
                {MATCH_AUDIT.map(m => (
                  <tr key={m.skill}>
                    <td className="t-main">{m.skill}</td>
                    <td className="t-sub">{m.source}</td>
                    <td className="dp-score">{m.applicant.toFixed(2)}</td>
                    <td className="dp-score">{m.job.toFixed(2)}</td>
                    <td className="t-sub">{m.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ padding: '9px 13px', fontSize: 12, color: 'var(--dp-text-faint)' }}>
              Local sentence-transformer embeddings + cosine similarity. This panel explains match results to admins; applicants never see it.
            </p>
          </details>
        </section>

        <section className="dp-card" style={{ marginTop: 12 }}>
          <div className="dp-panel-head"><h3>Referral &amp; employment status</h3><span className="hint">Admin-managed · slip PDF unchanged</span></div>
          <div style={{ padding: '11px 13px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            {referred.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--dp-text-faint)' }}>No referrals yet for {applicant.name}.</span>}
            {referred.map(title => (
              <span key={title} className="dp-badge info"><span className="dot" />Referred — {title}</span>
            ))}
            <span className="dp-badge warning"><span className="dot" />For follow-up — interview Nov 18</span>
            <button type="button" className="dp-btn neutral sm">Update status</button>
            <button type="button" className="dp-btn ghost sm">Print referral slip</button>
          </div>
        </section>
      </DpWorkspace>
    </PreviewShell>
  )
}
