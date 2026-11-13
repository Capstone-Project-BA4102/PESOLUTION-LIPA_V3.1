# Automatic reactive matching

Match Results now checks matching automatically on entry. The manual Recalculate
Matches button remains a force refresh. React uses the existing Fetch/AJAX API;
there is no jQuery or new package dependency.

## Refresh triggers

- Supabase Realtime INSERT/UPDATE/DELETE events on `public.job_listings`.
- Filtered resume events and applicant updates (including education changes).
- Browser reconnect, return to the page/tab, and Realtime reconnect.
- A 30-second check while the page is visible and online, covering missed events,
  resume deletes, missing publications, and backend/model configuration changes.
- A fresh backend input check on every new visit, including after offline/closed-page changes.

Event bursts are debounced for 400 ms. Events arriving during a request queue one
follow-up check. React remounts share identical in-flight HTTP requests. The backend
also shares in-flight runs per applicant, including across different staff tabs.
Only input tables are subscribed to; writes to matches/recommendations cannot
cause subscription feedback loops. Subscriptions/timers are removed on navigation.

## Supabase Realtime prerequisite

The existing Supabase project must publish `job_listings`, `resumes`, and
`applicants` through `supabase_realtime`, with its existing RLS/read permissions.
This implementation does not change any live publication, policy, schema or data.
Publication settings can be checked in the Supabase Dashboard's replication/
Realtime settings. No production setup was executed during development.

If Realtime is disabled, disconnected or misses an event, the visible-page checks
and next-visit checks still catch changes. The UI shows a connection-pending or
offline notice. A successful WebSocket connection alone does not prove all tables
are published. Push delivery against the live project was not tested.

Reference: https://supabase.com/docs/guides/realtime/postgres-changes

## Backend freshness and reuse

`POST /api/match/:applicantId` retains existing response fields and accepts
`{"force":false}` for an automatic freshness check. Omitting `force`, or sending
`true`, retains manual force-refresh behavior. Additional response fields include
`cacheStatus`, `recalculatedJobs`, `recommendationsReused`, `matchingKey`,
`checkedAt`, and per-job `jobAudits`. Invalid nonboolean `force` values are rejected.

Every check reads the current applicant education, latest confirmed resume skills,
active job requirements, saved matches, and saved recommendations. Freshness uses:

- Applicant skills/education and each active job's skills/education.
- NLP endpoint, threshold, model revision and Python policy identity when available.
- Backend matching/text-policy source hashes and the existing scoring constants.
- A digest of saved result fields, detecting externally changed/removed match rows.

Only changed/new jobs are sent through NLP. Unchanged qualified matches reuse
Supabase rows; unchanged below-cutoff decisions reuse their qualification flags.
Deactivated/deleted jobs are removed without re-embedding the remaining jobs.
A location/vacancy-count edit alone reloads display data without recomputing skill
scores. Active status continues to use the existing `status = Active` rule.
Job title changes refresh recommendation context without rerunning NLP.

The ignored `backend/model-artifacts/matching-cache/` directory stores input/output
hashes, qualification/fallback flags, retry timestamps, and actual qualified-job
NLP evidence. Evidence includes the original skill phrases, measured cosine values,
matching decisions, model context and original calculation time. Treat this local
cache as application data; it is not published or checked into Git. It does not
store full resumes or recommendation text. It persists across
backend restarts on the same disk. A missing/corrupt cache requires one initial
calculation to establish freshness; deleting the cache does not delete Supabase
results. On read-only/ephemeral storage, in-process caching still works, but a
restart may require recomputation. No database migration is needed.

The current architecture assumes one local Express backend. Independent backend
instances do not share in-flight request locks or local metadata; each validates
its own cache against saved rows before reuse.

## Gemini and persistence

Valid existing recommendation sets are reused, even for manual force refreshes.
When only the gap list changes but job/model/education context is unchanged,
validated advice for still-missing skills is kept and Gemini is asked only for
new/unanswered gaps. A changed title or Gemini model invalidates its coaching
context. Automatic checks do not create activity-log entries every 30 seconds.

