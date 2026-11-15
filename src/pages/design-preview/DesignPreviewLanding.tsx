import { useMemo, useState } from 'react'
import {
  ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Clock3, Download, FileText,
  Landmark, LogIn, MapPin, Search, UserRoundCheck,
} from 'lucide-react'
import PreviewShell from './PreviewShell'
import { JOBS } from './fixtures'

const STEPS = [
  { title: 'Prepare your documents', text: 'Bring an updated resume and a valid government ID. Your applicant photo is captured onsite.' },
  { title: 'Register with PESO staff', text: 'Registration is assisted at the Trabaho Center — staff create your applicant account and encode your details.' },
  { title: 'Get matched to jobs', text: 'Your skills and education are matched to active vacancies using PESO’s skills-based matching.' },
  { title: 'Receive a referral', text: 'Qualified applicants receive an official PESO referral slip to present to the employer.' },
]

const PORTAL_USES = [
  'Review rule-based job match scores and skill requirements',
  'See matched skills, skill gaps, and improvement suggestions',
  'Request and monitor PESO employment referrals',
  'Track current and previous application status',
]

const CATEGORIES: { label: string; match: (title: string) => boolean }[] = [
  { label: 'All jobs', match: () => true },
  { label: 'Clerical', match: t => /administrative|clerk|customer service/i.test(t) },
  { label: 'Hotel & tourism', match: t => /hotel|front desk/i.test(t) },
  { label: 'Production', match: t => /production|operator/i.test(t) },
  { label: 'Logistics', match: t => /warehouse|delivery|driver/i.test(t) },
]

