import { ArrowRight, MapPin } from 'lucide-react'
import PreviewShell from './PreviewShell'
import DpApplicantShell from './DpApplicantShell'
import { JOBS } from './fixtures'

export default function DesignPreviewApplicantDashboard() {
  const top = JOBS.filter(j => j.match >= 60).sort((a, b) => b.match - a.match).slice(0, 3)
  return (
    <PreviewShell>
      <DpApplicantShell active="Dashboard">
        {/* Welcome hero — friendly, not a database console */}
        <section className="dp-card dp-hero-card">
          <p className="hi">Welcome back</p>
          <h2>Hi Maria — 3 jobs match your profile this week.</h2>
          <p>Your profile is 92% complete. Finish your work history so matching gets even more accurate.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button type="button" className="dp-btn primary sm">Complete my profile</button>
            <button type="button" className="dp-btn neutral sm">View my referral status</button>
          </div>
        </section>

        {/* Referral status tracker */}
        <section className="dp-card" style={{ marginTop: 12 }}>
          <div className="dp-panel-head"><h3>My application status</h3><span className="hint">Official PESO referrals only</span></div>
          <div style={{ padding: '11px 13px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="dp-badge info"><span className="dot" />Referred — Hotel Front Desk Officer</span>
            <span className="dp-badge warning"><span className="dot" />For interview — Nov 18, 9:00 AM</span>
            <span className="dp-badge success"><span className="dot" />Hired — Production Operator (previous)</span>
          </div>
        </section>

        {/* Top matches */}
        <section style={{ marginTop: 16 }}>
          <div className="dp-section-head" style={{ marginBottom: 10 }}>
            <div><h2 style={{ fontSize: 17 }}>Top matches for you</h2><p>Compatibility from your skills, experience, and education.</p></div>
            <button type="button" className="dp-btn neutral sm">Browse all jobs<ArrowRight style={{ width: 13, height: 13 }} /></button>
          </div>
          <div className="dp-job-grid">
            {top.map(j => (
              <article key={j.id} className="dp-card dp-job">
                <div className="j-top">
                  <h4>{j.title}</h4>
                  <span className={`dp-badge ${j.match >= 80 ? 'success' : 'brand'}`}>{j.match}% match</span>
                </div>
                <div className="j-meta"><span>{j.company}</span><span>·</span><span><MapPin style={{ width: 12, height: 12, verticalAlign: '-2px' }} /> {j.location}</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{j.skills.map(s => <span key={s} className="dp-chip">{s}</span>)}</div>
                <div className="j-foot">
                  <span style={{ fontSize: 12, color: 'var(--dp-text-faint)' }}>{j.salary}</span>
                  <button type="button" className="dp-btn soft sm">See why I match</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </DpApplicantShell>
    </PreviewShell>
  )
}
