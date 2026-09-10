BEGIN;

CREATE POLICY "Authenticated users can view basic profiles for identification"
  ON public.profiles
  FOR SELECT
  USING (auth.role() = 'authenticated');

COMMIT;