export default function DesignPreviewLanding() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All jobs')

  const jobs = useMemo(() => {
    const cat = CATEGORIES.find(c => c.label === category) ?? CATEGORIES[0]
    const q = query.trim().toLowerCase()
    return JOBS.filter(j => cat.match(j.title) && (!q || `${j.title} ${j.company} ${j.skills.join(' ')}`.toLowerCase().includes(q)))
  }, [query, category])

  return (
    <PreviewShell wide>
      {/* Slim sticky public nav */}
      <nav className="dp-nav">
        <span className="dp-topbar-logo"><img src="/logo-lipa.png" alt="" />PESOLUTION <span style={{ color: 'var(--dp-brand)' }}>Lipa</span></span>
        <div className="dp-nav-links">
          <a href="#" className="on" onClick={e => e.preventDefault()}>Home</a>
          <a href="#" onClick={e => e.preventDefault()}>About</a>
          <a href="#dp-jobs">Job Opportunities</a>
          <a href="#dp-steps">How It Works</a>
          <a href="#" onClick={e => e.preventDefault()}>Contact</a>
        </div>
        <div className="dp-nav-right">
          <button type="button" className="dp-btn ghost sm">EN · FIL</button>
          <button type="button" className="dp-btn neutral sm">Sign in</button>
        </div>
      </nav>

      {/* Hero: headline + live job search beside the real city hall photo */}
      <header className="dp-hero">
        <div>
          <p className="dp-eyebrow">Lipa City Public Employment Service Office</p>
          <h1 style={{ marginTop: 10 }}>Local jobs, matched to <em>your real skills.</em></h1>
          <p className="lead">
            PESO Lipa connects job seekers with employers through assisted registration,
            skills-based matching, and official referrals — free, at the Trabaho Center.
          </p>
          <div className="dp-search" role="search" style={{ marginTop: 18 }}>
            <label className="field" style={{ flex: 2 }}>
              <Search style={{ width: 15, height: 15 }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search job title, company, or skill" aria-label="Search jobs" />
            </label>
            <span className="div" />
            <label className="field" style={{ flex: 1 }}>
              <MapPin style={{ width: 15, height: 15 }} />
              <select className="dp-select" style={{ border: 0, padding: 0, height: 'auto', background: 'transparent', flex: 1 }} aria-label="Location">
                <option>All of Lipa City</option><option>Lipa City</option><option>Malvar</option><option>Sto. Tomas</option><option>Cuenca</option>
              </select>
            </label>
            <a href="#dp-jobs" className="dp-btn primary"><Search style={{ width: 14, height: 14 }} />Search</a>
          </div>
          <div className="dp-chiprow" style={{ marginTop: 12 }}>
            {CATEGORIES.map(c => (
              <button key={c.label} type="button" className={`dp-chip ${category === c.label ? 'on' : ''}`} onClick={() => setCategory(c.label)}>{c.label}</button>
            ))}
          </div>
          <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--dp-text-faint)' }}>
            Registration is assisted by PESO staff at the Trabaho Center — there is no online self-registration.
          </p>
        </div>
        <figure className="dp-hero-photo" style={{ margin: 0 }}>
          <img src="/new-city-hall-building.jpg" alt="New Lipa City Hall, Barangay Bulacnin" />
          <figcaption className="cap" style={{ top: 10, bottom: 'auto' }}>New Lipa City Hall · Brgy. Bulacnin, Lipa City</figcaption>
          <div className="dp-floatcard" aria-hidden="true">
            <div><b>46</b><span>active postings</span></div>
            <div><b>132</b><span>open vacancies</span></div>
          </div>
        </figure>
      </header>

      {/* Institutional trust strip — real assets already used by the live site */}
      <section className="dp-trust" aria-label="Public employment service network">
        <div className="dp-trust-in">
          <span className="lbl">Public employment service network</span>
          <img src="/bagong-lipa-logo.png" alt="Bagong Lipa" />
          <img src="/peso-philippines-logo.png" alt="Public Employment Service Office" />
          <img src="/dole-logo.png" alt="Department of Labor and Employment" />
        </div>
      </section>

      {/* Employment overview — values come from the live system in production */}
      <section className="dp-strip" aria-label="Employment overview">
        <div className="dp-strip-in">
          <div className="s" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <BriefcaseBusiness style={{ width: 18, height: 18, color: 'var(--dp-brand)', marginTop: 3 }} />
            <div><span className="live">● Live from the system</span><b>46</b><span>Active job postings</span></div>
          </div>
          <div className="s" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <UserRoundCheck style={{ width: 18, height: 18, color: 'var(--dp-brand)', marginTop: 3 }} />
            <div><span className="live">● Live from the system</span><b>132</b><span>Open vacancies today</span></div>
          </div>
          <div className="s" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Clock3 style={{ width: 18, height: 18, color: 'var(--dp-brand)', marginTop: 3 }} />
            <div><span className="live">● Office</span><b style={{ fontSize: 16 }}>Office hours</b><span>As posted by PESO · Trabaho Center, Bulacnin</span></div>
          </div>
        </div>
      </section>

      {/* Job opportunities — live search results */}
      <section className="dp-section" id="dp-jobs">
        <div className="dp-section-head">
          <div>
            <p className="dp-eyebrow">Job opportunities</p>
            <h2 style={{ marginTop: 4 }}>Open positions right now</h2>
            <p>{jobs.length} {jobs.length === 1 ? 'opening matches' : 'openings match'} “{category === 'All jobs' ? 'all jobs' : category}”{query && ` · “${query}”`} — sample records in this wireframe.</p>
          </div>
          <button type="button" className="dp-btn neutral sm">View all jobs<ArrowRight style={{ width: 14, height: 14 }} /></button>
        </div>
        {jobs.length ? (
          <div className="dp-job-grid">
            {jobs.slice(0, 3).map(j => (
              <article key={j.id} className="dp-card dp-job">
                <div className="j-top">
                  <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                    <span className="dp-mono">{j.company.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <h4>{j.title}</h4>
                      <p style={{ fontSize: 12, color: 'var(--dp-text-muted)', marginTop: 1 }}>{j.company}</p>
                    </div>
                  </div>
                  <span className="dp-chip">{j.slots} slots</span>
                </div>
                <div className="j-meta">
                  <span><MapPin style={{ width: 12, height: 12, verticalAlign: '-2px' }} /> {j.location}</span>
                  <span>·</span><span>{j.type}</span><span>·</span><span>{j.salary}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>{j.skills.slice(0, 3).map(s => <span key={s} className="dp-chip">{s}</span>)}</div>
                <div className="j-foot">
                  <span style={{ fontSize: 12, color: 'var(--dp-text-faint)' }}>Posted {j.posted}</span>
                  <button type="button" className="dp-btn soft sm">View job</button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="dp-card dp-empty">No openings match that search. Try another keyword or category.</div>
        )}
      </section>

      {/* Assisted-registration process + what to bring */}
      <section className="dp-section" id="dp-steps" style={{ paddingTop: 8 }}>
        <div className="dp-section-head">
          <div>
            <p className="dp-eyebrow">How it works</p>
            <h2 style={{ marginTop: 4 }}>How to get referred</h2>
            <p>The actual PESO Lipa assisted-registration and referral flow.</p>
          </div>
        </div>
        <div className="dp-pair" style={{ gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', alignItems: 'stretch' }}>
          <div className="dp-steps tight">
            {STEPS.map(s => (
              <div key={s.title} className="dp-card dp-step"><h4>{s.title}</h4><p>{s.text}</p></div>
            ))}
          </div>
          <aside className="dp-card" style={{ padding: 15 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700 }}>What to bring</h4>
            <ul className="dp-check-list" style={{ marginTop: 9 }}>
              {['Updated resume', 'Valid government-issued ID', 'Applicant photo is captured onsite'].map(item => (
                <li key={item}><CheckCircle2 style={{ width: 15, height: 15, color: 'var(--dp-success)', flex: 'none', marginTop: 1 }} />{item}</li>
              ))}
            </ul>
            <p style={{ marginTop: 10, fontSize: 11.5, color: 'var(--dp-text-faint)', lineHeight: 1.5 }}>
              Requirements may vary by service. Call the office before visiting if you need confirmation.
            </p>
          </aside>
        </div>
      </section>

      {/* Resume maker — existing feature preserved */}
      <section className="dp-section" style={{ paddingTop: 8 }}>
        <div className="dp-card dp-pair" style={{ padding: 18 }}>
          <div>
            <p className="dp-eyebrow">Accepted resume format</p>
            <h3 style={{ marginTop: 4, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Build a PESO-ready resume in your browser</h3>
            <p style={{ marginTop: 5, fontSize: 13.5, color: 'var(--dp-text-muted)', maxWidth: '54ch' }}>
              The Resume Maker follows the format PESO personnel expect — hard skills, soft skills, and clear work history.
              It runs entirely in your browser and does not save personal data.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button type="button" className="dp-btn primary sm"><FileText style={{ width: 13, height: 13 }} />Create resume</button>
              <button type="button" className="dp-btn neutral sm"><Download style={{ width: 13, height: 13 }} />Sample template</button>
            </div>
          </div>
          <div className="dp-mini-paper" aria-hidden="true">
            <div className="head"><span>JUAN DELA CRUZ</span><FileText style={{ width: 15, height: 15 }} /></div>
            <div style={{ padding: '11px 14px', display: 'grid', gap: 8 }}>
              {['Contact and Lipa address', 'Education', 'Hard skills', 'Soft skills', 'Work experience'].map(s => (
                <div key={s}>
                  <p style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--dp-brand)' }}>{s}</p>
                  <div className="ui-skeleton" style={{ height: 5, marginTop: 4, width: `${60 + s.length * 2}%`, borderRadius: 3 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Applicant portal benefits */}
      <section className="dp-section" style={{ paddingTop: 6 }}>
        <div className="dp-pair rev">
          <div>
            <p className="dp-eyebrow">Applicant portal</p>
            <h3 style={{ marginTop: 4, fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>Your matches, referrals, and status in one place</h3>
            <p style={{ marginTop: 5, fontSize: 13.5, color: 'var(--dp-text-muted)' }}>
              Applicants registered at the Trabaho Center receive portal access from PESO staff.
            </p>
            <button type="button" className="dp-btn neutral sm" style={{ marginTop: 12 }}><LogIn style={{ width: 13, height: 13 }} />Complete applicant guide</button>
          </div>
          <ul className="dp-check-grid">
            {PORTAL_USES.map(item => (
              <li key={item}>
                <CheckCircle2 style={{ width: 15, height: 15, color: 'var(--dp-success)', flex: 'none', marginTop: 1 }} />{item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Announcements — CMS-driven; honest empty state for the wireframe */}
      <section className="dp-section" style={{ paddingTop: 8 }}>
        <div className="dp-section-head">
          <div><p className="dp-eyebrow">Updates</p><h2 style={{ marginTop: 4 }}>Announcements</h2></div>
        </div>
        <div className="dp-card" style={{ padding: '18px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <CalendarDays style={{ width: 20, height: 20, color: 'var(--dp-brand)', flex: 'none' }} />
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 600 }}>No announcements published yet</p>
            <p style={{ fontSize: 12.5, color: 'var(--dp-text-muted)', marginTop: 2 }}>
              Official advisories from PESO Lipa appear here as CMS-managed cards with publish dates and links.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="dp-cta-band" style={{ paddingBottom: 4 }}>
        <div className="dp-cta-in">
          <div>
            <h2>Ready to find work? Visit the Trabaho Center.</h2>
            <p><Landmark style={{ width: 13, height: 13, verticalAlign: '-2px' }} /> New Lipa City Hall, Areza Estate, Barangay Bulacnin, Lipa City</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="dp-btn neutral"><Search style={{ width: 14, height: 14 }} />Browse jobs</button>
            <button type="button" className="dp-btn ghost" style={{ color: '#fff' }}>Contact office<ArrowRight style={{ width: 14, height: 14 }} /></button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="dp-footer">
        <div className="dp-footer-in">
          <div>
            <h5>PESOLUTION · PESO Lipa City</h5>
            <p>Public Employment Service Office, New Lipa City Hall, Areza Estate, Barangay Bulacnin, Lipa City, Batangas.</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, alignItems: 'center' }}>
              <img src="/bagong-lipa-logo.png" alt="Bagong Lipa" style={{ height: 20, width: 'auto' }} />
              <img src="/peso-philippines-logo.png" alt="PESO" style={{ height: 22, width: 'auto' }} />
              <img src="/dole-logo.png" alt="DOLE" style={{ height: 22, width: 'auto' }} />
            </div>
          </div>
          <div>
            <h5>Explore</h5>
            <a href="#" onClick={e => e.preventDefault()}>About PESO</a>
            <a href="#dp-jobs">Job opportunities</a>
            <a href="#dp-steps">How it works</a>
            <a href="#" onClick={e => e.preventDefault()}>Resume maker</a>
          </div>
          <div>
            <h5>Support</h5>
            <a href="#" onClick={e => e.preventDefault()}>Contact the office</a>
            <a href="#" onClick={e => e.preventDefault()}>Privacy policy</a>
            <a href="#" onClick={e => e.preventDefault()}>Terms of use</a>
          </div>
        </div>
      </footer>
    </PreviewShell>
  )
}
