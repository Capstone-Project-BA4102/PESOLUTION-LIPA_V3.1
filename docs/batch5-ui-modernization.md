# Batch 5 — controlled UI modernization

## Final design direction (supersedes Shadcn-primary)

Supabase Studio 80%, Linear 10%, PESOLUTION 10%. Retain PESOLUTION red; no Supabase
green branding, developer-console terminology, project/schema selectors, or new UI dependencies.

Official references reviewed on 2026-11-14:

- https://supabase.com/dashboard — redirects to the JavaScript-dependent Studio app; the web
  reader could not inspect authenticated dashboard content. No Supabase account was accessed.
- https://supabase.com/design-system
- https://supabase.com/design-system/docs/ui-patterns/layout
- https://supabase.com/design-system/docs/components/sidebar
- https://supabase.com/design-system/docs/ui-patterns/forms
- https://supabase.com/design-system/docs/typography

Applied adaptations: a bordered breadcrumb row above the page workspace; readable route names
without record IDs; focused forms/settings use a narrower container; compact collapsible
navigation; neutral surfaces, 8px card radii and restrained red actions. Existing component
APIs and business terminology remain PESOLUTION-specific. Documentation examples are inspiration,
not a request to install Supabase's internal UI packages or change the app architecture.

## Scope and checkpoint

Baseline: clean, pushed `main` at `9e0d8e1d5b59e52939db43164c0d491e2473e2f1`.
Work stays in V3.1. No production reads/writes, schema/API/backend changes, dependencies,
matching/scoring/NLP/Gemini changes, or deployment changes are part of this stage.

Four images were attached: neutral dashboard, Linear navigation, minimal login, and a job-card
motif. The existing official seal and matching UI supply the preservation reference. The
written request mentions five images; no missing reference values were invented.

## Architecture audit

- React 19, React Router 7; protected Applicant/Admin layouts share PortalLayout.
- PublicLayout owns public navigation/footer and the existing LoginModal.
- Tailwind 4 with CSS design tokens, Source Sans 3, Lucide icons, Recharts; reuse all.
- Forms, buttons, cards, tables, badges, tabs and modal primitives already exist.
- Duplicated page-specific dialogs, headings, filter bars, loading states and cards remain
  for later route-by-route migration; shared CSS alone does not complete those screens.
- English/Filipino text uses publicPreferences and portalCopy; official documents stay English.
- Authentication/session state, useQuery, realtime hooks and existing API calls remain authoritative.

## Baseline verification (2026-11-14)

- `npm test`: 157 passed, 0 failed.
- `npm run build`: passed (includes TypeScript build).
- `npm run lint`: baseline has 1 existing error and 31 warnings. The error is
  `tests/batch3-refresh.test.cjs:29` (rules-of-hooks); no unrelated test refactor was made.

## Route checklist

Every route below was inventoried from src/App.tsx. Shared shell/foundation changes apply
across routes, but **individual page redesign and end-to-end visual verification are pending**.
The isolated shell fixture is not a review of live applicant/admin records.

| Route | Existing module | Page redesign/review |
| --- | --- | --- |
| `/` | LandingPage | Pending |
| `/about` | AboutPage | Pending |
| `/jobs` | JobsPage | Pending |
| `/how-it-works` | HowItWorksPage | Pending |
| `/contact` | ContactPage | Pending |
| `/privacy` | LegalPage (privacy) | Pending |
| `/terms` | LegalPage (terms) | Pending |
| `/resume-maker` | ResumeMakerPage | Pending |
| `/applicant` | ApplicantDashboard | Pending |
| `/applicant/profile` | ApplicantProfile | Pending |
| `/applicant/status` | ApplicationStatus (current) | Pending |
| `/applicant/status/previous` | ApplicationStatus (previous) | Pending |
| `/applicant/status/referral-slip` | ReferralSlipPage | Pending |
| `/applicant/jobs` | ApplicantJobs | Pending |
| `/admin` | AdminDashboard | Pending |
| `/admin/applicants` | ApplicantsPage | Pending |
| `/admin/applicants/register` | RegisterWalkIn | Pending |
| `/admin/applicants/:applicantId/account-receipt` | ApplicantAccountReceiptPage | Pending |
| `/admin/companies` | CompaniesPage | Pending |
| `/admin/companies/new` | AddCompanyPage | Pending |
| `/admin/jobs` | JobListingsPage | Pending |
| `/admin/jobs/new` | AddJobPage | Pending |
| `/admin/matching` | MatchingPage | Pending |
| `/admin/activities` | ActivitiesPage | Pending |
| `/admin/feedback` | FeedbackAnalyticsPage (stored under pages/superadmin) | Pending |
| `/admin/website` | AdminWebsitePage (Settings navigation label) | Pending |
| `/admin/matching/:applicantId` | MatchDetailsPage | Pending |
| `/admin/matching/:applicantId/referral` | ReferralSlipPage | Pending |

| `/login` | Redirect to `/`; login is a modal | Preserve redirect; modal review pending |
| `*` | Redirect to `/` | Preserve fallback |

