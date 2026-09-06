BEGIN;

-- Fix pos_venda: add satisfaction column + check constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'satisfaction'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN satisfaction INTEGER NOT NULL DEFAULT 3;
  END IF;
END $$;

-- Fix pos_venda: ensure other columns exist that the code references
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'next_contact_at'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN next_contact_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'last_contact_at'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN last_contact_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'channel'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN channel TEXT NOT NULL DEFAULT 'WhatsApp';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'needs_attention'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN needs_attention BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'boleto_url'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN boleto_url TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'lembrete_em'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN lembrete_em TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'retencao_motivo'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN retencao_motivo TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pos_venda'
      AND column_name = 'retencao_data'
  ) THEN
    ALTER TABLE public.pos_venda ADD COLUMN retencao_data TIMESTAMPTZ;
  END IF;
END $$;

-- Add/ensure satisfaction check constraint (1-5 inclusive)
ALTER TABLE public.pos_venda DROP CONSTRAINT IF EXISTS pos_venda_satisfaction_check;
ALTER TABLE public.pos_venda ADD CONSTRAINT pos_venda_satisfaction_check CHECK (satisfaction >= 1 AND satisfaction <= 5);

-- Fix parceiros: add usuario_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'parceiros'
      AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.parceiros ADD COLUMN usuario_id UUID;
    UPDATE public.parceiros SET usuario_id = '00000000-0000-0000-0000-000000000000' WHERE usuario_id IS NULL;
    ALTER TABLE public.parceiros ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
END $$;

-- Fix recrutamento: add usuario_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recrutamento'
      AND column_name = 'usuario_id'
  ) THEN
    ALTER TABLE public.recrutamento ADD COLUMN usuario_id UUID;
    UPDATE public.recrutamento SET usuario_id = '00000000-0000-0000-0000-000000000000' WHERE usuario_id IS NULL;
    ALTER TABLE public.recrutamento ALTER COLUMN usuario_id SET NOT NULL;
  END IF;
END $$;

-- Ensure RLS is enabled on parceiros and recrutamento
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recrutamento ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies for parceiros (drop old ones first)
DROP POLICY IF EXISTS "Authenticated users can view own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can insert own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can update own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can delete own parceiros" ON public.parceiros;

CREATE POLICY "Authenticated users can view own parceiros"
  ON public.parceiros FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert own parceiros"
  ON public.parceiros FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update own parceiros"
  ON public.parceiros FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete own parceiros"
  ON public.parceiros FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS parceiros_usuario_id_idx ON public.parceiros (usuario_id);

-- Recreate RLS policies for recrutamento
DROP POLICY IF EXISTS "Authenticated users can view own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can insert own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can update own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can delete own recrutamento" ON public.recrutamento;

CREATE POLICY "Authenticated users can view own recrutamento"
  ON public.recrutamento FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert own recrutamento"
  ON public.recrutamento FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update own recrutamento"
  ON public.recrutamento FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete own recrutamento"
  ON public.recrutamento FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS recrutamento_usuario_id_idx ON public.recrutamento (usuario_id);

NOTIFY postgrest, 'reload schema';

COMMIT;
