-- Review before applying. Adds isolated evaluation tables; no production applicant data is changed.
BEGIN;

CREATE TABLE IF NOT EXISTS public.resume_evaluation_datasets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source text NOT NULL DEFAULT 'uploaded_jsonl',
  file_name text NOT NULL,
  file_hash text NOT NULL UNIQUE,
  content_hash text NOT NULL UNIQUE,
  schema_version text NOT NULL DEFAULT 'synthetic-resume-v1',
  synthetic boolean NOT NULL DEFAULT true CHECK (synthetic),
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  record_count integer NOT NULL DEFAULT 0 CHECK (record_count >= 0),
  split_counts jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(split_counts) = 'object'),
  status text NOT NULL CHECK (status IN ('importing','ready','failed')),
  error text
);

CREATE TABLE IF NOT EXISTS public.resume_evaluation_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id uuid NOT NULL REFERENCES public.resume_evaluation_datasets(id) ON DELETE CASCADE,
  resume_id text NOT NULL,
  category text NOT NULL DEFAULT '',
  split text NOT NULL CHECK (split IN ('development','validation','test')),
  resume_text text NOT NULL CHECK (length(resume_text) > 0),
  target_json jsonb NOT NULL CHECK (jsonb_typeof(target_json) = 'object'),
  source_hash text NOT NULL,
  UNIQUE(dataset_id, resume_id),
  UNIQUE(dataset_id, source_hash)
);
CREATE INDEX IF NOT EXISTS resume_evaluation_records_dataset_split ON public.resume_evaluation_records(dataset_id, split);

CREATE TABLE IF NOT EXISTS public.resume_evaluation_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id uuid NOT NULL REFERENCES public.resume_evaluation_datasets(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  model text NOT NULL,
  split text NOT NULL CHECK (split IN ('validation','test')),
  requested_limit integer CHECK (requested_limit IS NULL OR requested_limit > 0),
  status text NOT NULL CHECK (status IN ('queued','running','completed','completed_with_errors','failed','cancelled')),
  total_records integer NOT NULL DEFAULT 0,
  processed_records integer NOT NULL DEFAULT 0,
  successful_records integer NOT NULL DEFAULT 0,
  failed_records integer NOT NULL DEFAULT 0,
  skipped_records integer NOT NULL DEFAULT 0,
  counts jsonb NOT NULL DEFAULT '{"tp":0,"fp":0,"fn":0}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  per_field_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_version text NOT NULL,
  normalization_version text NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resume_evaluation_runs_created ON public.resume_evaluation_runs(created_at DESC);

CREATE TABLE IF NOT EXISTS public.resume_evaluation_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id uuid NOT NULL REFERENCES public.resume_evaluation_runs(id) ON DELETE CASCADE,
  record_id uuid NOT NULL REFERENCES public.resume_evaluation_records(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('successful','failed','skipped')),
  predicted_json jsonb,
  field_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  counts jsonb NOT NULL DEFAULT '{"tp":0,"fp":0,"fn":0}'::jsonb,
  error text,
  duration_ms integer,
  UNIQUE(run_id, record_id)
);

ALTER TABLE public.resume_evaluation_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_evaluation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_evaluation_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY resume_evaluation_datasets_superadmin ON public.resume_evaluation_datasets FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY resume_evaluation_records_superadmin ON public.resume_evaluation_records FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY resume_evaluation_runs_superadmin ON public.resume_evaluation_runs FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY resume_evaluation_results_superadmin ON public.resume_evaluation_results FOR SELECT TO authenticated USING (public.is_superadmin());
REVOKE ALL ON public.resume_evaluation_datasets, public.resume_evaluation_records, public.resume_evaluation_runs, public.resume_evaluation_results FROM anon, authenticated;
GRANT SELECT ON public.resume_evaluation_datasets, public.resume_evaluation_records, public.resume_evaluation_runs, public.resume_evaluation_results TO authenticated;
GRANT ALL ON public.resume_evaluation_datasets, public.resume_evaluation_records, public.resume_evaluation_runs, public.resume_evaluation_results TO service_role;

COMMIT;
