BEGIN;

-- ============================================================
-- MÓDULO: LIVE DE VOZ — Realtime
-- Habilita a publicação das tabelas do módulo no Supabase Realtime
-- (o projeto não tinha nenhuma tabela publicada até aqui).
-- ============================================================

ALTER TABLE public.live_rooms            REPLICA IDENTITY FULL;
ALTER TABLE public.live_participantes    REPLICA IDENTITY FULL;
ALTER TABLE public.live_solicitacoes      REPLICA IDENTITY FULL;
ALTER TABLE public.live_chat_mensagens    REPLICA IDENTITY FULL;
ALTER TABLE public.live_presentes_envios  REPLICA IDENTITY FULL;
ALTER TABLE public.live_apresentacoes    REPLICA IDENTITY FULL;

DO $$
DECLARE
  t TEXT;
  tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'live_rooms', 'live_participantes', 'live_solicitacoes',
    'live_chat_mensagens', 'live_presentes_envios', 'live_apresentacoes'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tabela
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tabela);
    END IF;
  END LOOP;
END $$;

COMMIT;
