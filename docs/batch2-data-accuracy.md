# Batch 2 — Data accuracy and job listings

Implemented only inside PESOLUTION-LIPA_V3.1. The completed Batch 1 working files were copied to the ignored local `logs/batch2-start-checkpoint` before coding. No production records, schema, migrations, package dependencies, original V3 files or V4 files were changed by this work.

## Official barangay source

Primary source: [Philippine Statistics Authority, PSGC — Barangays in the City of Lipa](https://psa.gov.ph/classification/psgc/barangays/0401014000).

- City PSGC code: 0401014000.
- The directory contains 72 barangays and labels its city list **as of 31 July 2025**.
- Source verified on **14 November 2026**. The page's date is preserved separately from the verification date; this report does not represent it as a newly downloaded 2026 masterlist.
- [PSA PSGC release index](https://psa.gov.ph/classification/psgc/) and its 2026 correction notices were also checked; no Lipa entry was found in those 2026 correction tables.
- The PSGC workbook download was blocked by the source site's browser challenge. The public official city directory supplied the complete list instead. The app does not depend on an external geography API at runtime.
- [Lipa City LGU barangay profiles](https://lipa.gov.ph/barangay-profiles/) and [LGU general information](https://lipa.gov.ph/wp-content/uploads/2025/07/GI-2025-as-of-July.pdf) were used as secondary references for local display wording. New dropdown values follow PSA spellings. Historical/local spellings remain intact unless explicitly edited.

`src/constants/lipa-barangays.json` is the single stored official list, with source URL, source date and verification date. `options.ts` exports a naturally alphabetized copy (numbered names sort in numeric order). There are 72 unique options. The previous 14-item list included non-Lipa entries and incomplete generic Poblacion wording.

## Address audit and behavior

The existing database stores `barangay` and `address` as text; it has no separate city/municipality column.

- Admin walk-in registration now has a City / Municipality dropdown and searchable barangay dropdown.
- Admin-assisted profile editing uses the same controls. Unchanged saved spelling and address text are preserved, including historical values outside the official list.
- Applicant Profile itself is read-only for addresses; no new applicant write permission or unrelated profile redesign was introduced. Its existing saved-address display remains unchanged.
- Resume Maker uses the same location controls and no longer forces Lipa City into another municipality's resume.
- The Admin applicant filter is searchable and still uses actual saved values, including historical and outside-city values. A record-search filter deliberately does not hide them behind the official new-address list.
- The Lipa list is applied only for an explicitly selected Lipa City. Other municipalities retain free-text barangay input. Clear city wording may be read from address text; ambiguous locations and municipality names are not guessed from a barangay name.
- City selection is a form helper persisted as part of the existing complete-address text when needed. No new database column is sent. Explicit city/address conflicts require review, rather than silently replacing address text.
- New registration requests with `cityMunicipality` validate Lipa names before any Auth user, upload or applicant is created. Case/spacing variants of an official name are canonicalized for the new record. Legacy callers without the optional city field retain their previous contract.
- OCR extraction/model/prompts remain unchanged. The frontend now retains unrecognized location candidates for staff review instead of silently discarding an outside-city barangay.
- The shared searchable dropdown uses the same control styling as Gender, with a searchable popup and keyboard/mobile support without installing a new control library. Search hints help locate a few historical/local spellings but never convert saved values automatically.

## Job qualification audit and behavior

Existing job records already use `hard_skills` (text array), `soft_skills` (text array), and `education` (text). Job creation/editing already saves these fields, and `fetchJobs` selects them.

- The shared Applicant/Public job card now shows Hard Skills, Soft Skills and Minimum Education separately using actual fetched values.
- Admin Job Listings shows the same requirements in each row and in its job details panel.
- Cards initially show three skills per category; Admin rows show two per category. A keyboard-operable View All / Show Less control expands remaining requirements.
- Missing fields show Not specified. Display normalization handles nulls and legacy comma/newline/semicolon lists without changing records. Technical skill identifiers and compound phrases remain intact.
- Matching status styling remains available on Applicant skill tags. Qualification rendering does not calculate compatibility or change the NLP engine.
- Job location text is displayed as recorded, without automatically appending a potentially incorrect or duplicate province.
- The existing 30-day expiry behavior inside fetchJobs is unchanged. Tests mock this API; no live expiry update was run for verification.

## Files created or modified for Batch 2

New:

- `backend/address.cjs` — scoped registration location validation and existing-field mapping.
- `src/constants/lipa-barangays.json` — complete official list and provenance.
- `src/lib/applicantAddress.ts` — location scope, historical preservation and review helpers.
- `src/lib/jobQualifications.ts` — safe display-only qualification list normalization.
- `src/components/shared/BarangayField.tsx` — reusable native searchable location controls.
- `src/components/shared/JobQualifications.tsx` — compact, expandable actual qualification display.
- `tests/batch2-data.test.cjs` — eight data/source/mapping/validation regression tests.
- `docs/batch2-data-accuracy.md` — this report.

Modified:

- `backend/registration.cjs` — validates and saves the reviewed address using existing columns.
- `src/constants/options.ts` — centralized sorted list export.
- `src/components/modals/EditApplicantModal.tsx` — location controls and unchanged-address preservation.
- `src/components/ui/SearchableSelect.tsx` and `src/components/ui/Form.tsx` — shared Select appearance with searchable popup, keyboard selection, and mobile positioning.
- `src/components/shared/GlobalFilterBar.tsx` — optional searchable filter control.
- `src/components/shared/JobBrowser.tsx` — qualifications on Applicant/Public cards.
- `src/lib/api.ts` — optional city form field and safe qualification response mappings.
- `src/lib/ocr.ts` — preserve location candidates for review.
- `src/lib/portalCopy/adminCatalog.ts` and `src/lib/portalCopy/adminOps.ts` — Filipino text for new controls.
- `src/pages/admin/ApplicantsPage.tsx` — searchable saved-barangay filter.
- `src/pages/admin/JobListingsPage.tsx` — actual qualifications in list and details; scrollable details panel.
- `src/pages/admin/RegisterWalkIn.tsx` — city-scoped selection, validation and review values.
- `src/pages/public/JobsPage.tsx` — recorded location wording.
- `src/pages/public/ResumeMakerPage.tsx` — shared location controls and correct city in exported contact details.
- `tests/registration.test.cjs` — two new mocked persistence/pre-creation validation cases.
- `tests/referral-settings.test.cjs` and `tests/matching-summary.test.cjs` — API test-loader dependency updates only; their existing assertions remain.
- `tsconfig.app.json` — JSON imports for the shared official dataset.

## Verification

- Node regression suite: **128/128 passed** (118 baseline plus 10 focused Batch 2 cases).
- Frontend build passed.
- Focused lint passed with no errors. Eight existing React effect/dependency warnings remain in RegisterWalkIn and ApplicantsPage; these unrelated effects were preserved.
- `git diff --check` passed.
- Isolated browser fixture with the real profile editor, job cards, qualification widget and Admin job listings: 72 searchable options, alphabetical ordering, unchanged historical save/reload, outside-city persistence, invalid Lipa rejection, validity reset after city change, actual qualification rendering, missing-field handling, keyboard View All, light/dark styling and 390px mobile overflow checks passed. No runtime errors.
- Database operations in tests were mocked. No production records were used for UI verification.

## Remaining limits

The official list is a versioned static source snapshot and should be reverified when PSA publishes relevant changes. Existing addresses remain free text, so ambiguous city wording needs staff review; no nationwide municipality/barangay directory or separate city schema was introduced. Legacy API clients that omit cityMunicipality remain permissive for compatibility. Supabase deployment/RLS behavior was not retested against production.

Batch 1 referral processing, saved history, pronouns, signatory settings and reactive matching were preserved. Sentence-Transformer inference, cosine threshold, Gemini OCR/recommendations, the 50–30–20 scoring formula and 60% cutoff were not changed. No Batch 3 work was performed.

Dropdown appearance follow-up: border, height (54px at the existing root font size), radius and arrow match Gender. Synthetic browser checks passed for search, keyboard selection/focus restoration, saved historical address, outside-city persistence, mobile popup fit and dark mode. Focused lint has one Fast Refresh advisory for sharing the Form control class constant, with no errors.

List-only follow-up: the Lipa barangay popup contains official options only. Historical nonofficial spellings are no longer selectable and require an official selection before saving edits. Existing stored records are not automatically modified. Search filters options; it does not create a new value. Other municipalities remain outside the Lipa list restriction.

Form consistency follow-up: Barangay and City / Municipality now reuse the same native Select component as Gender. City defaults to Lipa City, with no free-text city creation. An existing outside-city value remains available when editing its historical record. Barangay selection is limited to the official Lipa list; native dropdown keyboard type-ahead is available.
