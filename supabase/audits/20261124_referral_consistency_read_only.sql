-- Read-only consistency inventory; does not reset accounts, fabricate slips, or change outcomes.
-- No email addresses, credentials or resume content are returned.
SELECT a.id AS application_id, a.applicant_id, a.status, a.job_id,
       'workflow_status_without_official_slip' AS issue
FROM public.applications a
WHERE a.status IN ('Referred','Hired') AND NOT EXISTS
  (SELECT 1 FROM public.referrals r WHERE r.application_id = a.id);

SELECT applicant_id, count(*) AS active_referrals
FROM public.applications WHERE status = 'Referred'
GROUP BY applicant_id HAVING count(*) > 1;

SELECT applicant_id, job_id, count(*) AS application_rows
FROM public.applications GROUP BY applicant_id, job_id HAVING count(*) > 1;

SELECT DISTINCT h.applicant_id, 'legacy_renewal_label_without_confirmed_version' AS issue
FROM public.status_history h
WHERE h.status = 'Renewal' AND NOT EXISTS
  (SELECT 1 FROM public.applicant_renewals v WHERE v.applicant_id = h.applicant_id);

-- A closed job with an old referral is valid history; keep its slip accessible.
SELECT r.id AS referral_id, r.referral_number, a.applicant_id, a.status, j.status AS job_status
FROM public.referrals r JOIN public.applications a ON a.id = r.application_id
JOIN public.job_listings j ON j.id = a.job_id
WHERE j.status <> 'Active';
