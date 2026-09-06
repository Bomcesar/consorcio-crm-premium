BEGIN;

-- ============================================================
-- VISIBILIDADE DE ITENS POR USUÁRIO
-- Ajuste idempotente: recria apenas se necessário.
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage module item visibility" ON public.module_item_visibility;
DROP POLICY IF EXISTS "Users can view own module item visibility" ON public.module_item_visibility;
DROP TRIGGER IF EXISTS trigger_module_item_visibility_updated_at ON public.module_item_visibility;
DROP FUNCTION IF EXISTS public.update_module_item_visibility_updated_at();

CREATE TABLE IF NOT EXISTS public.module_item_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name text NOT NULL,
  item_id uuid NOT NULL,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(module_name, item_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_module_item_visibility_lookup
  ON public.module_item_visibility(module_name, item_id, usuario_id);

ALTER TABLE public.module_item_visibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage module item visibility"
  ON public.module_item_visibility FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Users can view own module item visibility"
  ON public.module_item_visibility FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

CREATE OR REPLACE FUNCTION public.update_module_item_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_module_item_visibility_updated_at ON public.module_item_visibility;
CREATE TRIGGER trigger_module_item_visibility_updated_at
  BEFORE UPDATE ON public.module_item_visibility
  FOR EACH ROW EXECUTE FUNCTION public.update_module_item_visibility_updated_at();

COMMIT;
