-- Publish the tables used by the matching page's existing quiet Realtime listener.
-- Idempotent; no applicant records, matches or statuses are changed.
DO $$
DECLARE table_name text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime' AND puballtables) THEN
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'supabase_realtime publication is not present; configure Supabase Realtime before expecting live updates.';
    RETURN;
  END IF;
  FOREACH table_name IN ARRAY ARRAY['applicants','applications','referrals','job_matches','job_listings','resumes','status_history'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = table_name) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;
