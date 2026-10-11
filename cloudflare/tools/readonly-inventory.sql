-- Owner-supplied connection only. Metadata and aggregate counts; no CRM/user rows.
-- This file is preparation and has not been executed against the live project.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '60s';
SELECT current_database() AS database_name, version() AS postgres_version;
SELECT schema_name FROM information_schema.schemata ORDER BY schema_name;
SELECT table_schema,table_name,column_name,ordinal_position,data_type,is_nullable,column_default
  FROM information_schema.columns
  WHERE table_schema IN ('public','auth','storage') ORDER BY table_schema,table_name,ordinal_position;
SELECT n.nspname AS schema_name,c.relname AS table_name,c.relrowsecurity,c.relforcerowsecurity
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','auth','storage') AND c.relkind IN ('r','p') ORDER BY 1,2;
SELECT n.nspname AS schema_name,c.relname AS table_name,k.conname,k.contype,pg_get_constraintdef(k.oid) AS definition
  FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','auth','storage') ORDER BY 1,2,3;
SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
  FROM pg_policies WHERE schemaname IN ('public','auth','storage') ORDER BY 1,2,3;
SELECT table_schema,table_name,grantee,privilege_type,is_grantable FROM information_schema.table_privileges
  WHERE table_schema IN ('public','auth','storage') ORDER BY 1,2,3,4;
SELECT table_schema,table_name,column_name,grantee,privilege_type,is_grantable FROM information_schema.column_privileges
  WHERE table_schema IN ('public','auth','storage') ORDER BY 1,2,3,4,5;
SELECT n.nspname AS schema_name,p.proname,pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS result,p.prosecdef AS security_definer,p.provolatile,p.proacl
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname IN ('public','auth','storage') ORDER BY 1,2,3;
SELECT n.nspname AS schema_name,c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid) AS definition
  FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname IN ('public','auth','storage') AND NOT t.tgisinternal ORDER BY 1,2,3;
SELECT extname,extversion FROM pg_extension ORDER BY extname;
SELECT count(*) AS public_property_count FROM public.properties;
SELECT count(*) AS auth_user_count FROM auth.users;
SELECT count(*) AS storage_object_count FROM storage.objects;
ROLLBACK;