Additional workflow checklist:

- [x] LoginModal: compact shared dialog, password visibility, duplicate-submit guard, failure retry
  and existing role redirect verified against the isolated auth fixture (not live authentication).
- [ ] FirstLoginPasswordGate and PasswordChangeForm.
- [ ] Assisted registration, credential reset/email setup and account receipt.
- [ ] Applicant profile, photo and resume workflows.
- [ ] Current/previous applications and referral preview/download/print.
- [ ] Job details, matching audit, improvement plan and NLP evidence tables.
- [ ] Admin applicant/company/job management dialogs and filters.
- [ ] Referral issuance/status confirmations, duplicate and closed-job safeguards.
- [ ] Dashboard charts, report download and analytics filters.
- [ ] Activities, feedback analytics and Settings forms.

No separate signup, email verification or forgot-password/recovery routes exist. Do not invent
third-party auth, verification, registration or recovery behavior to match an illustration.

## Stage status

1. **Foundation delivered:** complete route inventory, baseline, neutral light/dark ramps,
   existing PESO red/semantic colors, compact shared buttons/inputs/headings/cards/tables/tabs,
   reusable accessible icon button and shared dialog keyboard/focus handling.
2. **Shared shell delivered:** slim public/portal toolbar, official logo, collapsible desktop
   sidebar with optional local UI preference, mobile drawer, skip link, real account identity,
   language/theme controls, existing logout confirmation and session-warning mounting.
3. **Partial:** compact LoginModal delivered and browser-verified. Public page contents and
   first-login/password-management workflow-specific layouts remain pending.
4. **Pending:** all Applicant page contents and workflow-specific responsive review.
5. **Pending:** all Admin page contents and workflow-specific responsive review.
6. **Partial:** reduced motion, focus handling and shared primitives; page-specific dialogs,
   menus, notifications, loading/error states and full localization consistency remain pending.
7. **Partial:** shell browser checks/build/regressions only; full route comparison remains pending.

Do not describe the entire Batch 5 as complete until all checklist entries have been reviewed.

## Design choices and document protection

Neutral zinc-style surfaces replace blue-grey chrome. PESO red remains the primary action and
active-navigation accent; semantic status colors remain unchanged. Header height is 60px;
sidebar is 248px expanded / 72px collapsed. Breadcrumbs occupy a separate 40px row,
and focused forms/settings use a 1040px maximum workspace. Shared controls are 40px, compact actions 32px,
with minimum 44px targets on coarse-pointer devices. Reduced-motion preference disables
transitions/animations. No animation or mock result delays were introduced.

The root rem scale is unchanged to avoid resizing existing official referral/account documents.
No document content, PDF/print implementation, job matching data, or analytics was changed.
Route-specific excess whitespace/typography will be addressed in stages 3–5.

## Files and purpose

- `src/index.css`: neutral surface tokens, density/motion/touch tokens and reduced-motion support.
- `src/components/ui/{Button,Card,Form,PageHeader,Table,Tabs}.tsx`: compact shared presentation;
  form description/error associations and arrow/Home/End keyboard navigation for local tabs.
- `src/components/ui/SearchableSelect.tsx`: inherits shared control density; associated hint.
- `src/components/ui/{IconButton,useDialog,Modal}.tsx` (hook is `.ts`): named icon actions;
  reusable focus/scroll behavior, stacked dialogs, translated close and portal rendering.
- `src/components/ui/{Logo,LanguageToggle,ThemeToggle}.tsx`: compact branding and neutral toolbar mode;
  existing brand mode is retained for other callers.
- `src/components/ui/index.ts`: IconButton export.
- `src/components/auth/LoginModal.tsx`: minimal single-column login using the shared Modal,
  existing username/password auth calls and role redirect; loading/duplicate-submit protection.
- `src/components/layout/{PortalLayout,PublicLayout}.tsx`: shared shell modernization only.
- `src/lib/portalCopy/chrome.ts`: new navigation accessibility translations.
- `tests/ui/batch5-preview.mjs`: isolated synthetic React fixture; rejects Supabase imports.
- `tests/ui/batch5-browser.mjs`: repeatable real-browser interaction/layout regression checks.

## Latest verification

- 157 Node/backend regression tests passed, 0 failed.
- Frontend production build passed, including TypeScript.
- 18 isolated real-browser checks passed: breadcrumbs/record-ID privacy, focused form widths,
  1440px desktop, 768px tablet, 390px and 360px touch layouts, 44px touch controls, sidebar
  persistence, form error descriptions, keyboard tabs, nested dialog focus/scroll handling,
  searchable dropdown, mobile navigation, Filipino labels, session warning/keep-alive,
  confirmed logout, Applicant/public shells, login failure/retry/redirect, reduced motion,
  and no browser runtime exceptions.
- Full lint: same 1 error / 31 warnings as baseline. Focused UI lint: 0 errors / 6 existing warnings.
- `git diff --check`: passed.
- Screenshots were visually inspected for desktop light, mobile dark navigation and compact login.
  They show synthetic fixture records, not a redesigned live dashboard or production data.