The existing rule remains: prepare complete coaching before replacing matches.
A Gemini failure leaves the previous complete results available and shows an error.
The UI still hides inactive jobs and refreshes display metadata on a failed
matching check. The existing match RPC and recommendation upsert remain separate
operations; this change does not claim they are one database transaction.

A temporary NLP outage retains valid saved semantic matches using the last observed
provider hash, rather than downgrading unchanged results. New/changed inputs still
use the explicit exact/compound-match fallback. Unchanged fallback
results are reused; if health is ready but inference previously failed, retry is
limited to once per minute. Recovery retries pending fallback jobs; observed model/policy changes invalidate
affected configuration fingerprints automatically.

M = 0.50H + 0.30S + 0.20E and the 60% cutoff are unchanged.
Gemini OCR, existing authentication/RLS, and the current layout/colors remain.

## UI and audit evidence

Initial loading, background checking, updated/reused, offline, empty, and retryable
error states are displayed. Existing job cards remain visible during background
checks. No initial Calculate click is required. Manual Recalculate is optional.

Actual NLP evidence is cached per job together with its input/configuration and
saved-score fingerprints. Every valid cached match can return its stored breakdown
on a new page visit, without force refresh or new embeddings. Original calculation
timestamps are retained; stored evidence is not mislabeled as a new run.

Older hash-only cache records are automatically backfilled once for qualified jobs
when NLP is available. New or changed inputs invalidate their old evidence. Partial
updates keep each unchanged job's own evidence; they never borrow rows from another
job's latest calculation. Evidence corruption is detected using an integrity hash.

An evidence-only backfill that cannot use NLP preserves valid saved scores, returns
no misleading comparison values, and retries with a one-minute backoff. The UI
explains that the comparison will load automatically when local matching is
available. Recalculate remains an optional force control, not a prerequisite.

## Verification and files

Run `npm test`, `npm run build`, focused lint, and the existing offline Python tests
as documented in `docs/local-nlp.md`. Node tests use mocked Supabase/Gemini only.
No production credentials, data or Realtime project were exercised.

Verified locally: 94 Node tests and 9 offline Python tests passed; frontend build,
focused lint and Match Results state-render checks passed. A real cached-model
HTTP check with mocked Supabase computed 2 jobs initially, 0 on unchanged revisit,
1 after a single requirement edit, and 0 on deactivation, with no Gemini requests.
Realtime subscription/filter/cleanup behavior was tested with mocks, not live
production delivery.

Created:
- `backend/matching-refresh.cjs`: freshness checks, incremental matching, cache and single-flight coordination.
- `src/lib/matchingRefreshQueue.ts`: debouncing and input subscriptions.
- `src/lib/useReactiveMatching.ts`: automatic Fetch/AJAX refresh lifecycle.
- `tests/matching-refresh.test.cjs`: persistence/reuse/change/recovery regressions.
- `tests/matching-refresh-queue.test.cjs`: event bursts, in-flight events and subscription cleanup.
- `docs/reactive-matching.md`: this guide.

Modified:
- `backend/app.cjs`: route integration and shared recommendation fingerprint.
- `backend/matching.cjs`: reusable input loader and missing-gap-only coaching.
- `backend/skill-nlp.cjs`, `backend/skill_nlp.py`: model/readiness/policy identity.
- `src/lib/api.ts`: automatic/force options, HTTP deduplication, inactive-job filtering.
- `src/pages/admin/MatchDetailsPage.tsx`: automatic state handling and optional force button.
- `src/lib/portalCopy/adminMatch.ts`: translated state messages.
- `tests/matching.test.cjs`, `tests/nlp-matching-route.test.cjs`: updated expectations/mocks.
- `docs/local-nlp.md`: link to reactive matching behavior.

Restart Express and the Python NLP service to load these changes. Existing Vite
sessions normally reload the frontend changes automatically.
