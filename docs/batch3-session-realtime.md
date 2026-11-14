# Batch 3 — Sessions, AJAX, Realtime and automatic matching

Implemented on 14 November 2026 in PESOLUTION-LIPA_V3.1 only. No dependencies, production records, schema, RLS policies or Realtime publication settings were changed. No Batch 4/5 work was performed. Batch 1/2 working changes were retained. The initial tracked working diff and status were recorded in ignored `logs/batch3-start.patch` and `logs/batch3-start-status.txt`; these are a tracked-file rollback aid, not a Git commit or a complete untracked-file backup.

## Audit findings

- Supabase Auth already persisted/refreshed sessions. AuthProvider loaded roles from admins/applicants; RequireRole protected Applicant/Admin routes. Express verifies the bearer token through Supabase getUser, looks up staff membership, and checks applicant ownership. These authorization rules are unchanged.
- No shared inactivity policy existed. Token refresh and inactivity must be treated separately.
- useQuery already guarded stale responses, but effects could start overlapping requests and set loading during refreshes. Several consumers replaced their entire interface while refreshing.
- Matching already had automatic page-entry refresh, a debounced serial queue, job/resume/applicant subscriptions, foreground/focus/online fallback and a 30-second check. API/backend matching calls already share concurrent work.
- Matching fingerprints cover applicant skills/education, job requirements, provider/configuration and scoring policy. The local disk cache preserves actual NLP evidence. Changed jobs are recomputed individually; metadata-only edits normally reuse scores. Existing saved recommendations are fingerprint-bound and reused.
- Job CRUD/status/referral actions already call local reload after successful writes. Additional shared subscriptions now synchronize other mounted views; no full-page reload was introduced.
- The source tree has no Realtime publication migration proving that all requested tables are published. Live deployment settings were not queried or changed.

## Session behavior

- One activity record per authenticated user in same-origin localStorage, with in-memory fallback when storage is unavailable.
- 30 minutes of inactivity expires the application session. A warning appears at 2 minutes, showing minutes/seconds and Stay Logged In. A small countdown appears in the existing account area.
- Trusted pointer, keyboard and form-input activity resets the clock. Pointer movement, page focus alone, polling, matching, Realtime and Supabase token renewal do not reset it. Storage writes from routine activity are limited to about once per second.
- Absolute timestamps handle browser sleep and closed/reopened pages. A check occurs before accepting activity, so an already expired session cannot be revived by a late click. Other tabs observe the same activity/logout marker.
- Expiry immediately clears application identity, aborts pending protected AJAX, rejects subsequent protected backend/Supabase requests, and performs local Supabase sign-out. Existing route guards return to `/`, the application's shared sign-in entry (`/login` already redirects there). A clear expiry toast is shown. A fresh password sign-in initializes a new activity record.
- Session generation prevents even a late transport response from crossing a logout/new-login boundary. Public anonymous Supabase reads and Auth renewal/sign-out keep their existing flow.
- Warning is rendered in a body portal so the sidebar transform cannot clip it on mobile. Its button receives keyboard focus; Tab stays inside the warning. Labels support English/Filipino and existing theme styles.

## AJAX and Realtime behavior

- useQuery defers initial work to collapse Strict Mode setup/cleanup and serializes each hook's generations. Cancelled generations cannot publish responses. Valid displayed data remains during background refresh; targeted pages show refresh/error/retry feedback.
- watchRows shares a single channel per Supabase client/table/filter and removes it after its last consumer leaves. Matching and the job browser reuse the job_listings channel.
- Necessary tables: job_listings for job views/matching; filtered resumes and applicants for a selected applicant's matching; applicants/resumes/applications/referrals/status_history for relevant staff lists and status screens. Reads remain governed by existing credentials/RLS.
- All INSERT/UPDATE/DELETE job events invalidate mounted matching checks. The backend decides whether inputs actually changed; events do not launch matching for every applicant.
- List refreshes consolidate bursts for 400ms. Page entry, focus, becoming visible, reconnect and subscription reconnection catch missed events. Visible/online lists also check every 60 seconds; matching retains its existing 30-second fallback. List refresh does not itself call Gemini.
- Active referral edits pause their subscription refresh; an in-flight response does not overwrite the editing form. Other forms/filter state remain mounted during background refresh.

## Automatic matching and Gemini protection

- Saved results are loaded while the existing controlled freshness check runs. A slower initial load cannot overwrite results already published by that check.
- Current cached scoring, per-job fingerprints, persisted actual audit evidence, exact-only outage fallback, single-flight matching, debounced updates and optional staff force-refresh remain in place.
- New recommendations exclude jobs with zero vacancies or expired 30-day posting dates, in addition to the existing Active status requirement. Historical referrals/slips are not deleted. This is input-availability filtering; the scoring formula is unchanged.
- Local Sentence-Transformer, exact/compound matching, 0.85 provisional cosine threshold, 50–30–20 weights and 60% cutoff are unchanged.
- Gemini OCR is unchanged. Existing recommendation fingerprint reuse is retained: unchanged gaps/context reuse coaching even after a forced local run; newly missing or invalid advice is generated through the existing recommendation path. No second recommendation mechanism was introduced. New valid gaps can still require Gemini; matching does not claim that all automatic checks are entirely Gemini-free.
- Existing recommendation-failure behavior is retained: complete previous saved matches are kept if preparing new complete advice fails. The UI reports the error; it does not claim stale results are newly validated.

