# Matching overview cleanup and Applicant endpoint fix

## Changes

- Matching & Referrals now shows only the Referrals Confirmed summary. The Referral Requests card, request review table, decline dialog and request query were removed from this overview. Legacy application/request/history records were not deleted or rewritten.
- Pending legacy requests no longer get incorrectly classified as Referred in the matching summary. Only actual Referred applications receive that status; Hired and existing matching results retain their behavior.
- View Matches is a compact, single-line red text action with a small chevron. Its table column takes only the required width. The destination and keyboard-accessible link behavior are retained.
- Applicant automatic matching failures no longer misleadingly show Auto-updated. A missing endpoint gives a readable saved-results/contact-staff message; other errors are preserved.

## Cause of API endpoint not found

The local backend process on port 5000 had been running since November 13, before the Applicant matching route was added. An unauthenticated POST to the new route returned 404. The process's working directory was verified as this V3.1 project before restarting only that local backend.

The backend was restarted in Node watch mode from the V3.1 workspace. The same unauthenticated probe now returns 401 (Please sign in to continue), proving that the new route exists and is protected by authentication. No authenticated matching-data request was used for this probe.

`npm run backend:dev` is now available for future local development; it runs `node --watch backend/index.js`. The existing `npm start` command is unchanged. The current local backend is already running in watch mode, so do not launch another copy on port 5000. Browser Retry/refresh can use the loaded route.

## Files

- `src/pages/admin/MatchingPage.tsx` — confirmed-only summary and compact View Matches action.
- `src/lib/api.ts` — correct pending-vs-confirmed status classification; clear missing-endpoint feedback.
- `src/pages/applicant/ApplicantJobs.tsx` — accurate automatic-update error status.
- `src/lib/portalCopy/adminMatch.ts` — localized new status/error messages.
- `package.json` — local backend watch command; no new dependency.
- `tests/matching-summary.test.cjs` — three regression tests for status classification, record preservation and error handling.
- `docs/matching-summary-fixes.md` — this report.

## Checks

- Node regression suite: **118/118 passed** (115 existing plus three new tests).
- Frontend build passed.
- Focused lint and git diff --check passed.
- Existing source-route tests confirm authentication and ownership checks; runtime probe confirms the formerly missing route is now loaded.
- Browser layout verification passed with a separate synthetic-data fixture: request panels absent, View Matches rendered on one line at approximately 162 × 45 pixels at the existing 18px base font, destination correct, navigation successful and no runtime errors. Database records were not used for layout tests.

No schema changes, migrations, legacy deletions, NLP model/threshold/scoring changes, or production deployment were performed.
