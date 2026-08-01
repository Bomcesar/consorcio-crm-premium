BEGIN;

ALTER TABLE public.indicadores
  ADD COLUMN IF NOT EXISTS grupo_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS link_grupo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS grupo_criado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.update_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_indicadores_updated_at ON public.indicadores;
CREATE TRIGGER update_indicadores_updated_at
BEFORE UPDATE ON public.indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_indicadores_updated_at();

COMMIT;
