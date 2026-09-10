BEGIN;

DROP POLICY IF EXISTS "Users can view their own status" ON public.usuario_status;

CREATE POLICY "Authenticated users can view status"
  ON public.usuario_status
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMIT;
