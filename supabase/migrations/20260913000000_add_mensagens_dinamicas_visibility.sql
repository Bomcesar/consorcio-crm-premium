BEGIN;

-- ============================================================
-- VISIBILIDADE DO MÓDULO: Mensagens Dinâmicas
-- Adiciona o módulo de Mensagens Dinâmicas como visível
-- para todos os perfis no sistema de module_visibility.
-- ============================================================

INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
SELECT perfis.perfil, 'Mensagens Dinâmicas', '/mensagens-dinamicas', 'Mensagens Dinâmicas', true
FROM (
  VALUES
    ('Administrador'::text),
    ('Gestor'::text),
    ('Consultor'::text),
    ('Trainee'::text),
    ('Secretaria'::text),
    ('Indicador'::text),
    ('Assistente'::text)
) AS perfis(perfil)
ON CONFLICT (perfil, modulo) DO UPDATE
  SET href = EXCLUDED.href,
      titulo = EXCLUDED.titulo,
      visivel = true;

COMMIT;
