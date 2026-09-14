BEGIN;

-- ============================================================
-- ENSURE: Mensagens Dinâmicas module visibility records
-- This migration ensures all perfil records for "Mensagens Dinâmicas"
-- exist in module_visibility. Uses DELETE + INSERT to guarantee.
-- ============================================================

DELETE FROM public.module_visibility
WHERE modulo = 'Mensagens Dinâmicas';

INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
VALUES
  ('Administrador', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Gestor', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Consultor', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Trainee', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Secretaria', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true),
  ('Indicador', 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true);

COMMIT;
