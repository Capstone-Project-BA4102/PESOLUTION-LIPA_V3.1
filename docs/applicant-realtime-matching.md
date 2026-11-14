# Applicant realtime job matching

The Applicant Matched Jobs page now uses the existing Admin matching refresh lifecycle and cached Express NLP engine. Matching runs automatically on page visit, matching-input Realtime events, reconnect, focus and visibility return. A 30-second catch-up check handles missed events and configuration changes. Valid results/evidence/recommendations are reused; no new NLP model, formula, threshold or schema was introduced.

## Security and existing behavior

- New `POST /api/applicant/match/:applicantId` requires an authenticated applicant and verifies that the requested applicant record belongs to that session's profile_id.
- Applicants cannot refresh someone else's profile, use the Admin endpoint, or force a recalculation.
- Admin and Applicant refreshes share the same in-flight computation and fingerprint cache. The existing engine generates Gemini recommendations only for missing verified gap advice; unchanged checks do not call Gemini again.
- Official referral processing remains Admin/Staff-only. Applicants only browse matching results and read their saved referral status.
- The existing 50% hard skills, 30% soft skills, 20% education scoring and 60% recommendation cutoff are unchanged. Existing local NLP outage fallback remains explicit.

## Applicant interface

- Saved results remain visible while updates run; errors have a retry control.
- Actual current-run or fingerprint-bound cached NLP evidence is passed to the existing NLP breakdown. No similarity evidence is reconstructed from historical scores.
- An open details modal reads the latest match by job ID, so its score, gaps and NLP evidence update together. It closes if the job is no longer matched/active.
- Job metadata refreshes without remounting the browser or clearing search filters. Newly added jobs can appear; closed jobs are filtered out.
- Realtime/refresh/offline notices use the existing translation and theme system.

## Files changed for this update

- `backend/app.cjs` — applicant-owned automatic refresh endpoint; Admin endpoint permissions retained.
- `src/lib/api.ts` — own-profile refresh client, active-job filtering and explicit applicant query errors.
- `src/lib/useReactiveMatching.ts` — reuse the existing lifecycle with optional typed data-loader/runner functions; no subscription until an applicant ID is known.
- `src/pages/applicant/ApplicantJobs.tsx` — automatic refresh, latest modal data/evidence, retry/offline/empty states.
- `src/components/shared/JobBrowser.tsx` — optional refresh key for updated job metadata; existing callers retain default behavior.
- `src/lib/portalCopy/adminMatch.ts` — localized Realtime/offline status messages.
- `tests/applicant-matching.test.cjs` — five focused backend integration tests.
- `docs/applicant-realtime-matching.md` — this report.

## Local verification

- `npm test`: 115/115 passed (110 prior tests plus five new applicant matching tests).
- New tests verify session/ownership/force restrictions, evidence delivery and cache reuse, new/closed/changed jobs, shared concurrent Admin/Applicant computation, and NLP outage fallback.
- Browser verification using the actual ApplicantJobs page, shared realtime hook, JobBrowser and NLP table with synthetic services: automatic evidence, live open-modal score/table updates, event burst debounce, metadata refresh, unchanged-check reuse, offline catch-up, closed-job removal/modal closing, newly added jobs and read-only referral controls all passed. No runtime errors.
- `npm run build`: passed.
- Focused lint: passed without warnings/errors for the matching update.
- All test records and providers are mocked/local fixtures. No production Supabase data was accessed or changed. No packages were installed.

## Running and remaining limits

Restart the Express backend to load the new applicant endpoint. The existing local NLP service and frontend should run as before. Supabase Realtime depends on the existing publication and RLS configuration; this change does not alter them. Where events are unavailable or missed, focus/reconnect and the 30-second catch-up check keep results current. Fresh computations or uncached Gemini coaching can still take time; unchanged visits reuse valid results. The local NLP service is still required for new semantic comparisons, with the existing exact-only fallback during outages.
