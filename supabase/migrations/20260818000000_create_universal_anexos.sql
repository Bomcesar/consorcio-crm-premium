BEGIN;

CREATE TABLE IF NOT EXISTS public.anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id UUID NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  caminho TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  tamanho INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_anexos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_anexos_updated_at ON public.anexos;
CREATE TRIGGER update_anexos_updated_at
  BEFORE UPDATE ON public.anexos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_anexos_updated_at();

CREATE POLICY "Authenticated users can view their anexos"
  ON public.anexos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their anexos"
  ON public.anexos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their anexos"
  ON public.anexos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their anexos"
  ON public.anexos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS anexos_usuario_id_idx ON public.anexos (usuario_id);
CREATE INDEX IF NOT EXISTS anexos_entity_idx ON public.anexos (entity_type, entity_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anexos',
  'anexos',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'text/plain',
    'text/csv',
    'text/markdown'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload anexos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can view anexos"
  ON storage.objects FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can update anexos"
  ON storage.objects FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can delete anexos"
  ON storage.objects FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;
