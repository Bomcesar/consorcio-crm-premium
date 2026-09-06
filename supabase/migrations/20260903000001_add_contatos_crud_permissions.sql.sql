BEGIN;

-- ==========================================
-- Add missing CRUD permissions for Contatos module
-- ==========================================

INSERT INTO public.user_permissions (codigo, nome, categoria, descricao) VALUES
  ('contatos.criar', 'Criar Contatos', 'Contatos', 'Cadastrar contatos'),
  ('contatos.editar', 'Editar Contatos', 'Contatos', 'Editar contatos'),
  ('contatos.excluir', 'Excluir Contatos', 'Contatos', 'Excluir contatos')
ON CONFLICT (codigo) DO NOTHING;

-- ==========================================
-- Ensure module_visibility entries exist for Trainee profile
-- for all modules, so the Configurações → Visibilidade tab
-- can properly manage them
-- ==========================================

-- Insert visibility entries for Trainee for modules that don't exist yet
-- (only insert if they don't already exist)
DO $$
DECLARE
  perfis TEXT[] := ARRAY['Trainee'];
  modules RECORD;
  nav_modules TEXT[] := ARRAY[
    'Dashboard', 'Leads', 'Central de Indicadores', 'Clientes', 'Contatos',
    'Agenda', 'WhatsApp', 'Comunicação', 'Negociações', 'Pós-venda',
    'Parceiros', 'Recrutamento', 'Biblioteca', 'Treinamentos',
    'Materiais para Consultores', 'Links úteis', 'Relatórios', 'Configurações'
  ];
  nav_hrefs TEXT[] := ARRAY[
    '/', '/leads', '/central-de-indicadores', '/clientes', '/contatos',
    '/agenda', '/whatsapp', '/comunicacao', '/negociacoes', '/pos-venda',
    '/parceiros', '/recrutamento', '/biblioteca', '/treinamentos',
    '/materiais-consultores', '/links-uteis', '/relatorios', '/configuracoes'
  ];
  i INTEGER := 1;
  existing_count INTEGER;
BEGIN
  FOR i IN 1..array_length(nav_modules, 1) LOOP
    SELECT COUNT(*) INTO existing_count
    FROM public.module_visibility
    WHERE perfil = perfis[1] AND modulo = nav_modules[i];
    IF existing_count = 0 THEN
      INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
      VALUES (perfis[1], nav_modules[i], nav_hrefs[i], nav_modules[i], true);
    END IF;
  END LOOP;
END $$;

NOTIFY postgrest, 'reload schema';

COMMIT;
