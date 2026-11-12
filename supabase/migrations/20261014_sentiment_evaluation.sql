-- Additive migration for feedback sentiment evaluation. No production or legacy table is dropped.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.resume_evaluation_datasets_backup_20261014 AS TABLE public.resume_evaluation_datasets WITH DATA;
CREATE TABLE IF NOT EXISTS private.resume_evaluation_records_backup_20261014 AS TABLE public.resume_evaluation_records WITH DATA;
CREATE TABLE IF NOT EXISTS private.resume_evaluation_runs_backup_20261014 AS TABLE public.resume_evaluation_runs WITH DATA;
CREATE TABLE IF NOT EXISTS private.resume_evaluation_results_backup_20261014 AS TABLE public.resume_evaluation_results WITH DATA;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.sentiment_evaluation_datasets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name text NOT NULL,
  file_hash text NOT NULL UNIQUE,
  content_hash text NOT NULL UNIQUE,
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  record_count integer NOT NULL CHECK (record_count > 0),
  split_counts jsonb NOT NULL CHECK (jsonb_typeof(split_counts) = 'object'),
  class_counts jsonb NOT NULL CHECK (jsonb_typeof(class_counts) = 'object'),
  test_fraction numeric(4,3) NOT NULL DEFAULT 0.200 CHECK (test_fraction > 0 AND test_fraction < 1),
  random_seed integer NOT NULL DEFAULT 42,
  schema_version text NOT NULL DEFAULT 'feedback-sentiment-v1',
  status text NOT NULL CHECK (status IN ('importing','ready','failed')),
  error text
);

CREATE TABLE IF NOT EXISTS public.sentiment_evaluation_records (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id uuid NOT NULL REFERENCES public.sentiment_evaluation_datasets(id) ON DELETE CASCADE,
  source_row integer NOT NULL CHECK (source_row > 0),
  external_id text,
  feedback_text text NOT NULL CHECK (length(trim(feedback_text)) > 0),
  ground_truth_label text NOT NULL CHECK (ground_truth_label IN ('positive','neutral','negative')),
  split text NOT NULL CHECK (split IN ('training','testing')),
  text_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, source_row),
  UNIQUE(dataset_id, text_hash)
);
CREATE INDEX IF NOT EXISTS sentiment_records_dataset_split ON public.sentiment_evaluation_records(dataset_id, split);
CREATE INDEX IF NOT EXISTS sentiment_records_dataset_label ON public.sentiment_evaluation_records(dataset_id, ground_truth_label);

CREATE TABLE IF NOT EXISTS public.sentiment_evaluation_runs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id uuid NOT NULL REFERENCES public.sentiment_evaluation_datasets(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  algorithm text NOT NULL DEFAULT 'tfidf_logistic_regression' CHECK (algorithm = 'tfidf_logistic_regression'),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(configuration) = 'object'),
  status text NOT NULL CHECK (status IN ('queued','training','completed','failed','cancelled')),
  model_version text NOT NULL,
  artifact_uri text,
  artifact_sha256 text,
  training_records integer NOT NULL DEFAULT 0 CHECK (training_records >= 0),
  testing_records integer NOT NULL DEFAULT 0 CHECK (testing_records >= 0),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metrics) = 'object'),
  per_class_metrics jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(per_class_metrics) = 'object'),
  confusion_matrix jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(confusion_matrix) = 'object'),
  runtime_metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(runtime_metadata) = 'object'),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  error text
);
CREATE INDEX IF NOT EXISTS sentiment_runs_dataset_created ON public.sentiment_evaluation_runs(dataset_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.sentiment_evaluation_results (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id uuid NOT NULL REFERENCES public.sentiment_evaluation_runs(id) ON DELETE CASCADE,
  record_id uuid NOT NULL REFERENCES public.sentiment_evaluation_records(id) ON DELETE RESTRICT,
  actual_label text NOT NULL CHECK (actual_label IN ('positive','neutral','negative')),
  predicted_label text NOT NULL CHECK (predicted_label IN ('positive','neutral','negative')),
  probabilities jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(probabilities) = 'object'),
  is_correct boolean GENERATED ALWAYS AS (actual_label = predicted_label) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id, record_id)
);
CREATE INDEX IF NOT EXISTS sentiment_results_run_prediction ON public.sentiment_evaluation_results(run_id, predicted_label);

ALTER TABLE public.sentiment_evaluation_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_evaluation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_evaluation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sentiment_evaluation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY sentiment_datasets_superadmin_read ON public.sentiment_evaluation_datasets FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY sentiment_records_superadmin_read ON public.sentiment_evaluation_records FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY sentiment_runs_superadmin_read ON public.sentiment_evaluation_runs FOR SELECT TO authenticated USING (public.is_superadmin());
CREATE POLICY sentiment_results_superadmin_read ON public.sentiment_evaluation_results FOR SELECT TO authenticated USING (public.is_superadmin());

REVOKE ALL ON public.sentiment_evaluation_datasets, public.sentiment_evaluation_records, public.sentiment_evaluation_runs, public.sentiment_evaluation_results FROM anon, authenticated;
GRANT SELECT ON public.sentiment_evaluation_datasets, public.sentiment_evaluation_records, public.sentiment_evaluation_runs, public.sentiment_evaluation_results TO authenticated;
GRANT ALL ON public.sentiment_evaluation_datasets, public.sentiment_evaluation_records, public.sentiment_evaluation_runs, public.sentiment_evaluation_results TO service_role;

COMMIT;
