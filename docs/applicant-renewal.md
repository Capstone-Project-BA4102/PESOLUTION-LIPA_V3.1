# Applicant renewal as re-registration

The renewal workflow preserves the account, applicant ID, registration date,
credentials, outcomes and prior referrals while versioning reviewed qualification
changes for the new search cycle.

## Staff workflow

1. On a previously hired applicant, choose **Renew Application**. This opens
   `/admin/applicants/:applicantId/renew`, reusing the walk-in registration form.
2. Upload an updated PDF/JPG/PNG resume (up to 10 MB). A replacement photo is
   optional; the current photo remains selected otherwise.
3. Run the existing Gemini resume OCR. Renewal requires extraction to complete;
   a failure returns to document selection for retry. No new model is introduced.
4. Review all prefilled personal information and the newly extracted education,
   course, school, hard skills and soft skills. Missing OCR qualification fields
   are cleared for staff review rather than silently copying stale qualifications.
   Ambiguous skills must be resolved or removed. Login email is read-only to avoid
   splitting the existing Supabase Auth identity from the applicant record.
5. Review **Before / After**, including added and removed skills, then confirm.
6. Open **History → Qualification versions** for each confirmed renewal, the
   recorded staff member/date, changed details and private resume previews.

The next matching visit, or the existing Realtime input subscription, refreshes
affected results using the latest confirmed skills and education. The existing
input fingerprints still reuse results when qualifications are unchanged.
The model, cosine threshold, 50–30–20 formula, 60% cutoff and Gemini coaching are
unchanged. Matching already in progress finishes before renewal commits; a
matching request during renewal waits and then reads the new qualifications.

## Database setup

The current clean-install baseline includes renewal support. Follow
[SQL setup](../supabase/baseline/README.md) for a new empty project. For an existing
project, verify its applied schema before considering the incremental
[renewal migration](../supabase/migrations/20261117_applicant_renewal_versions.sql).
Do not replay a baseline or migration against an already configured installation.

This additive migration creates `applicant_renewals`, adds the nullable
`applicants.avatar_path` pointer, and installs service-role-only functions for
context and atomic renewal saves. No existing records are backfilled or deleted.
The application reports that renewal setup is required if the migration is absent;
it does not silently revert to the obsolete upload-only flow.

The SQL transaction locks the applicant, verifies an optimistic snapshot token,
updates applicant/profile details, inserts a new resume with reviewed skills,
saves immutable before/after qualification snapshots and differences, and records
staff/timestamps/status history. An idempotent confirmation ID prevents duplicate
versions on network retries. Other browser roles cannot write version history.

Uploads use new paths containing the confirmation ID and payload digest. They
never replace the old resume. A renewal photo becomes current only when its DB
pointer commits. Interrupted/failed confirmations can leave unreferenced staged
files; retries reuse the same content-bound paths. No automatic storage deletion
is performed, particularly when a network error leaves commit success uncertain.

## Prior employment and evidence

Old applications and referrals remain unchanged. A renewal marks the start of a
new search cycle: a historical hire no longer blocks referral to a **different**
vacancy. Existing same-applicant/job uniqueness and closed-referral restrictions
still apply; this change does not reopen or duplicate an old referral.

Each renewal archives application/referral records, job requirements and saved
match scores and recommendations **as observed before renewal**, plus any already recorded NLP cache
evidence. These are not claimed to be issuance-time snapshots. Missing historical
cosine values are never recalculated or fabricated. No earlier qualification
versions are invented from old resumes; the first confirmed renewal records the
actual current Before snapshot and the reviewed After snapshot.

## Files involved

- `backend/renewals.cjs`, `backend/app.cjs`: staff-only context/history/save API.
- `backend/matching-refresh.cjs`: serialize matching with renewal and archive
  existing evidence without invoking NLP or Gemini.
- `supabase/migrations/20261117_applicant_renewal_versions.sql`: atomic versioned
  save, access controls and current-search-cycle referral guard.
- `src/pages/admin/RegisterWalkIn.tsx`, `ApplicantsPage.tsx`, `src/App.tsx`:
  reused walk-in form, renewal route and applicant-history integration.
- `src/pages/admin/MatchingPage.tsx`: refresh current-cycle status when renewal
  history changes; historical hires no longer override the new matching badge.
- `src/lib/renewals.ts`, `renewalForm.ts`, `api.ts`, `applicantFiles.ts`:
  AJAX, OCR merge rules, current qualifications and photo synchronization.
- `src/components/admin/QualificationComparison.tsx`, `QualificationHistory.tsx`:
  Before/After comparison and version/resume history.
- `src/components/layout/PortalLayout.tsx`, `src/lib/portalCopy/renewal.ts`,
  `src/lib/portalCopy/index.ts`: breadcrumb and English/Filipino presentation.

## Verification

Run the regular regression suite and build:

```powershell
npm test
npm run build
npm run lint
```

The SQL integration test uses a disposable in-memory PostgreSQL runtime, not
Supabase or any environment credentials. It is optional in the normal suite.
For the same isolated test setup used during implementation:

```powershell
npm install --prefix logs/renewal-sql-runtime --no-save --package-lock=false @electric-sql/pglite
$env:PESO_SQL_TEST_RUNTIME = 'logs/renewal-sql-runtime/node_modules/@electric-sql/pglite'
node --test tests/renewal-sql.test.cjs
Remove-Item Env:PESO_SQL_TEST_RUNTIME
```

The runtime is under ignored `logs/`; no application dependency or Python
environment changes are needed. Tests cover atomic rollback, stale forms,
idempotent confirmation, RLS/RPC permissions, retained prior resumes/referrals,
new qualifications and a subsequent referral/hire in the new cycle. Mocked
backend tests cover failed storage/RPC calls and validation; frontend helper
tests verify stale qualifications are not copied from the old resume.

Automated checks do not establish live Gemini OCR, current production migration
state or staff browser acceptance. Those need environment-specific verification;
this guide does not change production records.
