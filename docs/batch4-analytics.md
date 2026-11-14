# Batch 4 — Prescriptive and descriptive analytics

Implemented in PESOLUTION-LIPA_V3.1 only. No database writes, migrations, RLS changes, new packages, model changes or deployment changes were performed. Batches 1–3 were preserved. Batch 5 was not started. The pre-work tracked diff/status are in ignored `logs/batch4-start.patch` and `logs/batch4-start-status.txt` (not a complete untracked-file backup or a Git commit).

## Audit before implementation

- The Admin Dashboard used frontend `fetchDashboard`: count queries ignored errors, all companies/listings were labeled Active, and retained job_match creation dates were presented as a matching-event trend. Match rows can be updated/replaced, so they are not an immutable event history.
- Recharts was already installed. Existing Card, StatCard, Input/Select, Button, QueryState, useQuery, useLiveRefresh and portal translations could be reused.
- Reporting & Analytics is the existing weekly/monthly SummaryReportCard modal and PDF export. Its independent period selection, export implementation, format and payload were left unchanged. The new Employment Analytics section is part of the existing Admin Dashboard; no navigation/route redesign was added.
- Applicant matching already supplies actual scores, hard/soft matched and missing arrays, saved NLP evidence and protected cached Gemini recommendation GET endpoints. Batch 3 already controls automatic matching, cache invalidation and refresh.
- The database has applicant registration dates and job posting dates. Remaining vacancy counts and application status are current fields; there is no complete historical vacancy-balance or deleted-listing history. These are labeled as snapshots instead of reconstructed trends.

## Research objectives and presentation

| Objective | Implementation |
| --- | --- |
| 3.1 Skill gap detection | Separate Hard/Soft coverage bars, matched/required counts and existing matched/missing tags. Existing NLP table remains accessible. No new equivalence or score calculation. |
| 3.2 Job recommendations | Ranked horizontal comparison of saved compatible jobs (60–100%), initially five with View All. Shows actual overall, Hard, Soft and Education percentages. The scoring weights are described separately. Clicking a row opens the existing detailed insights. |
| 3.3 Training suggestions | Existing saved Gemini cards filtered to current missing skills and current applicant/job context. Separate Hard/Soft labels; generic resource searches clearly distinguished from saved advice. Unverified offerings and invented study-duration labels are not presented as actual training facts. |
| 4.1 Demographics | Recorded gender donut with labeled count/percentage legend; education columns; barangay horizontal bars; latest-application current-status donut (horizontal fallback for many categories). Unknown/undisclosed values are retained explicitly. |
| 4.2 Job demand | Actual monthly posting-count line; current recorded-status donut; top industry, company and recorded position bars. Listings and available positions have separate statistics. |
| 4.3 Common skills | Separate top-10 required Hard/Soft bars and top-10 saved missing Hard/Soft bars. Counting units are stated beside each chart. |

Each chart provides exact-value tooltips and a keyboard-operated exact-values table, so interpretation does not depend only on color. Long categories are available in the table; categorical bars show the top 10. Charts have fixed readable heights, responsive containers and no animated transitions. Existing red branding, theme tokens and English/Filipino controls are retained.

## Read-only endpoint and data fields

`GET /api/admin/employment-analytics` reuses Express authentication and staff authorization. Applicants, missing tokens and invalid tokens are denied. It does not invoke Gemini, NLP or matching, and returns aggregate counts/options rather than applicant names, email addresses, profile IDs or row-level applicant data.

| Source | Fields used | Counting / interpretation |
| --- | --- | --- |
| applicants | id, gender, education, barangay, date_registered | One distinct applicant ID per selected registration cohort. Category percentages divide by all cohort applicants, including unknowns. |
| applications | id, applicant_id, status, created_at | Current status of each applicant's latest dated application, not an employment outcome rate. No application and undated application records are distinguished. |
| job_listings | id, company_id, title, industry, status, vacancies, date_posted, hard_skills, soft_skills | One distinct listing ID per selected posting cohort. Monthly chart groups actual date_posted. |
| companies | id, name, industry | Actual company options/names and fallback industry when a listing does not record one. |
| job_matches | id, applicant_id, job_id, final_match_score, missing_hard_skills, missing_soft_skills | Saved compatible applicant/job pairs only, intersecting selected applicants and currently available selected jobs. No historical matching-event trend is inferred from these rows. |

