BEGIN;

DROP POLICY IF EXISTS "Public can view proposals by token" ON public.propostas;
DROP POLICY IF EXISTS "System can insert proposal events" ON public.proposta_eventos;

CREATE POLICY "Public can view proposals by token"
  ON public.propostas FOR SELECT
  USING (true);

CREATE POLICY "System can insert proposal events"
  ON public.proposta_eventos FOR INSERT
  WITH CHECK (true);

COMMIT;
