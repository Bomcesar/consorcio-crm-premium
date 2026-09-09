BEGIN;

CREATE TABLE IF NOT EXISTS public.usuario_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline',
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.usuario_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own status" ON public.usuario_status;
DROP POLICY IF EXISTS "Users can update their own status" ON public.usuario_status;

CREATE POLICY "Users can view their own status"
  ON public.usuario_status FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Users can update their own status"
  ON public.usuario_status FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Users can insert their own status"
  ON public.usuario_status FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuario_status_usuario_id ON public.usuario_status(usuario_id);

COMMIT;
