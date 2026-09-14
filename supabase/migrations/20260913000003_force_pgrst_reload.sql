-- Force PostgREST to reload schema cache
-- This NOTIFY command signals PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Also create and immediately drop a dummy table to ensure schema change
CREATE TABLE IF NOT EXISTS _pgrst_reload_trigger (id int);
DROP TABLE IF EXISTS _pgrst_reload_trigger;

-- Second NOTIFY to catch any timing issues
NOTIFY pgrst, 'reload schema';
