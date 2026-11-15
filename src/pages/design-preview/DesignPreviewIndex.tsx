import PreviewShell from './PreviewShell'

const ROUTES: { area: string; path: string; page: string; proposal: string }[] = [
  // Public
  { area: 'Public', path: '/', page: 'LandingPage', proposal: 'Split-hero wireframe below. Slim sticky nav, live stat strip, job preview, 4-step assisted-registration, tightened about/footer.' },
  { area: 'Public', path: '/about', page: 'AboutPage', proposal: 'Same public chrome. Two-column: mission/services narrative + office facts panel; partner logos kept in a slim strip.' },
  { area: 'Public', path: '/jobs', page: 'JobsPage', proposal: 'Toolbar (search, location, job type) + compact list rows instead of large cards; detail opens as a side panel on desktop, full page on mobile.' },
  { area: 'Public', path: '/how-it-works', page: 'HowItWorksPage', proposal: 'Reuse the 4-step visual process from the landing hero section, expanded with the visit checklist; remove duplicate long text blocks.' },
  { area: 'Public', path: '/contact', page: 'ContactPage', proposal: 'Keep directory + map + landmarks content; restyle into the new card system. No structural change needed.' },
  { area: 'Public', path: '/privacy · /terms', page: 'LegalPage', proposal: 'Content pages. Apply typography tokens only — max-width reading column, sticky in-page section nav.' },
  { area: 'Public', path: '/resume-maker', page: 'ResumeMakerPage', proposal: 'Form kept as-is; reskin to the shared input/button/table tokens so it matches the system.' },
  // Applicant
  { area: 'Applicant', path: '/applicant', page: 'ApplicantDashboard', proposal: 'Wireframe below: welcome hero card, next-actions, top matched jobs, referral status tracker.' },
  { area: 'Applicant', path: '/applicant/profile', page: 'ApplicantProfile', proposal: 'Single column sections (personal, education, skills, work history) with sticky section nav; resume OCR status inline.' },
  { area: 'Applicant', path: '/applicant/status', page: 'ApplicationStatus', proposal: 'Timeline layout for current applications + referral slip entry points.' },
  { area: 'Applicant', path: '/applicant/status/previous', page: 'ApplicationStatus (tab)', proposal: 'Same timeline component, archived data.' },
  { area: 'Applicant', path: '/applicant/status/referral-slip', page: 'ReferralSlipPage', proposal: 'Print-optimized document view; keep existing PDF/print logic, restyle header to brand tokens.' },
  { area: 'Applicant', path: '/applicant/jobs', page: 'ApplicantJobs', proposal: 'Wireframe below: job grid with compatibility ring, skill-gap hints, filter chips.' },
  // Admin
  { area: 'Admin', path: '/admin', page: 'AdminDashboard', proposal: 'Wireframe below: KPI row, referral pipeline mini-board, recent activity feed, quick actions.' },
  { area: 'Admin', path: '/admin/applicants', page: 'ApplicantsPage', proposal: 'Wireframe below: master-detail — searchable table left, sticky detail panel right.' },
  { area: 'Admin', path: '/admin/applicants/register', page: 'RegisterWalkIn', proposal: 'Stepped form (account → personal → education/skills → review) instead of one long page; all existing fields preserved.' },
  { area: 'Admin', path: '/admin/applicants/:id/account-receipt', page: 'ApplicantAccountReceiptPage', proposal: 'Print-optimized receipt; restyle only.' },
  { area: 'Admin', path: '/admin/companies', page: 'CompaniesPage', proposal: 'Master-detail table like Applicants; company logo + contact column; Add Company as primary action.' },
  { area: 'Admin', path: '/admin/companies/new', page: 'AddCompanyPage', proposal: 'Stepped form mirroring register flow.' },
  { area: 'Admin', path: '/admin/jobs', page: 'JobListingsPage', proposal: 'Master-detail table; status badges (draft/active/closed); vacancy count column.' },
  { area: 'Admin', path: '/admin/jobs/new', page: 'AddJobPage', proposal: 'Stepped form; skills entered as chips with the NLP-visible marker kept.' },
  { area: 'Admin', path: '/admin/matching', page: 'MatchingPage', proposal: 'Wireframe below: applicant picker left, ranked recommendations with 50/30/20 breakdown right, collapsed NLP audit.' },
  { area: 'Admin', path: '/admin/matching/:applicantId', page: 'MatchDetailsPage', proposal: 'Full breakdown: skill meters, Gemini skill-improvement panel, referral action bar.' },
  { area: 'Admin', path: '/admin/matching/:applicantId/referral', page: 'ReferralSlipPage', proposal: 'Print-optimized slip; restyle only, keep PDF logic.' },
  { area: 'Admin', path: '/admin/activities', page: 'ActivitiesPage', proposal: 'Filterable activity table (who/what/when) with type badges — replaces card stack.' },
  { area: 'Admin', path: '/admin/feedback', page: 'FeedbackAnalyticsPage', proposal: 'Analytics layout: KPI row, sentiment chart, feedback table with filters. Calculations from Batch 4 untouched.' },
  { area: 'Admin', path: '/admin/website', page: 'AdminWebsitePage', proposal: 'Editor split: live preview left, field groups right; dev fields stay under “Advanced settings”.' },
]

