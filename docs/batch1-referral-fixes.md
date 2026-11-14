# Batch 1 referral fixes

Rollback checkpoint: `b64f044` (clean working tree at the start). Work is limited to V3.1. No production records or connections were used for testing.

## What changed

- Authorized PESO Admin/Staff issue referrals after confirmation. Applicant job browsing and compatibility details remain available; legacy requests remain preserved in application/status history. The later matching-overview cleanup removes the request panel from that overview. Old applicant request-writing policies are removed by the new migration.
- Referral actions run through an authenticated Express endpoint and one transactional Supabase function. The function checks the staff record, locks applicant/job rows, reuses active referrals, blocks closed/inactive/filled vacancies, and writes staff UUID plus timestamps to existing history/activity tables.
- Hired and Not Hired are employment outcomes. Declined means a declined legacy request or cancelled referral. Historical Declined entries are retained without guessing their meaning. Hired decrements vacancies exactly once. A failed history write rolls the entire action back.
- Cancelling retains the referral number, slip, application, and history. Closed referrals cannot be silently reopened. Legacy generated-but-unconfirmed slips can be confirmed using their original number.
- View Referral opens the preview in the existing page. Download PDF exports directly without creating a tab or changing records. Print invokes the existing print-friendly flow. Unissued/cancelled slips cannot be exported as active official referrals.
- Following the requested gender-based wording update, the official slip uses he/him/his for recorded Male and she/her for recorded Female. Missing/other values use “the applicant.” The original template sentences are retained, replacing only the original his/her and him/her placeholders. Both preview and saved-slip queries include the existing gender field. No field or name-based inference was introduced.
- PDF export uses a stable document width on narrow screens. Existing branding, document content/layout, NLP, scoring, Gemini and matching code are preserved.

## Database prerequisite — prepared, NOT applied to Supabase

`supabase/migrations/20261114_referral_safeguards.sql` adds a service-role-only function and removes three applicant write policies. It adds no tables/columns and deletes no records. The existing TEXT status column accepts `Not Hired`.

**Referral processing fails clearly with a setup error until this migration is reviewed and applied to the intended database.** No frontend fallback bypasses its safeguards. Applying it to production requires a separately authorized deployment; this task did not do that.

Before applying in a staging environment, export the current definitions of `applications_request_own`, `applications_update_request_own`, and `status_history_request_own` from `pg_policies`. To roll back, first restore the application at the checkpoint, drop `public.manage_peso_referral(text,uuid,uuid,uuid,uuid,uuid,jsonb,text)`, and restore those exact prior policy definitions. Do not rewrite the referral records or new history entries. Baseline and previous migrations remain unchanged.

## Changed files

- `backend/app.cjs` — Admin-only referral endpoint.
- `backend/referrals.cjs` (new) — validation, authenticated staff identity, transactional RPC and actionable errors.
- `backend/notifications.cjs` — distinct Not Hired and Declined messages; existing manual sending remains manual.
- `src/lib/api.ts` — referral mutations use Express; Not Hired reporting/history; referral status returned to staff controls.
- `src/lib/referralDefaults.ts` (new) — new-slip contact/company defaults and configurable signatory resolution.
- `src/lib/referralPronouns.ts` (new) — gender-based document wording with neutral fallback.
- `src/lib/referralPdf.ts` (new) — direct, multipage PDF export with stable page width.
- `src/pages/admin/ReferralSlipPage.tsx` — confirm/issue, independent download/print, retained cancellations, automatic refresh after issuance, gender-based wording with a neutral fallback.
- `src/pages/admin/ApplicantsPage.tsx` — confirmed employment outcomes, active-referral controls, feedback.
- `src/pages/applicant/ApplicantJobs.tsx` — browsing/compatibility/history retained; official processing belongs to staff.
- `src/pages/applicant/ApplicationStatus.tsx` — View Referral preview navigation without a new tab.
- `src/components/ui/Badge.tsx` — Not Hired status presentation.
- `src/components/admin/SummaryReportCard.tsx` — separate Not Hired KPI and outcome log; legacy Declined labels remain explicit.
- `src/lib/portalCopy/adminMatch.ts` — Filipino wording for new controls and notices.
- `supabase/migrations/20261114_referral_safeguards.sql` (new) — atomic safeguards and policy changes.
- `tests/referral-settings.test.cjs` (new) — 4 shared-manager setting tests: validation, staff permissions, persistence, future previews and historical preservation.
- `src/components/admin/OfficeContentEditor.tsx` — editable Default Referral Signatory in existing Office Information.
- `src/types/site.ts` — optional manager setting in existing content JSON type.
- `backend/content.cjs` — validates the optional manager setting.
- `tests/referrals.test.cjs` (new) — 12 focused API, permission, PDF and migration structural tests.
- `tests/fixtures/referral-safeguards.sql` (new) — disposable PostgreSQL schema, synthetic records and transactional assertions.
- `tests/referrals-postgres.cjs` (new) — 3 actual concurrent/rollback PostgreSQL tests; intentionally separate from the default suite.
- `docs/batch1-referral-fixes.md` (new) — this implementation and verification record.

## Verification

