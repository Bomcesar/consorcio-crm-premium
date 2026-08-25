BEGIN;

-- ============================================================
-- VISIBILIDADE DE MÓDULOS POR PERFIL
-- Permite ao Administrador controlar quais módulos aparecem
-- no menu para cada perfil, sem alterar código.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.module_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil text NOT NULL,
  modulo text NOT NULL,
  href text NOT NULL,
  titulo text NOT NULL,
  visivel boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(perfil, modulo)
);

-- Índice para consultas rápidas por perfil
CREATE INDEX IF NOT EXISTS idx_module_visibility_perfil ON public.module_visibility(perfil);

-- RLS
ALTER TABLE public.module_visibility ENABLE ROW LEVEL SECURITY;

-- Apenas Administradores podem gerenciar a visibilidade
CREATE POLICY "Admins can manage module visibility"
  ON public.module_visibility FOR ALL
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

-- Todos os usuários autenticados podem ler (para o menu respeitar a configuração)
CREATE POLICY "Authenticated users can view module visibility"
  ON public.module_visibility FOR SELECT
  USING (
    auth.uid() IS NOT NULL
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_module_visibility_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_module_visibility_updated_at ON public.module_visibility;
CREATE TRIGGER trigger_module_visibility_updated_at
  BEFORE UPDATE ON public.module_visibility
  FOR EACH ROW EXECUTE FUNCTION public.update_module_visibility_updated_at();

-- Seed inicial: todos os módulos visíveis para todos os perfis
INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
VALUES
  ('Administrador', 'Dashboard', '/', 'Dashboard', true),
  ('Administrador', 'Leads', '/leads', 'Leads', true),
  ('Administrador', 'Central de Indicadores', '/central-de-indicadores', 'Central de Indicadores', true),
  ('Administrador', 'Clientes', '/clientes', 'Clientes', true),
  ('Administrador', 'Contatos', '/contatos', 'Contatos', true),
  ('Administrador', 'Agenda', '/agenda', 'Agenda', true),
  ('Administrador', 'WhatsApp', '/whatsapp', 'WhatsApp', true),
  ('Administrador', 'Comunicação', '/comunicacao', 'Comunicação', true),
  ('Administrador', 'Negociações', '/negociacoes', 'Negociações', true),
  ('Administrador', 'Pós-venda', '/pos-venda', 'Pós-venda', true),
  ('Administrador', 'Parceiros', '/parceiros', 'Parceiros', true),
  ('Administrador', 'Recrutamento', '/recrutamento', 'Recrutamento', true),
  ('Administrador', 'Biblioteca', '/biblioteca', 'Biblioteca', true),
  ('Administrador', 'Treinamentos', '/treinamentos', 'Treinamentos', true),
  ('Administrador', 'Materiais para Consultores', '/materiais-consultores', 'Materiais para Consultores', true),
  ('Administrador', 'Links úteis', '/links-uteis', 'Links úteis', true),
  ('Administrador', 'Relatórios', '/relatorios', 'Relatórios', true),
  ('Administrador', 'Configurações', '/configuracoes', 'Configurações', true),
  ('Gestor', 'Dashboard', '/', 'Dashboard', true),
  ('Gestor', 'Leads', '/leads', 'Leads', true),
  ('Gestor', 'Central de Indicadores', '/central-de-indicadores', 'Central de Indicadores', true),
  ('Gestor', 'Clientes', '/clientes', 'Clientes', true),
  ('Gestor', 'Contatos', '/contatos', 'Contatos', true),
  ('Gestor', 'Agenda', '/agenda', 'Agenda', true),
  ('Gestor', 'WhatsApp', '/whatsapp', 'WhatsApp', true),
  ('Gestor', 'Comunicação', '/comunicacao', 'Comunicação', true),
  ('Gestor', 'Negociações', '/negociacoes', 'Negociações', true),
  ('Gestor', 'Pós-venda', '/pos-venda', 'Pós-venda', true),
  ('Gestor', 'Parceiros', '/parceiros', 'Parceiros', true),
  ('Gestor', 'Recrutamento', '/recrutamento', 'Recrutamento', true),
  ('Gestor', 'Biblioteca', '/biblioteca', 'Biblioteca', true),
  ('Gestor', 'Treinamentos', '/treinamentos', 'Treinamentos', true),
  ('Gestor', 'Materiais para Consultores', '/materiais-consultores', 'Materiais para Consultores', true),
  ('Gestor', 'Links úteis', '/links-uteis', 'Links úteis', true),
  ('Gestor', 'Relatórios', '/relatorios', 'Relatórios', true),
  ('Gestor', 'Configurações', '/configuracoes', 'Configurações', true),
  ('Consultor', 'Dashboard', '/', 'Dashboard', true),
  ('Consultor', 'Leads', '/leads', 'Leads', true),
  ('Consultor', 'Clientes', '/clientes', 'Clientes', true),
  ('Consultor', 'Contatos', '/contatos', 'Contatos', true),
  ('Consultor', 'Agenda', '/agenda', 'Agenda', true),
  ('Consultor', 'WhatsApp', '/whatsapp', 'WhatsApp', true),
  ('Consultor', 'Comunicação', '/comunicacao', 'Comunicação', true),
  ('Consultor', 'Negociações', '/negociacoes', 'Negociações', true),
  ('Consultor', 'Pós-venda', '/pos-venda', 'Pós-venda', true),
  ('Consultor', 'Biblioteca', '/biblioteca', 'Biblioteca', true),
  ('Consultor', 'Treinamentos', '/treinamentos', 'Treinamentos', true),
  ('Consultor', 'Materiais para Consultores', '/materiais-consultores', 'Materiais para Consultores', true),
  ('Consultor', 'Links úteis', '/links-uteis', 'Links úteis', true),
  ('Consultor', 'Relatórios', '/relatorios', 'Relatórios', true),
  ('Consultor', 'Configurações', '/configuracoes', 'Configurações', true),
  ('Trainee', 'Dashboard', '/', 'Dashboard', true),
  ('Trainee', 'Leads', '/leads', 'Leads', true),
  ('Trainee', 'Clientes', '/clientes', 'Clientes', true),
  ('Trainee', 'Contatos', '/contatos', 'Contatos', true),
  ('Trainee', 'Agenda', '/agenda', 'Agenda', true),
  ('Trainee', 'Biblioteca', '/biblioteca', 'Biblioteca', true),
  ('Trainee', 'Treinamentos', '/treinamentos', 'Treinamentos', true),
  ('Trainee', 'Materiais para Consultores', '/materiais-consultores', 'Materiais para Consultores', true),
  ('Trainee', 'Links úteis', '/links-uteis', 'Links úteis', true),
  ('Secretaria', 'Dashboard', '/', 'Dashboard', true),
  ('Secretaria', 'Agenda', '/agenda', 'Agenda', true),
  ('Secretaria', 'Biblioteca', '/biblioteca', 'Biblioteca', true),
  ('Secretaria', 'Links úteis', '/links-uteis', 'Links úteis', true),
  ('Indicador', 'Dashboard', '/', 'Dashboard', true),
  ('Indicador', 'Central de Indicadores', '/central-de-indicadores', 'Central de Indicadores', true),
  ('Indicador', 'Biblioteca', '/biblioteca', 'Biblioteca', true),
  ('Indicador', 'Links úteis', '/links-uteis', 'Links úteis', true)
ON CONFLICT (perfil, modulo) DO NOTHING;

COMMIT;
