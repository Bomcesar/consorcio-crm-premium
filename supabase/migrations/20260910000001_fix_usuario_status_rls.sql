BEGIN;

DROP POLICY IF EXISTS "Users can view their own status" ON public.usuario_status;
DROP POLICY IF EXISTS "Authenticated users can view status" ON public.usuario_status;
DROP POLICY IF EXISTS "Users can update their own status" ON public.usuario_status;

CREATE POLICY "Authenticated users can view status"
  ON public.usuario_status
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own status"
  ON public.usuario_status
  FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own status"
  ON public.usuario_status
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

COMMIT;
