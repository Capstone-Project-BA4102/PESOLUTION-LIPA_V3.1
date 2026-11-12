BEGIN;

CREATE TABLE IF NOT EXISTS public.hired_application_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  feedback_text text CHECK (feedback_text IS NULL OR length(trim(feedback_text)) BETWEEN 10 AND 4000),
  congratulations_acknowledged_at timestamptz,
  invitation_dismissed_at timestamptz,
  submitted_at timestamptz,
  sentiment_status text NOT NULL DEFAULT 'pending' CHECK (sentiment_status IN ('pending','classified','failed')),
  sentiment_label text CHECK (sentiment_label IN ('positive','neutral','negative')),
  sentiment_confidence numeric(6,5) CHECK (sentiment_confidence BETWEEN 0 AND 1),
  sentiment_model text,
  sentiment_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (submitted_at IS NULL OR (rating IS NOT NULL AND feedback_text IS NOT NULL)),
  CHECK (sentiment_status <> 'classified' OR sentiment_label IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS hired_feedback_applicant ON public.hired_application_feedback(applicant_id);
CREATE INDEX IF NOT EXISTS hired_feedback_submitted ON public.hired_application_feedback(submitted_at DESC) WHERE submitted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS hired_feedback_sentiment ON public.hired_application_feedback(sentiment_label) WHERE submitted_at IS NOT NULL;

ALTER TABLE public.hired_application_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY hired_feedback_own_read ON public.hired_application_feedback FOR SELECT TO authenticated
  USING (applicant_id = public.my_applicant_id());
CREATE POLICY hired_feedback_superadmin_read ON public.hired_application_feedback FOR SELECT TO authenticated
  USING (public.is_superadmin());
REVOKE ALL ON public.hired_application_feedback FROM anon, authenticated;
GRANT SELECT ON public.hired_application_feedback TO authenticated;
GRANT ALL ON public.hired_application_feedback TO service_role;

COMMIT;
