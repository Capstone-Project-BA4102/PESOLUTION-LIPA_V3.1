-- Optional EXISTING-PROJECT metadata inventory. No record contents are returned.
-- Read-only: no DROP, UPDATE, DELETE, grants, policies or other persistent writes.
-- Estimates may be stale; absence of dependencies here is not permission to drop.
begin transaction read only;

-- Candidate objects, including historical private backup tables.
select n.nspname as schema_name, c.relname as object_name, c.relkind,
       c.reltuples::bigint as estimated_rows, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','private') and c.relkind in ('r','p','v','m')
  and (c.relname = 'hired_application_feedback'
       or c.relname like 'sentiment_evaluation_%'
       or c.relname like 'resume_evaluation_%')
order by 1,2;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname in ('public','private')
  and (tablename = 'hired_application_feedback'
       or tablename like 'sentiment_evaluation_%'
       or tablename like 'resume_evaluation_%')
order by 1,2,3;

-- Catalog-recorded dependencies; dynamic SQL/external clients require review too.
select distinct n.nspname as referenced_schema, c.relname as referenced_table,
       pg_describe_object(d.classid,d.objid,d.objsubid) as dependent_object,
       d.deptype as dependency_type
from pg_depend d join pg_class c on d.refclassid = 'pg_class'::regclass and d.refobjid = c.oid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public','private')
  and (c.relname = 'hired_application_feedback'
       or c.relname like 'sentiment_evaluation_%'
       or c.relname like 'resume_evaluation_%')
order by 1,2,3;

rollback;