const SITEMAP = [
  { area: 'Public', items: 'Home · About · Jobs · How It Works · Contact · Legal (Privacy/Terms) · Resume Maker' },
  { area: 'Applicant portal', items: 'Dashboard · Profile · My Status (Current / Previous / Referral Slip) · Jobs & Matches' },
  { area: 'Admin portal', items: 'Dashboard · Applicants (+ Register walk-in, Receipt) · Companies · Jobs · Matching & Referrals (+ Details, Slip) · Activities · Feedback Analytics · Website Content' },
]

const JOURNEYS = [
  { who: 'Public visitor', flow: 'Landing → Browse Jobs → How It Works (steps + visit checklist) → Contact / visit Trabaho Center for assisted registration. No online self-registration is added.' },
  { who: 'Applicant', flow: 'Login → Dashboard (next actions) → Profile completeness → Jobs & Matches (compatibility + skill gaps) → referral status tracking.' },
  { who: 'PESO admin', flow: 'Login → Dashboard KPIs → Applicants master-detail → Matching (50/30/20 breakdown) → Referral slip → employment status → Activities log.' },
]

const TOKENS = [
  ['Top bar height', '48px (was ~64–72px across portals)'],
  ['Sidebar', '236px, collapsible to 64px icons (admin) · 220px (applicant)'],
  ['Table row', '42px, sticky header'],
  ['Controls', '36px inputs/buttons, 30px small'],
  ['Radius / shadow', '8px cards, 6px controls · single 1px shadow, no glow'],
  ['Type', 'Source Sans 3 kept · 18px root kept · density from spacing, not font size'],
  ['Brand', 'PESO red #c4161c accent on neutral surfaces; soft red tint chips/badges'],
  ['Dark mode', 'Same tokens, dark surface scale; brand red lightens to #e05252'],
]

const TABLE_SPEC = [
  ['One component', 'DpTable is reused by EVERY CRUD screen (Dashboard, Applicants, Companies, Jobs, Activities, Matching results). No per-page table styling.'],
  ['Row height', '42px, 1px --dp-border bottom, hovering row tint, selected row tints soft brand red'],
  ['Header', '11px uppercase tracking-wide labels, sticky, same background as page'],
  ['Selection', '15px checkbox on every row + select-all in header with indeterminate state'],
  ['Bulk bar', 'Appears above the table when rows are selected: “N selected” + Refer / Follow-up / Export CSV / Delete + Clear'],
  ['Row menu', '⋯ opens the same dropdown: View, Edit, module actions, Delete (red)'],
  ['Footer', '“Showing X–Y of Z” left, identical ‹ 1 2 3 › pager right'],
  ['Buttons', '36px default / 30px small, same radius, weight, and brand color everywhere'],
]

