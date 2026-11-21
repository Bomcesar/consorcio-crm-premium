-- Migration: 20261002000009_credito_investimento_incremental
-- Objetivo: criar as tabelas do modulo Credito Investimento que nao existem no banco
-- Principio: apenas o que nao existe. Nao apagar, NAO DROP CASCADE, preservar dados.

-- ============================================================
-- 1. TIPOS E ENUMS (somente se nao existirem)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credito_etapa') THEN
    CREATE TYPE public.credito_etapa AS ENUM (
      'novo_lead', 'primeiro_contato', 'em_conversa', 'qualificado',
      'reuniao_agendada', 'apresentacao_realizada', 'proposta_enviada',
      'em_negociacao', 'venda_realizada', 'pos_venda', 'perdido', 'sem_interesse'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'playbook_segmento') THEN
    CREATE TYPE public.playbook_segmento AS ENUM ('motors', 'credito_investimento');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'msg_whatsapp_tipo') THEN
    CREATE TYPE public.msg_whatsapp_tipo AS ENUM (
      'abertura', 'quebra_padrao', 'interesse', 'qualificacao', 'educacao_financeira',
      'apresentacao_credito', 'convite_reuniao', 'confirmacao_reuniao',
      'trata_objecoes', 'envio_proposta', 'fechamento', 'reativacao'
    );
  END IF;
END $$;

-- ============================================================
-- 2. TABELAS (somente se nao existirem)
-- ============================================================

-- 2.1. playbooks_atendimento
CREATE TABLE IF NOT EXISTS public.playbooks_atendimento (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  segmento public.playbook_segmento NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- 2.2. playbook_mensagens
CREATE TABLE IF NOT EXISTS public.playbook_mensagens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id uuid NOT NULL REFERENCES public.playbooks_atendimento(id) ON DELETE CASCADE,
  etapa public.credito_etapa NOT NULL,
  tipo public.msg_whatsapp_tipo NOT NULL,
  titulo text NOT NULL,
  conteudo text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- 2.3. creditos_investimento
CREATE TABLE IF NOT EXISTS public.creditos_investimento (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid,
  cliente_id uuid,
  nome text NOT NULL,
  telefone text NOT NULL,
  origem_lead text,
  valor_desejado numeric NOT NULL DEFAULT 0,
  capacidade_mensal numeric NOT NULL DEFAULT 0,
  objetivo text,
  modelo_veiculo text,
  urgencia_aquisicao text,
  disponibilidade_lance boolean NOT NULL DEFAULT false,
  canal_comunicacao_pref text,
  objecoes_identificadas text,
  proxima_acao text,
  data_retorno timestamp with time zone,
  observacoes text,
  etapa public.credito_etapa NOT NULL DEFAULT 'novo_lead',
  probabilidade integer NOT NULL DEFAULT 0 CHECK (probabilidade >= 0 AND probabilidade <= 100),
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- 2.4. credito_historico
CREATE TABLE IF NOT EXISTS public.credito_historico (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id uuid NOT NULL REFERENCES public.creditos_investimento(id) ON DELETE CASCADE,
  etapa_anterior public.credito_etapa,
  etapa_nova public.credito_etapa NOT NULL,
  usuario_id uuid REFERENCES public.profiles(id),
  observacao text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- 2.5. credito_mensagens_registradas
CREATE TABLE IF NOT EXISTS public.credito_mensagens_registradas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id uuid NOT NULL REFERENCES public.creditos_investimento(id) ON DELETE CASCADE,
  playbook_msg_id uuid REFERENCES public.playbook_mensagens(id) ON DELETE SET NULL,
  mensagem_texto text NOT NULL,
  tipo public.msg_whatsapp_tipo,
  copiado_em timestamp with time zone DEFAULT now() NOT NULL,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id)
);

-- 2.6. credito_tarefas
CREATE TABLE IF NOT EXISTS public.credito_tarefas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id uuid NOT NULL REFERENCES public.creditos_investimento(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id),
  titulo text NOT NULL,
  observacao text,
  data_prevista timestamp with time zone NOT NULL,
  concluida boolean NOT NULL DEFAULT false,
  concluida_em timestamp with time zone,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- 2.7. credito_reunioes
CREATE TABLE IF NOT EXISTS public.credito_reunioes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id uuid NOT NULL REFERENCES public.creditos_investimento(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id),
  titulo text NOT NULL,
  data_hora timestamp with time zone NOT NULL,
  local text,
  google_meet_link text,
  confirmado boolean NOT NULL DEFAULT false,
  compareceu boolean,
  resultado text,
  observacoes text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL,
  atualizado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- 2.8. creditos_simulacoes
CREATE TABLE IF NOT EXISTS public.creditos_simulacoes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  credito_id uuid NOT NULL REFERENCES public.creditos_investimento(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id),
  valor numeric NOT NULL,
  grupo text,
  cota integer,
  prazo integer,
  taxa numeric,
  observacoes text,
  criado_em timestamp with time zone DEFAULT now() NOT NULL
);

