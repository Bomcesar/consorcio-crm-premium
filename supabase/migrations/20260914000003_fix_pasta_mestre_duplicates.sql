BEGIN;

-- ============================================================
-- Clean up duplicate "Mestre" pastas and prevent future duplicates
-- The original getOrCreatePastaMestre used .maybeSingle() which
-- fails when multiple "Mestre" rows exist, causing new ones to
-- be created each time.
-- ============================================================

-- Delete all but the oldest "Mestre" pasta per user
WITH mestre_ranked AS (
  SELECT id, row_number() OVER (
    PARTITION BY usuario_id
    ORDER BY created_at ASC
  ) as rn
  FROM public.pastas
  WHERE nome = 'Mestre'
)
DELETE FROM public.pastas
WHERE id IN (
  SELECT id FROM mestre_ranked WHERE rn > 1
);

-- Add unique constraint on (usuario_id, nome) for "Mestre" pastas
-- to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_pastas_mestre_unique
  ON public.pastas(usuario_id, nome)
  WHERE nome = 'Mestre';

COMMIT;
