-- Migration: 20261107000010_fix_credito_investimento.sql
-- Objetivo: corrigir a migration do modulo Credito Investimento
-- Campo oficial de propriedade: marked_id (confirmado pelo codigo do repositorio)
-- Principio: apenas correcoes. Nao DROP CASCADE, Nao apagar tabelas, Nao remover colunas.

-- ============================================================
-- 1. ADICAO DA COLUNA marked_id (somente se ausente)
-- ============================================================
ALTER TABLE public.creditos_investimento
  ADD COLUMN IF NOT EXISTS marked_id uuid REFERENCES public.profiles(id);

-- ============================================================
-- 2. CORRECAO DA POLICY DE HISTORICO
-- ============================================================
-- A policy original usava cmarked_id, que nao existia na tabela.
-- Corrigido para usar c.marked_id, que e a coluna oficial de propriedade.

DROP POLICY IF EXISTS "Leio historico dos meus creditos" ON public.credito_historico;
CREATE POLICY "Leio historico dos meus creditos"
  ON public.credito_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND (
    EXISTS (SELECT 1 FROM public.creditos_investimento c WHERE c.id = credito_id AND c.marked_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.perfil IN ('Administrador', 'Gestor'))
  ));

-- ============================================================
-- 3. POLICITAS DE creditos_investimento
-- ============================================================

DROP POLICY IF EXISTS "Consultor ve seus creditos" ON public.creditos_investimento;
CREATE POLICY "Consultor ve seus creditos"
  ON public.creditos_investimento FOR SELECT
  USING (auth.role() = 'authenticated' AND (
    marked_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.perfil IN ('Administrador', 'Gestor'))
  ));

DROP POLICY IF EXISTS "Consultor cria seus creditos" ON public.creditos_investimento;
CREATE POLICY "Consultor cria seus creditos"
  ON public.creditos_investimento FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND marked_id = auth.uid());

DROP POLICY IF EXISTS "Consultor atualiza seus creditos" ON public.creditos_investimento;
CREATE POLICY "Consultor atualiza seus creditos"
  ON public.creditos_investimento FOR UPDATE
  USING (auth.role() = 'authenticated' AND marked_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND marked_id = auth.uid());

DROP POLICY IF EXISTS "Consultor exclui seus creditos" ON public.creditos_investimento;
CREATE POLICY "Consultor exclui seus creditos"
  ON public.creditos_investimento FOR DELETE
  USING (auth.role() = 'authenticated' AND marked_id = auth.uid());

-- ============================================================
-- 4. POLICITAS DE credito_tarefas
-- ============================================================

DROP POLICY IF EXISTS "Gerencio minhas tarefas" ON public.credito_tarefas;
CREATE POLICY "Gerencio minhas tarefas"
  ON public.credito_tarefas FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- ============================================================
-- 5. POLICITAS DE credito_reunioes
-- ============================================================

DROP POLICY IF EXISTS "Gerencio minhas reunioes" ON public.credito_reunioes;
CREATE POLICY "Gerencio minhas reunioes"
  ON public.credito_reunioes FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- ============================================================
-- 6. POLICITAS DE credito_mensagens_registradas
-- ============================================================

DROP POLICY IF EXISTS "Gerencio minhas mensagens" ON public.credito_mensagens_registradas;
CREATE POLICY "Gerencio minhas mensagens"
  ON public.credito_mensagens_registradas FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- ============================================================
-- 7. POLICITAS DE creditos_simulacoes
-- ============================================================

DROP POLICY IF EXISTS "Gerencio minhas simulacoes" ON public.creditos_simulacoes;
CREATE POLICY "Gerencio minhas simulacoes"
  ON public.creditos_simulacoes FOR ALL
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- ============================================================
-- 8. POLICITAS DE playbook_mensagens (leitura publica)
-- ============================================================

DROP POLICY IF EXISTS "Leio mensagens do playbook" ON public.playbook_mensagens;
CREATE POLICY "Leio mensagens do playbook"
  ON public.playbook_mensagens FOR SELECT
  USING (auth.role() = 'authenticated' AND ativo = true);

-- ============================================================
-- 9. POLICITAS DE playbooks_atendimento (leitura publica)
-- ============================================================

DROP POLICY IF EXISTS "Leio playbooks" ON public.playbooks_atendimento;
CREATE POLICY "Leio playbooks"
  ON public.playbooks_atendimento FOR SELECT
  USING (auth.role() = 'authenticated');