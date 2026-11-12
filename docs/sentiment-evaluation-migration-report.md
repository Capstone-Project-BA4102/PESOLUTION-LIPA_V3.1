# Sentiment Evaluation Migration Report

## Dependency audit

The legacy `resume_evaluation_*` tables are referenced only by the former Resume Parser Evaluation migration, backend evaluator/routes, evaluation page, and focused tests. No production OCR, applicant, application, job listing, job matching, or skill recommendation table or route references them.

Database ownership inside the legacy module is:

- `resume_evaluation_records.dataset_id -> resume_evaluation_datasets.id`
- `resume_evaluation_runs.dataset_id -> resume_evaluation_datasets.id`
- `resume_evaluation_results.run_id -> resume_evaluation_runs.id`
- `resume_evaluation_results.record_id -> resume_evaluation_records.id`
- `imported_by` and `created_by` reference `auth.users`

The legacy tables use RLS and authenticated Superadmin SELECT policies. Backend writes use the service role. The additive migration copies all four tables into restricted `private.*_backup_20261014` backup tables before creating the sentiment schema.

## New workflow

1. Superadmin imports UTF-8 CSV with `feedback_text` and `sentiment`; optional ID columns are supported.
2. The backend validates labels and duplicate text, then creates a deterministic per-class 80/20 split with random seed 42.
3. Python scikit-learn trains `TfidfVectorizer` plus multiclass `LogisticRegression` using training rows only.
4. Testing rows produce real predictions, probabilities, Accuracy, macro and weighted Precision/Recall/F1, per-class metrics, and a fixed-label confusion matrix.
5. The joblib model is stored outside PostgreSQL. The run stores only its URI, SHA-256, model version, configuration, and runtime/library versions.

## Security

All new tables have RLS enabled. Authenticated users receive SELECT only when `public.is_superadmin()` is true. Anonymous and unrestricted authenticated privileges are revoked. Import and training endpoints also require the existing backend Superadmin authorization middleware.

## Cleanup status

The legacy tables have not been dropped. The cleanup script is saved under `supabase/migrations/cleanup/20261014_remove_resume_evaluation_UNEXECUTED.sql`, uses no `CASCADE`, and must not be executed without explicit approval after production verification.

## Preserved modules

Production Gemini OCR Resume Parser, Gemini skill semantic assistance, rule-based job matching, applicants, resumes, applications, listings, matches, and recommendations are unchanged.