-- ============================================================
-- 3. TRIGGERS DE atualizado_em
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_playbooks_atendimento_updated ON public.playbooks_atendimento;
CREATE TRIGGER trg_playbooks_atendimento_updated BEFORE UPDATE ON public.playbooks_atendimento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_playbook_mensagens_updated ON public.playbook_mensagens;
CREATE TRIGGER trg_playbook_mensagens_updated BEFORE UPDATE ON public.playbook_mensagens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_creditos_investimento_updated ON public.creditos_investimento;
CREATE TRIGGER trg_creditos_investimento_updated BEFORE UPDATE ON public.creditos_investimento
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_credito_tarefas_updated ON public.credito_tarefas;
CREATE TRIGGER trg_credito_tarefas_updated BEFORE UPDATE ON public.credito_tarefas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_credito_reunioes_updated ON public.credito_reunioes;
CREATE TRIGGER trg_credito_reunioes_updated BEFORE UPDATE ON public.credito_reunioes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================

-- creditos_investimento
ALTER TABLE public.creditos_investimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consultor ve seus creditos" ON public.creditos_investimento;
CREATE POLICY "Consultor ve seus creditos"
  ON public.creditos_investimento FOR SELECT
  USING (auth.role() = 'authenticated' AND (
    usuario_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.perfil IN ('Administrador', 'Gestor'))
  ));

DROP POLICY IF EXISTS "Consultor cria seus creditos" ON public.creditos_investimento;
CREATE POLICY "Consultor cria seus creditos"
  ON public.creditos_investimento FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

DROP POLICY IF EXISTS "Consultor atualiza seus creditos" ON public.creditos_investimento;
CREATE POLICY "Consultor atualiza seus creditos"
  ON public.creditos_investimento FOR UPDATE
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- credito_historico
ALTER TABLE public.credito_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leio historico dos meus creditos" ON public.credito_historico;
CREATE POLICY "Leio historico dos meus creditos"
  ON public.credito_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.creditos_investimento c WHERE c.id = credito_id AND c.usuario_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.perfil IN ('Administrador', 'Gestor'))
  ));

-- credito_tarefas
ALTER TABLE public.credito_tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerencio minhas tarefas" ON public.credito_tarefas;
CREATE POLICY "Gerencio minhas tarefas"
  ON public.credito_tarefas FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- credito_reunioes
ALTER TABLE public.credito_reunioes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerencio minhas reunioes" ON public.credito_reunioes;
CREATE POLICY "Gerencio minhas reunioes"
  ON public.credito_reunioes FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- credito_mensagens_registradas
ALTER TABLE public.credito_mensagens_registradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerencio minhas mensagens" ON public.credito_mensagens_registradas;
CREATE POLICY "Gerencio minhas mensagens"
  ON public.credito_mensagens_registradas FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- creditos_simulacoes
ALTER TABLE public.creditos_simulacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gerencio minhas simulacoes" ON public.creditos_simulacoes;
CREATE POLICY "Gerencio minhas simulacoes"
  ON public.creditos_simulacoes FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- playbook_mensagens (leitura publica para consultores)
ALTER TABLE public.playbook_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leio mensagens do playbook" ON public.playbook_mensagens;
CREATE POLICY "Leio mensagens do playbook"
  ON public.playbook_mensagens FOR SELECT
  USING (auth.role() = 'authenticated' AND ativo = true);

-- playbooks_atendimento (leitura publica)
ALTER TABLE public.playbooks_atendimento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leio playbooks" ON public.playbooks_atendimento;
CREATE POLICY "Leio playbooks"
  ON public.playbooks_atendimento FOR SELECT
  USING (auth.role() = 'authenticated');