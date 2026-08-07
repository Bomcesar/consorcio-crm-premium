BEGIN;

-- ---------------------------------------------------------------------
-- LEADS (campos e índices usados pelo frontend)
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.leads
  ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cidade TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Novo',
  ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);

-- ---------------------------------------------------------------------
-- INDICADORES (campos do formulário e payload)
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.indicadores
  ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cidade TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cpf TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pix TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS profissao TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_entrada DATE,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Novo',
  ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS usuario_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'indicadores_usuario_id_fkey'
      AND conrelid = 'public.indicadores'::regclass
  ) THEN
    ALTER TABLE public.indicadores
      ADD CONSTRAINT indicadores_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS indicadores_created_at_idx ON public.indicadores (created_at DESC);
CREATE INDEX IF NOT EXISTS indicadores_usuario_id_idx ON public.indicadores (usuario_id);
CREATE INDEX IF NOT EXISTS indicadores_status_idx ON public.indicadores (status);
CREATE INDEX IF NOT EXISTS indicadores_ativo_idx ON public.indicadores (ativo);

-- ---------------------------------------------------------------------
-- CONTATOS INDICADOS
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.contatos_indicados
  ADD COLUMN IF NOT EXISTS indicador_id UUID,
  ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS telefone TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cidade TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Novo',
  ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS usuario_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contatos_indicados_indicador_id_fkey'
      AND conrelid = 'public.contatos_indicados'::regclass
  ) THEN
    ALTER TABLE public.contatos_indicados
      ADD CONSTRAINT contatos_indicados_indicador_id_fkey
      FOREIGN KEY (indicador_id) REFERENCES public.indicadores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contatos_indicados_usuario_id_fkey'
      AND conrelid = 'public.contatos_indicados'::regclass
  ) THEN
    ALTER TABLE public.contatos_indicados
      ADD CONSTRAINT contatos_indicados_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS contatos_indicados_indicador_id_idx ON public.contatos_indicados (indicador_id);
CREATE INDEX IF NOT EXISTS contatos_indicados_usuario_id_idx ON public.contatos_indicados (usuario_id);
CREATE INDEX IF NOT EXISTS contatos_indicados_status_idx ON public.contatos_indicados (status);
CREATE INDEX IF NOT EXISTS contatos_indicados_created_at_idx ON public.contatos_indicados (created_at DESC);

-- ---------------------------------------------------------------------
-- COMISSOES INDICADORES
-- ---------------------------------------------------------------------
ALTER TABLE IF EXISTS public.comissoes_indicadores
  ADD COLUMN IF NOT EXISTS indicador_id UUID,
  ADD COLUMN IF NOT EXISTS valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Pendente',
  ADD COLUMN IF NOT EXISTS pix TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_pagamento DATE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS usuario_id UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_indicadores_indicador_id_fkey'
      AND conrelid = 'public.comissoes_indicadores'::regclass
  ) THEN
    ALTER TABLE public.comissoes_indicadores
      ADD CONSTRAINT comissoes_indicadores_indicador_id_fkey
      FOREIGN KEY (indicador_id) REFERENCES public.indicadores(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_indicadores_usuario_id_fkey'
      AND conrelid = 'public.comissoes_indicadores'::regclass
  ) THEN
    ALTER TABLE public.comissoes_indicadores
      ADD CONSTRAINT comissoes_indicadores_usuario_id_fkey
      FOREIGN KEY (usuario_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS comissoes_indicadores_indicador_id_idx ON public.comissoes_indicadores (indicador_id);
CREATE INDEX IF NOT EXISTS comissoes_indicadores_usuario_id_idx ON public.comissoes_indicadores (usuario_id);
CREATE INDEX IF NOT EXISTS comissoes_indicadores_status_idx ON public.comissoes_indicadores (status);
CREATE INDEX IF NOT EXISTS comissoes_indicadores_created_at_idx ON public.comissoes_indicadores (created_at DESC);

COMMIT;