- Repeated input rows are deduplicated by ID; saved match pairs are deduplicated by applicant/job.
- Skill demand counts distinct listing IDs requiring a skill, once per listing. Only case and whitespace are normalized for grouping; identifiers such as C++/C#/JavaScript are preserved. Hard and soft categories stay separate.
- Missing-skill frequency counts distinct applicant IDs per skill/category, even when one applicant has the same gap across several jobs. It is not a population-wide prevalence estimate or a cosine score. The match denominator/cohort is reported separately as matched applicants and saved pairs.
- Available positions sum current vacancies only for Active, non-filled, non-future, unexpired listings within the selected posting cohort. The existing 30-day availability rule is retained. Job status charts show actual recorded status, which may differ from computed availability.
- Barangay text matching an official Batch 2 name (case/space insensitive) uses that name. Other nonempty historical/outside names are grouped separately; missing values remain unknown. This does not verify city residency or rewrite saved addresses.
- Date filters use Asia/Manila. Backend queries use an inclusive local start and exclusive next-day end, preserving fractional-second end-of-day records. Invalid ranges/filters fail with a validation error rather than silently producing zeros.
- Reads are paginated in 500-row pages with stable ID ordering. Applicant/job reads are date-scoped; match/application reads use applicant-ID batches of 100. Read failures return an error rather than an empty report. No new database view or SQL function was needed.

## Filters and synchronization

- Date range applies to applicant registration and job posting cohorts. Barangay/education affect applicant charts and applicant KPIs; company/job status affect job charts and job KPIs. Saved-match/gap reports use the intersection of those scopes. These scopes are visible beside the controls.
- Apply and Reset are functional, not decorative. Draft values are preserved during refresh. Active selections stay visible even if a refreshed result has no options for that category. Applied dates remain associated with the displayed response if a newer request fails.
- Batch 3 useQuery/useLiveRefresh provide serialized requests, stale-response protection, 400ms event consolidation, shared subscriptions, page-entry reads, focus/reconnection checks and visible/online 60-second fallback checks.
- Relevant analytics tables are applicants, applications, job_listings, companies and job_matches. Recent activities separately watch activity_logs. No subscription adds a matching/Gemini generation path.
- Applicant Dashboard gains controlled saved-data refresh; its Matched Jobs link continues to the existing automatic matching workflow. Official referrals remain staff-managed.
- Existing SummaryReportCard PDF export has its own weekly/monthly periods. A visible note clarifies that the new dashboard filters do not modify that export. No export content/format was silently changed.

## Files created

- backend/employment-analytics.cjs — validation, pagination, pure aggregation and read-only service.
- src/lib/employmentAnalytics.ts — typed aggregate API and Manila date defaults.
- src/lib/prescriptiveAnalytics.ts — display-only saved-job ranking and gap-linked advice filtering.
- src/components/admin/AnalyticsChart.tsx — reusable charts, exact tables, tooltips and empty states.
- src/components/admin/EmploymentAnalytics.tsx — scoped filters, KPIs, demographic/demand/skill panels.
- src/components/features/ApplicantMatchOverview.tsx — ranked compatibility comparison.
- src/lib/portalCopy/analytics.ts — analytics translations.
- tests/employment-analytics.test.cjs — eight aggregate/API/authorization regressions.
- tests/prescriptive-analytics.test.cjs — two ranking/advice regressions.
- docs/batch4-analytics.md — audit, counting rules, verification and limits.

## Files modified

- backend/app.cjs — register the staff-only analytics GET route.
- src/pages/admin/AdminDashboard.tsx — use accurate aggregate panels; retain quick actions, recent activities and original report access.
- src/pages/applicant/ApplicantJobs.tsx — integrate ranking into existing matching results.
- src/pages/applicant/ApplicantDashboard.tsx — controlled saved-data refresh and safe applicant fallback label.
- src/components/features/SkillMatchAudit.tsx — coverage bars/counts and display rounding only.
- src/components/features/SkillRecommendations.tsx — current-gap/context filtering, honest guidance labels and saved-only reads.
- src/lib/portalCopy/index.ts — register analytics translations.

## Verification

