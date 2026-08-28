BEGIN;

-- ============================================================
-- VISIBILIDADE GLOBAL DE ITENS DOS MÓDULOS
-- Adiciona campo visivel para controlar se o item aparece
-- para usuários comuns. Administradores sempre veem tudo.
-- ============================================================

ALTER TABLE public.treinamentos ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;
ALTER TABLE public.materiais_consultores ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;
ALTER TABLE public.links_uteis ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_treinamentos_visivel ON public.treinamentos(visivel) WHERE visivel = true;
CREATE INDEX IF NOT EXISTS idx_materiais_consultores_visivel ON public.materiais_consultores(visivel) WHERE visivel = true;
CREATE INDEX IF NOT EXISTS idx_links_uteis_visivel ON public.links_uteis(visivel) WHERE visivel = true;

-- Atualiza registros existentes para visivel = true
UPDATE public.treinamentos SET visivel = true WHERE visivel IS NULL;
UPDATE public.materiais_consultores SET visivel = true WHERE visivel IS NULL;
UPDATE public.links_uteis SET visivel = true WHERE visivel IS NULL;

COMMIT;
