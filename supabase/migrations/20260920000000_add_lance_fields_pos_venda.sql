BEGIN;

-- Add lance_grupo and lance_cota columns for the "Lance"/"Segundo Lance" status
ALTER TABLE public.pos_venda
  ADD COLUMN IF NOT EXISTS lance_grupo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lance_cota TEXT NOT NULL DEFAULT '';

NOTIFY postgrest, 'reload schema';

COMMIT;
