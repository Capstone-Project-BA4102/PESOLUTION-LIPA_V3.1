-- Enforce one active (Referred) application per applicant without deleting legacy records.
-- Existing duplicates are retained for staff review; additional referrals are blocked.
CREATE OR REPLACE FUNCTION public.peso_one_active_referral()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status <> 'Referred' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'Referred' AND OLD.applicant_id = NEW.applicant_id THEN RETURN NEW; END IF;
  END IF;
  -- All referral RPCs use this same applicant lock, serializing simultaneous issuance.
  PERFORM 1 FROM public.applicants WHERE id = NEW.applicant_id FOR UPDATE;
  IF EXISTS (SELECT 1 FROM public.applications a
    WHERE a.applicant_id = NEW.applicant_id AND a.status = 'Referred' AND a.id <> NEW.id) THEN
    RAISE EXCEPTION 'Only one active referral is allowed per applicant. Record its outcome or cancel it before issuing another.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS peso_one_active_referral ON public.applications;
CREATE TRIGGER peso_one_active_referral BEFORE INSERT OR UPDATE OF status, applicant_id ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.peso_one_active_referral();
REVOKE ALL ON FUNCTION public.peso_one_active_referral() FROM PUBLIC, anon, authenticated;