export default function DesignPreviewIndex() {
  return (
    <PreviewShell>
      <div className="dp-card" style={{ padding: '18px 20px', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.01em' }}>Batch 5 — Wireframe proposal &amp; design system</h1>
        <p style={{ marginTop: 4, fontSize: 13.5, color: 'var(--dp-text-muted)', maxWidth: '74ch' }}>
          Phase 1 audit and Phase 7 deliverables in one place. Use the tabs above to inspect each wireframe
          (desktop + mobile, light + dark). Nothing on this route touches production pages or Supabase.
        </p>
      </div>

      <div className="dp-markdown">
        <h2>1 · Complete route &amp; module inventory (27 routes audited)</h2>
      </div>
      <div className="dp-card" style={{ overflowX: 'auto' }}>
        <table className="dp-spec">
          <thead><tr><th style={{ width: 90 }}>Area</th><th style={{ width: 240 }}>Route</th><th style={{ width: 190 }}>Existing page</th><th>Proposed wireframe</th></tr></thead>
          <tbody>
            {ROUTES.map(r => (
              <tr key={r.path}>
                <td><span className={`dp-badge ${r.area === 'Admin' ? 'info' : r.area === 'Applicant' ? 'brand' : ''}`}>{r.area}</span></td>
                <td><code>{r.path}</code></td><td>{r.page}</td><td>{r.proposal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="dp-markdown">
        <h2>2 · Revised sitemap &amp; navigation hierarchy</h2>
        <ul>
          {SITEMAP.map(s => <li key={s.area}><b>{s.area}:</b> {s.items}</li>)}
          <li><b>Structural change:</b> same routes, same guards — only the shell changes. Admin gets a slim collapsible sidebar + breadcrumb + contextual toolbar; applicant keeps a simplified 5-item sidebar; public keeps a slim 60px sticky nav.</li>
        </ul>
        <h2>3 · Old → new wireframe mapping</h2>
        <ul>
          <li><b>Stacked card pages → master-detail.</b> Applicants, Companies, Jobs, Activities move from full-width card grids to a dense table (left) + sticky context panel (right), Supabase Studio style.</li>
          <li><b>Long scrolling forms → stepped forms.</b> Register walk-in, Add Company, Add Job become 3–4 step wizards with a review screen; every existing field is preserved.</li>
          <li><b>Matching page → two-pane workspace.</b> Applicant search left, ranked job matches right; 50/30/20 breakdown always visible; NLP audit trail collapsed under a disclosure.</li>
          <li><b>Landing hero → split layout.</b> Replaces the full-width dark building photo with headline/CTA left, real PESO photo right; oversized sections tightened to 1120px max-width.</li>
          <li><b>Text-heavy instructions → visual 4-step process</b> describing the actual assisted-registration flow at the Trabaho Center.</li>
        </ul>
        <h2>4 · User journeys (verified against routes)</h2>
        <ul>
          {JOURNEYS.map(j => <li key={j.who}><b>{j.who}:</b> {j.flow}</li>)}
        </ul>
        <h2>5 · Proposed design tokens (what the wireframes already use)</h2>
      </div>
      <div className="dp-card" style={{ overflowX: 'auto' }}>
        <table className="dp-spec">
          <thead><tr><th style={{ width: 170 }}>Token</th><th>Value / note</th></tr></thead>
          <tbody>{TOKENS.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
        </table>
      </div>

      <div className="dp-markdown">
        <h2>6 · Global table system — identical on every CRUD screen</h2>
        <ul><li><b>Try it live:</b> open Admin · Applicants, tick several rows, and use the bulk bar — Refer, Follow-up, Export CSV, and Delete all work on the fixtures. Open Admin · Companies: same table, same buttons, same colors, same footer.</li></ul>
      </div>
      <div className="dp-card" style={{ overflowX: 'auto' }}>
        <table className="dp-spec">
          <thead><tr><th style={{ width: 170 }}>Element</th><th>Specification (enforced by one shared component)</th></tr></thead>
          <tbody>{TABLE_SPEC.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
        </table>
      </div>
      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--dp-text-faint)' }}>
        Strict preservation: no changes to auth, Supabase, Gemini OCR / skill recommendations, sentence-transformer matching,
        thresholds (50/30/20, 60% cutoff), referral slips, realtime, analytics math, translations, or any database record.
        Waiting for your approval before any production page is modified.
      </p>
    </PreviewShell>
  )
}
