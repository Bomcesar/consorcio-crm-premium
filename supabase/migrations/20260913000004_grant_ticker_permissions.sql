BEGIN;

-- Grant privileges on ticker_messages table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticker_messages TO anon, authenticated, service_role;

-- Grant privileges on module_visibility table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_visibility TO anon, authenticated, service_role;

-- Grant privileges on all existing tables in public schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

COMMIT;