## Files for Batch 3

| File | Purpose |
| --- | --- |
| src/lib/sessionActivity.ts (new) | Testable wall-clock inactivity policy and monitor |
| src/lib/sessionGate.ts (new) | Shared activity storage, protected request cancellation and session-generation guard |
| src/lib/auth.tsx | Install monitor, explicit-login initialization, immediate expiry and listener cleanup |
| src/lib/supabase.ts | Guard authenticated data requests; retain public/Auth requests |
| src/lib/backend.ts | Guard backend JSON and upload requests |
| src/components/layout/SessionStatus.tsx (new) | Account countdown and accessible warning |
| src/components/layout/PortalLayout.tsx | Add session status in the existing account area |
| src/lib/rowChanges.ts (new) | Reference-counted table/filter subscription sharing |
| src/lib/useLiveRefresh.ts (new) | Debounced live and reconnect/focus/poll fallback refresh |
| src/lib/useQuery.ts | Serialize requests, suppress stale results and retain background data |
| src/lib/matchingRefreshQueue.ts | Reuse shared subscriptions and aggregate connection status |
| src/lib/useReactiveMatching.ts | Display saved data while matching freshness check runs |
| src/components/shared/RefreshNotice.tsx (new) | Small loading/error/retry feedback |
| src/components/shared/JobBrowser.tsx | Shared live job updates and refresh feedback |
| src/pages/admin/JobListingsPage.tsx | Live job list with preserved controls |
| src/pages/admin/ApplicantsPage.tsx | Relevant applicant/referral/status list refresh |
| src/pages/admin/MatchingPage.tsx | Refresh applicant/referral summary |
| src/pages/admin/ReferralSlipPage.tsx | Refresh issued record while protecting active edits |
| src/pages/applicant/ApplicationStatus.tsx | Refresh employment/referral status |
| src/lib/portalCopy/chrome.ts | Session and refresh translations |
| backend/matching.cjs | Filter filled/expired vacancies before scoring |
| tests/batch3-session.test.cjs (new) | Inactivity, warning, stay, tabs, disposal, protected requests |
| tests/batch3-refresh.test.cjs (new) | Channel sharing, reconnect/offline/cleanup and stale/overlap behavior |
| tests/matching-refresh-queue.test.cjs | Verify aggregate CONNECTING/SUBSCRIBED status |
| tests/matching-refresh.test.cjs | Filled/expired input regression; no extra Gemini |
| docs/batch3-session-realtime.md (new) | Audit, behavior, verification and deployment limits |

## Verification

- `npm test`: **138/138 passed**, including existing API authorization, referral, address/qualification, score/cache and Gemini call-count regressions. Ten new focused Batch 3 cases were added.
- `npm run nlp:test`: **7 passed, 2 optional cached-real-model tests skipped**. No model was downloaded or modified for Batch 3.
- `npm run build`: passed, including TypeScript checks.
- Focused oxlint over Batch 3 source files: **0 errors, 8 existing-pattern advisories** (Fast Refresh exports and existing effect patterns). Newly introduced ref/dependency advisories were corrected.
- `git diff --check`: passed.
- Isolated browser fixture imported real AuthProvider/SessionStatus under React Strict Mode, with synthetic Supabase/accounts only. Verified 2-minute warning, token-refresh not resetting activity, real keyboard activity/Stay Logged In synchronized across two tabs, timeout in both tabs, post-logout request rejection, no stale reauthentication, fresh sign-in and mobile warning layout. No runtime exceptions. No live accounts/records were used.

## Limits and configuration requiring approval

- Realtime requires the existing project's `supabase_realtime` publication to include the subscribed tables and suitable read policies. A deployment owner should verify the table list in Supabase before enabling missing entries. No publication/RLS change was applied; any such change requires approval. Fallback checks continue if events are unavailable.
- This is an application inactivity timeout, not a change to Supabase server session/JWT policy. Supabase access JWTs remain valid until their expiry, even after sign-out: https://supabase.com/docs/guides/auth/signout . Aborting a request cannot roll back a mutation already accepted by the server. Strict server-side revocation/idle enforcement across direct clients would require a separately approved Auth/security design; it is not silently claimed here.
- Cross-tab synchronization requires working same-origin localStorage. If storage is denied, this tab still times out but cross-tab coordination cannot be guaranteed. Device time is the activity clock.
- Live publication/RLS delivery was not verified against production. Tests use mocks and an isolated browser fixture; no production migration, record change or deployment change was made.
- Local matching cache files are specific to the running backend. Existing limitations for multiple backend processes/shared storage are unchanged.

Official references checked: [Supabase sign-out behavior](https://supabase.com/docs/guides/auth/signout), [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization).
