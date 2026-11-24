-- Apply after renewal versioning and the one-active-referral migration.
-- Keep historical slips accessible; block new referrals until a real renewal is confirmed.
CREATE OR REPLACE FUNCTION public.peso_one_active_referral()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status <> 'Referred' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'Referred' AND OLD.applicant_id = NEW.applicant_id THEN RETURN NEW; END IF;
  END IF;
  PERFORM 1 FROM public.applicants WHERE id = NEW.applicant_id FOR UPDATE;
  IF public.peso_has_current_hire(NEW.applicant_id) THEN
    RAISE EXCEPTION 'Applicant is already Hired. Complete applicant renewal before issuing another referral.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.applications a
    WHERE a.applicant_id = NEW.applicant_id AND a.status = 'Referred' AND a.id <> NEW.id) THEN
    RAISE EXCEPTION 'Only one active referral is allowed per applicant. Record its outcome or cancel it before issuing another.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.peso_one_active_referral() FROM PUBLIC, anon, authenticated;