- Full Node/backend regression suite: **148/148 passed** (138 existing plus 10 focused analytics tests). Existing matching scores/cache/Gemini call counts, referrals, official address controls and session behavior remain covered.
- Focused tests verify demographics/unknown denominators, unique listings versus positions, demand/gap frequencies, repeated join rows, date/category scope, Manila boundaries/defaults, invalid input, empty versus failed retrieval, pagination beyond 1,000 rows, staff-only access and non-generation of advice.
- Frontend build/TypeScript checks: passed.
- Focused oxlint on all Batch 4 source files: passed with no errors or warnings.
- `git diff --check`: passed.
- Isolated browser fixture imports the real chart, ranking, audit and training components under React Strict Mode. Synthetic data is confined to tests/ignored local fixture files, with real database calls blocked. Verified actual Recharts rendering, exact tooltip/counts/tables, keyboard-operated values disclosure, date/company/education filtering, empty states, refresh errors retaining displayed data, selected-filter persistence, 390px mobile overflow, light/dark styles, Filipino labels, saved 75% overall versus 50% Hard/100% Soft coverage, only current-gap advice, zero generation requests and subscription cleanup. No runtime exceptions.

## Limits and pending configuration

- Deleted listings and vacancy histories cannot be reconstructed from current tables. The monthly chart is retained listing postings, not all historical labor demand or historical remaining vacancies. No fabricated trends were added.
- Latest application status is a current snapshot; undated application records cannot reliably identify which is latest. Job-match rows are saved decisions and may be stale until the existing matching workflow checks them. Analytics intentionally does not recalculate them or call Gemini merely to render a chart.
- Date-scoped reports exclude records without valid date_registered/date_posted. No global missing-date count is claimed, because date-scoped queries cannot measure it accurately.
- Read pagination is complete under the normal Supabase row cap but is not a database transaction snapshot across tables. Concurrent writes can be reflected on the next controlled refresh.
- The existing weekly/monthly legacy report is preserved with its own methodology; it is not silently converted into the new cohort report. Its retained-row metrics must not be treated as immutable historical events.
- Realtime publication/RLS availability remains deployment-dependent as documented in Batch 3. Live production settings/data were not accessed for verification; existing focus/reconnection/poll fallback remains. No configuration change is pending for the code itself, and no database/schema approval was needed.
- No new chart library, training dataset, skill taxonomy, model revision, semantic threshold change or scoring-formula change was introduced. The local NLP engine, 50–30–20 formula, 60% cutoff, Gemini OCR and recommendation generation paths are unchanged.


## Confirmed compact dashboard follow-up

The user selected a compact overview with two main charts and expandable detailed analytics, plus a weekly/monthly selector with direct PDF download and no report preview/modal.

- Default view now contains compact KPIs, recorded-gender donut and monthly posting line only. Applicant demographics, job-demand details and common skills start collapsed; their charts mount only when expanded. Filters and counting notes are collapsible, with applied dates/categories still visible.
- Quick actions/recent activities remain; header/sidebar/navigation are unchanged.
- Report controls are near the top of the dashboard. Weekly/monthly and previous-period selection remain. Fetching occurs only after Download PDF; repeated clicks share the guarded operation. Loading/error feedback and retry through the same button remain available.
- The report body is preserved verbatim from the pre-change file (all eight sections). The existing A4 letterhead, pagination, footer and filename logic remain. The body is rendered offscreen/inert only while exporting, then removed; no preview modal or browser tab is opened.
- Modified in this follow-up: SummaryReportCard.tsx, EmploymentAnalytics.tsx, AnalyticsChart.tsx, AdminDashboard.tsx and portalCopy/analytics.ts. No analytics queries, calculations, matching or Gemini generation behavior changed.
- Verification: 148 regression tests passed; build/TypeScript and focused lint passed. Synthetic browser checks confirmed exactly two default charts, keyboard expansion/collapse, lazy chart disposal, no report read on page entry, guarded duplicate clicks, weekly/current and monthly/previous direct downloads, error recovery, mobile/dark/Filipino display and no runtime errors/new tabs/modal.
- Real synthetic PDF files were downloaded and rendered with Poppler: three weekly A4 pages and four monthly A4 pages from desktop/mobile respectively. Every page retained letterhead and numbering, all eight sections were present, and rendered pages were visually reviewed. Test PDFs are intermediate fixtures, not user report deliverables or production data.


## Confirmed minimal dashboard and table-report refinement

The user explicitly confirmed: upper-right Quick Actions/Recent Activities, a monthly registered-applicant chart replacing overview Gender, Gender inside Demographics, and a complete compact-table PDF.