- Default local Node suite: **110/110 passed**, including all 94 previous tests and 16 new tests.
- Disposable PostgreSQL 18 on loopback, synthetic data only: migration compiled and transaction assertions passed for staff authorization, issue/edit, duplicate retry, Hired retry, Not Hired, retained cancellation, legacy request/preview, closed/inactive/full jobs, audit records and RPC privileges.
- Additional PostgreSQL concurrency tests: **3/3 passed**. Concurrent issuance creates one referral; competing hires cannot overbook the last slot; a synthetic history failure rolls back hire and capacity together.
- Browser fixture using the real React slip component and real html2canvas/jsPDF: confirmed issuance, automatic refetch, direct valid PDF download without a new tab, separate Print, neutral wording and applicant read-only controls passed. APIs were mocked and no Supabase request was made.
- Frontend build passed. Focused lint has no errors; existing React effect/dependency warnings remain in ApplicantsPage and ReferralSlipPage. `git diff --check` passed.

## Rerun local checks

```powershell
Set-Location 'C:\Users\User\Documents\PESOLUTION-LIPA_V3.1'
npm test
npm run build
npx --no-install oxlint backend/referrals.cjs src/lib/referralPdf.ts tests/referrals.test.cjs tests/referrals-postgres.cjs
```

For the PostgreSQL fixture, use a **new disposable cluster** and empty database. These tests intentionally use only `127.0.0.1:58741/peso_referral_test`; they do not read project environment credentials. PostgreSQL 18 is already installed on this machine. If the port or folder is in use, stop and inspect it rather than deleting anything.

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$testCluster = Join-Path (Get-Location) ('logs\referral-test-' + (Get-Date -Format 'yyyyMMddHHmmss'))
& "$pgBin\initdb.exe" -D $testCluster --auth=trust --username=postgres --encoding=UTF8 --locale=C
& "$pgBin\pg_ctl.exe" -D $testCluster -l "$testCluster.log" -o '-h 127.0.0.1 -p 58741' -w start
try {
  & "$pgBin\createdb.exe" -h 127.0.0.1 -p 58741 -U postgres peso_referral_test
  & "$pgBin\psql.exe" -X -h 127.0.0.1 -p 58741 -U postgres -d peso_referral_test -v ON_ERROR_STOP=1 -f tests/fixtures/referral-safeguards.sql
  if ($LASTEXITCODE -ne 0) { throw 'SQL fixture failed' }
  node --test tests/referrals-postgres.cjs
} finally {
  & "$pgBin\pg_ctl.exe" -D $testCluster -m fast -w stop
}
```

## Remaining limits

The migration has not been applied to the application's Supabase database, so end-to-end verification against the real Supabase deployment remains a staging/deployment task. Local PostgreSQL tests use the relevant baseline columns/constraints, not every Supabase service or historical schema variant. Legacy Declined records may include old Not Hired events; no automatic relabeling is safe. Closed referral reissuance and reversal of recorded employment outcomes require a separately reviewed workflow, not silent overwriting. No Batch 2 work was performed.


## Recipient and signatory defaults

New previews populate the contact person, recorded contact role, company name and company address from the existing company record. The addressee is stored as multiline text in the existing recipient_name column when staff issue the slip. Missing contact information is not invented. A missing company address remains blank for staff review rather than being replaced with a different job location. Existing slips continue to use saved recipient/signatory details.

New slips default to MR. MARK JOSEPH V. TRINOS, PESO Manager, City Government of Lipa. The name is user-supplied; the designation is also used by [DOLE CALABARZON's 2026 Labor Day report](https://calabarzon.dole.gov.ph/default.php?resource=1bd3a0484883ca6deaada8395a8f6e85&retsamlakygee=2023). Staff can edit the signatory before issuance. No historical records were rewritten.


## Future PESO manager changes

Use **Admin → Settings → Office Information → Default Referral Signatory**, enter the new manager's name and choose **Save Changes**. This uses the existing authenticated office-content endpoint and the existing site_content.content JSON storage; no new migration/table/column is required. An older content client that omits the new field preserves the configured manager instead of erasing it. Existing updated_by/updated_at metadata records who last changed office settings.

New referral previews fetch the saved default. MR. MARK JOSEPH V. TRINOS is only the initial fallback when no office default has been configured. Issuance saves the reviewed name in the existing referrals.signatory_name field. Later default changes do not alter issued slips or overwrite a manually reviewed name in an already-open preview. Each slip's signatory remains editable through the existing authorized Edit control.

Additional focused tests passed for input validation, staff-only persistence, older-client compatibility, applying a changed default to new previews and keeping historical signatories unchanged. All tests used local mocked records, without production access.


## Settings navigation and referral opening

The Admin sidebar and editor heading now say Settings, with a gear icon. The existing /admin/website route is retained for compatibility. View Referral uses React navigation in both Admin matched cards and Applicant status, preventing a full-page reload and the app startup splash. Cancellation also uses React navigation. Referral initial fetching uses plain accessible status text instead of a spinner; existing slip content remains visible during reloads. Save/download/cancel progress messages are text-only, with disabled controls retained during processing. Actual data still needs to be fetched; no referral information is fabricated or rendered as ready before it arrives.