- Official referral PDF rendering and all real route workflows remain on the final review checklist.

Local screenshots: `logs/batch5-shell-desktop-light.png`, `logs/batch5-shell-desktop-dark.png`,
`logs/batch5-shell-tablet-dark.png`, `logs/batch5-shell-mobile-menu-dark.png`,
`logs/batch5-shell-applicant-mobile-dark.png`, `logs/batch5-shell-public-desktop-dark.png`,
`logs/batch5-login-dark.png`, `logs/batch5-login-mobile-dark.png`.

## Local shell verification

No new packages are needed. In PowerShell from the V3.1 root:

```powershell
node tests/ui/batch5-preview.mjs
```

In a second PowerShell window (separate profile, headless browser, no real app login):

```powershell
Start-Process -FilePath 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' -WindowStyle Hidden -ArgumentList '--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9340',('--user-data-dir=' + (Join-Path $PWD 'logs/batch5-browser')),'http://127.0.0.1:8777/fixture'
node tests/ui/batch5-browser.mjs
```

The checker closes only its own test browser. Stop the fixture with Ctrl+C. Generated screenshots
and results are under ignored `logs/batch5-*`. They contain synthetic UI records, not live data.
Baseline/result logs are kept locally under ignored logs. Build/test commands are unchanged.

## Rollback between stages

The clean baseline commit remains untouched. Ignored `logs/batch5-stage1.patch` and
`logs/batch5-stage2.patch` and `logs/batch5-stage3-auth.patch` preserve reviewable tracked changes separately; new foundation files
are copied into `logs/batch5-checkpoint/`. No force reset, deletion, or history rewrite was run.
Review with git diff before continuing. Do not remove unrelated work when rolling back.


## Staff-requested refinement pass (2026-11-14)

Implemented: hidden always-visible session countdown (inactivity protection/warning retained);
transaction-specific Recent Activities icons/badges; removed counts explanation and report-period
notice; corrected zero/one/many match labels, including historical logs at display time;
full-width Applicants table with right-side detail drawer and shared nested dialogs; compact
Job Listings with qualification summaries and full detail access; Matching summary subscribes
to job_matches/job_listings/resumes and ignores inactive jobs in match counts.

Activities provides preview + confirmed cleanup of only expired (30-day), unused runtime cache
JSON. It never deletes activity history, saved matching scores, recommendations or model assets.
Feedback provides selected-review removal confirmation; application/referral links and prior
acknowledgement history remain. No real saved review or runtime cache was deleted during testing.

Additional files: backend/cache-maintenance.cjs, backend/feedback-moderation.cjs,
backend/app.cjs route wiring, backend/matching-refresh.cjs maintenance hooks,
components/admin/CacheCleanup.tsx, components/shared/ActivityPresentation.tsx,
components/shared/JobQualificationSummary.tsx, components/ui/Drawer.tsx and Drawer.css,
lib/activityPresentation.ts, lib/feedbackModeration.ts, affected Admin pages and translations.

171 regression tests passed, including cache filesystem-scope/age/permissions/confirmation tests,
selected review removal/permissions/history preservation tests, and match-label tests.
New list/drawer/feedback workflows still need a complete visual/end-to-end review. Earlier
18 browser checks cover the shared shell/login, not every newly modified workflow.


## Avatar, renewal and Feedback Analytics consistency pass

- EditApplicantModal now includes a separate Save Avatar control: JPG/PNG/WebP up to 2 MB,
  linked profile ID, existing avatars/<profile-id>/profile.png object, cache-busted preview.
  Supabase's existing admin storage policies are retained. Applicant list reloads immediately;
  portal avatar refreshes on an upload event or next window focus. No production upload tested.
- Renewal now requires a resume-review prompt: upload PDF/JPG/PNG up to 10 MB, or explicitly
  confirm the existing resume remains current. Upload creates a new resumes object/record,
  preserving prior files and verified skills; it does not silently run OCR or replace skills.
  A duplicate-submit guard prevents repeated renewal requests. If record saving fails after
  upload, the error is reported; no old resume is deleted.
- Feedback Analytics uses shared Card borders/radius/shadows and compact KPI/panel spacing;
  navigation and page heading use Star. Shared badges/filter bars are denser across consumers.
- Additional source: src/lib/applicantFiles.ts. Changed EditApplicantModal, ApplicantsPage,
  PortalLayout, avatar lookup in api.ts, FeedbackAnalyticsPage, App.tsx, Badge and GlobalFilterBar,
  plus adminOps translations. Added tests/applicant-files.test.cjs.
- Verification: 176 regression tests passed; five upload tests use mock storage/database only.
  Production build/TypeScript passed; focused lint has no errors; git diff --check passed.
- Full browser/workflow review of these new upload controls remains pending. All route-level
  redesign items above remain explicit; shared styling is not a substitute for reviewing them.
- Reference: https://supabase.com/design-system/docs/ui-patterns/forms (reviewed 2026-11-14).