- Desktop overview now has four compact KPI cards, monthly registrations and job postings, with the shortcuts/activity column aligned at the upper right. Smaller screens stack the content. Existing detailed analytics remain expandable; Gender moved into the Demographics disclosure.
- `registrations` is an additive aggregate response field. It counts distinct filtered applicants by actual `date_registered` in Asia/Manila, including zero-registration months. It uses the same date/barangay/education cohort as applicant KPIs; no artificial trend or new database column was added.
- PDF export now uses selectable text tables instead of a raster capture of dashboard cards. All eight report sections and the existing API values remain. Pagination repeats section/column headers, wraps long cells, supports rows spanning pages and numbers every page. A4 layout is independent of browser width/theme.
- The existing jsPDF dependency is reused. Two unmodified Liberation Sans font files and their SIL OFL license are bundled in `public/fonts` for readable accented names. Fonts load on demand and are embedded/subset in the PDF. No package was installed.
- The old screenshot/body formatting described in the earlier follow-up is superseded by this explicitly approved table format. Weekly/monthly selection, previous periods, direct download, single-click locking and error feedback are retained. No hidden report DOM or automatic report fetch remains.

Files in this refinement: backend/employment-analytics.cjs; src/lib/employmentAnalytics.ts; src/components/admin/EmploymentAnalytics.tsx; src/pages/admin/AdminDashboard.tsx; src/components/admin/SummaryReportCard.tsx; src/lib/portalCopy/analytics.ts; new src/lib/summaryReportTables.ts and src/lib/summaryReportPdf.ts; public/fonts/LiberationSans-Regular.ttf, LiberationSans-Bold.ttf and LICENSE_LIBERATION; tests/employment-analytics.test.cjs and new tests/summary-report-tables.test.cjs.

Verification: **152/152 regression tests passed**, including four additional registration/PDF cases. Focused lint has no errors/warnings; frontend build/TypeScript passed. Real-component synthetic browser checks verified filtered registration counts, two default charts, Gender disclosure, upper-right alignment, keyboard operation, weekly/monthly PDF downloads, duplicate-click protection, no new tab/preview, mobile/dark/Filipino layout and error recovery. Real synthetic reports were 2 A4 pages each, about 61 KB, with all sections, accented applicant name, final audit row, letterheads and page numbers verified by extraction and visual PNG review. Actual page count depends on records. No production data, matching formula, NLP/Gemini behavior, referral workflow, session policy, database schema or navigation was changed.


## Approved visual executive summary with appendix

The user approved replacing a table-first PDF with a visual executive summary followed by complete detailed tables.

- First page: a compact four-number row (registrations, referrals, hired and not hired), actual daily registration/posting column charts, and at most three deterministic recorded-data highlights. Comparisons are absolute counts, not inferred hiring rates, causal claims or Gemini-generated narratives. Partial-period and snapshot scope are labeled.
- A second summary page appears only when skill statistics exist: top-five required hard/soft skills and frequently missing hard skills, with counts and their units. Required-skill counts represent active job listings; saved gap occurrences can repeat an applicant across jobs. Soft-skill gap statistics were not invented where the existing report does not provide them.
- Detailed appendix retains all eight sections, now labeled A1–A8 with repeated headers, wrapped rows, accented-name font support and page numbering. Registration and job-posting values share one date table to avoid repeating date rows.
- `fetchSummaryReport` adds `registrationTrend` from the already retrieved applicant records and the existing report date window. No extra database query is made. Existing report scope and source-query limits are unchanged; no production data/schema changes were performed.
- New files: src/lib/summaryReportOverview.ts, src/lib/summaryReportVisuals.ts and tests/summary-report-overview.test.cjs. Updated: src/lib/api.ts, src/lib/summaryReportTables.ts and src/lib/summaryReportPdf.ts. Dashboard, matching, Gemini and direct-download controls are unchanged.
- Verification: **157/157 regression tests passed**, focused lint/build/TypeScript passed. New cases cover factual observations, zeros versus unknowns, tied skills/top-five sorting, exact appendix values and registration-series/KPI consistency with the same eight read queries and zero AI calls.
- Synthetic browser exports verified weekly/current and monthly/previous downloads, duplicate-click protection, error recovery, mobile/dark/Filipino compatibility, no modal/new tab and no runtime exceptions. Test PDFs have two visual-summary pages plus three appendix pages for the expanded fixture; page count depends on data. All sections, aggregate-only summary pages, applicant name in the appendix, final audit row, headings/footers and page numbers were checked by extraction and rendered-page review. Temporary fixture PDFs are not production reports or user deliverables.
