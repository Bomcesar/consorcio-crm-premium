BEGIN;

-- ============================================================
-- MÓDULO: LIVE DE VOZ (FASE 8)
-- Apresentação: PDF, vídeo e compartilhamento de tela.
-- O arquivo reaproveita a infraestrutura de anexos existente
-- (bucket privado "anexos" + tabela public.anexos), com
-- entity_type = 'live_apresentacao'.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_apresentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'pdf' CHECK (tipo IN ('pdf', 'video', 'screen')),
  -- Reaproveita a tabela genérica de anexos do sistema
  anexo_id UUID REFERENCES public.anexos(id) ON DELETE SET NULL,
  caminho TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  titulo TEXT NOT NULL DEFAULT '',
  pagina_atual INTEGER NOT NULL DEFAULT 1 CHECK (pagina_atual >= 1),
  total_paginas INTEGER NOT NULL DEFAULT 0 CHECK (total_paginas >= 0),
  -- Sincronização de reprodução de vídeo (evita que cada
  -- espectador rode seu próprio áudio/posição)
  reproduzindo BOOLEAN NOT NULL DEFAULT FALSE,
  tempo_atual_segundos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrada_em TIMESTAMPTZ,
  iniciado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Compartilhamento de tela não tem arquivo: o conteúdo vem do
  -- track de tela do LiveKit.
  CONSTRAINT live_apresentacoes_tela_sem_arquivo_check CHECK (
    tipo <> 'screen' OR caminho = ''
  )
);

CREATE INDEX IF NOT EXISTS live_apresentacoes_live_id_idx
  ON public.live_apresentacoes (live_id, encerrada_em);

-- A sala tem no máximo UMA apresentação aberta. Começar outra
-- exige encerrar a anterior, o que garante que a sincronização de
-- página e de reprodução não divirjam entre participantes.
CREATE UNIQUE INDEX IF NOT EXISTS live_apresentacoes_ativa_unica
  ON public.live_apresentacoes (live_id)
  WHERE encerrada_em IS NULL;

-- ------------------------------------------------------------
-- Trigger updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_live_apresentacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_apresentacoes_updated_at ON public.live_apresentacoes;
CREATE TRIGGER update_live_apresentacoes_updated_at
  BEFORE UPDATE ON public.live_apresentacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_live_apresentacoes_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.live_apresentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leio a apresentacao da sala" ON public.live_apresentacoes;
CREATE POLICY "Leio a apresentacao da sala"
  ON public.live_apresentacoes FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      public.live_e_anfitriao(live_id)
      OR public.live_participa(live_id)
      OR public.live_aberta(live_id)
    )
  );

-- Somente o anfitrião inicia, controla páginas e encerra
DROP POLICY IF EXISTS "Anfitriao inicia apresentacao" ON public.live_apresentacoes;
CREATE POLICY "Anfitriao inicia apresentacao"
  ON public.live_apresentacoes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.live_e_anfitriao(live_id)
    AND iniciado_por = auth.uid()
  );

DROP POLICY IF EXISTS "Anfitriao controla apresentacao" ON public.live_apresentacoes;
CREATE POLICY "Anfitriao controla apresentacao"
  ON public.live_apresentacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id))
  WITH CHECK (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

DROP POLICY IF EXISTS "Anfitriao encerra apresentacao" ON public.live_apresentacoes;
CREATE POLICY "Anfitriao encerra apresentacao"
  ON public.live_apresentacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

COMMIT;
