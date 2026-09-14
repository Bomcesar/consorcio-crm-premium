-- Reload PostgREST schema cache (already applied on remote)
NOTIFY pgrst, 'reload schema';
