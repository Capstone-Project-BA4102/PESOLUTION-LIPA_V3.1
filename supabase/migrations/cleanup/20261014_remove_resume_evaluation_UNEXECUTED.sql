-- DO NOT EXECUTE without explicit approval after backup and sentiment workflow verification.
BEGIN;

-- Intentionally no CASCADE: PostgreSQL must stop cleanup if an undiscovered dependency exists.
DROP TABLE public.resume_evaluation_results;
DROP TABLE public.resume_evaluation_runs;
DROP TABLE public.resume_evaluation_records;
DROP TABLE public.resume_evaluation_datasets;

COMMIT;
