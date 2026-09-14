BEGIN;

-- ============================================================
-- FIX: Mensagens Dinâmicas visibility missing
-- The original migration marked as applied but did not insert records.
-- This migration re-inserts/upserts the records with ON CONFLICT.
-- ============================================================

INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
VALUES
  ('Administrador', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Gestor', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Consultor', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Trainee', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Secretaria', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Indicador', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true)
ON CONFLICT (perfil, modulo) DO UPDATE
  SET visivel = true,
      href = EXCLUDED.href,
      titulo = EXCLUDED.titulo;

COMMIT;
