-- Fix: adiciona usuario_id na tabela leads em passos seguros

-- 1. Adiciona coluna como nullable primeiro
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS usuario_id UUID;

-- 2. Atualiza registros existentes com um UUID fixo (admin) ou NULL temporário
UPDATE public.leads SET usuario_id = '00000000-0000-0000-0000-000000000000' WHERE usuario_id IS NULL;

-- 3. Agora sim pode tornar NOT NULL
ALTER TABLE public.leads ALTER COLUMN usuario_id SET NOT NULL;

-- 4. Recria políticas RLS para leads usando usuario_id
DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete their leads" ON public.leads;

CREATE POLICY "Authenticated users can view their leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their leads"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their leads"
  ON public.leads FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS leads_usuario_id_idx ON public.leads (usuario_id);
