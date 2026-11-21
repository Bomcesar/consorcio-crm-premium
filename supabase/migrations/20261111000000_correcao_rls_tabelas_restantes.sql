-- Migration: 20261111000000_correcao_rls_tabelas_restantes.sql
-- Objetivo: Corrigir políticas RLS de todas as tabelas que ainda possuem
--           regras permissivas ou ausentes após a migration 20261110000000.
-- Princípios:
--   - Não alterar migrations históricas.
--   - Não utilizar DROP CASCADE.
--   - Não excluir tabelas, colunas ou registros existentes.
--   - Ser idempotente: verificar estado antes de alterar.
--   - Não aplicar no Supabase remoto nesta etapa.
--   - Não utilizar marked_id (coluna inexistente).
--   - Substituir public.is_admin() por public.is_admin_safe() onde usado.

BEGIN;

-- ============================================================
-- 0. REMOVER POLÍCIAS PERMISSIVAS PERIGOSAS DE MIGRAÇÕES ANTIGAS
-- ============================================================

-- profiles: política de 20260910000002 permite ANY authenticated ver TODOS os perfis
DROP POLICY IF EXISTS "Authenticated users can view basic profiles for identification" ON public.profiles;

-- usuario_status: política de 20260910000001 permite ANY authenticated ver TODOS os status
DROP POLICY IF EXISTS "Authenticated users can view status" ON public.usuario_status;

-- propostas: política pública perigosa - qualquer um (mesmo não autenticado) vê todas
DROP POLICY IF EXISTS "Public can view proposals by token" ON public.propostas;

-- proposta_eventos: insert público perigoso
DROP POLICY IF EXISTS "Public can insert proposal events" ON public.proposta_eventos;

-- ============================================================
-- 1. TABELAS COM usuario_id - POLÍCIAS PROPRIETÁRIO + GESTOR + ADMIN
-- ============================================================
-- Estas tabelas seguem o mesmo padrão da migration 20261110000000:
--   SELECT: proprietário OR gestor da equipe OR admin
--   INSERT: proprietário para si, ou admin para terceiro
--   UPDATE/DELETE: proprietário OR gestor da equipe OR admin

DO $$
BEGIN
  -- Contatos Indicados
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contatos_indicados') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their indicated contacts" ON public.contatos_indicados;
    DROP POLICY IF EXISTS "Authenticated users can insert their indicated contacts" ON public.contatos_indicados;
    DROP POLICY IF EXISTS "Authenticated users can update their indicated contacts" ON public.contatos_indicados;
    DROP POLICY IF EXISTS "Authenticated users can delete their indicated contacts" ON public.contatos_indicados;

    CREATE POLICY "ContatosIndicados: usuario pode ver seus proprios registros"
      ON public.contatos_indicados FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: gestor ve registros da equipe"
      ON public.contatos_indicados FOR SELECT
      USING (public.is_gestor_da_equipe(contatos_indicados.usuario_id));
    CREATE POLICY "ContatosIndicados: admin ve todos"
      ON public.contatos_indicados FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ContatosIndicados: usuario pode inserir para si"
      ON public.contatos_indicados FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: admin pode inserir para terceiro"
      ON public.contatos_indicados FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = contatos_indicados.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ContatosIndicados: usuario pode atualizar seus proprios registros"
      ON public.contatos_indicados FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: gestor atualiza registros da equipe"
      ON public.contatos_indicados FOR UPDATE
      USING (public.is_gestor_da_equipe(contatos_indicados.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(contatos_indicados.usuario_id));
    CREATE POLICY "ContatosIndicados: admin atualiza qualquer registro"
      ON public.contatos_indicados FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ContatosIndicados: usuario pode excluir seus proprios registros"
      ON public.contatos_indicados FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContatosIndicados: gestor exclui registros da equipe"
      ON public.contatos_indicados FOR DELETE
      USING (public.is_gestor_da_equipe(contatos_indicados.usuario_id));
    CREATE POLICY "ContatosIndicados: admin exclui qualquer registro"
      ON public.contatos_indicados FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Cliente Contatos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cliente_contatos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their client contacts" ON public.cliente_contatos;
    DROP POLICY IF EXISTS "Authenticated users can insert their client contacts" ON public.cliente_contatos;
    DROP POLICY IF EXISTS "Authenticated users can update their client contacts" ON public.cliente_contatos;
    DROP POLICY IF EXISTS "Authenticated users can delete their client contacts" ON public.cliente_contatos;

    CREATE POLICY "ClienteContatos: usuario pode ver seus proprios registros"
      ON public.cliente_contatos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: gestor ve registros da equipe"
      ON public.cliente_contatos FOR SELECT
      USING (public.is_gestor_da_equipe(cliente_contatos.usuario_id));
    CREATE POLICY "ClienteContatos: admin ve todos"
      ON public.cliente_contatos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ClienteContatos: usuario pode inserir para si"
      ON public.cliente_contatos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: admin pode inserir para terceiro"
      ON public.cliente_contatos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cliente_contatos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ClienteContatos: usuario pode atualizar seus proprios registros"
      ON public.cliente_contatos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: gestor atualiza registros da equipe"
      ON public.cliente_contatos FOR UPDATE
      USING (public.is_gestor_da_equipe(cliente_contatos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(cliente_contatos.usuario_id));
    CREATE POLICY "ClienteContatos: admin atualiza qualquer registro"
      ON public.cliente_contatos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ClienteContatos: usuario pode excluir seus proprios registros"
      ON public.cliente_contatos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteContatos: gestor exclui registros da equipe"
      ON public.cliente_contatos FOR DELETE
      USING (public.is_gestor_da_equipe(cliente_contatos.usuario_id));
    CREATE POLICY "ClienteContatos: admin exclui qualquer registro"
      ON public.cliente_contatos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Cliente Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cliente_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their client history" ON public.cliente_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their client history" ON public.cliente_historico;

    CREATE POLICY "ClienteHistorico: usuario pode ver seus proprios registros"
      ON public.cliente_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: gestor ve registros da equipe"
      ON public.cliente_historico FOR SELECT
      USING (public.is_gestor_da_equipe(cliente_historico.usuario_id));
    CREATE POLICY "ClienteHistorico: admin ve todos"
      ON public.cliente_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ClienteHistorico: usuario pode inserir para si"
      ON public.cliente_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: admin pode inserir para terceiro"
      ON public.cliente_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cliente_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ClienteHistorico: usuario pode atualizar seus proprios registros"
      ON public.cliente_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: gestor atualiza registros da equipe"
      ON public.cliente_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(cliente_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(cliente_historico.usuario_id));
    CREATE POLICY "ClienteHistorico: admin atualiza qualquer registro"
      ON public.cliente_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ClienteHistorico: usuario pode excluir seus proprios registros"
      ON public.cliente_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ClienteHistorico: gestor exclui registros da equipe"
      ON public.cliente_historico FOR DELETE
      USING (public.is_gestor_da_equipe(cliente_historico.usuario_id));
    CREATE POLICY "ClienteHistorico: admin exclui qualquer registro"
      ON public.cliente_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Negociacao Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='negociacao_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their negotiation history" ON public.negociacao_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their negotiation history" ON public.negociacao_historico;

    CREATE POLICY "NegociacaoHistorico: usuario pode ver seus proprios registros"
      ON public.negociacao_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: gestor ve registros da equipe"
      ON public.negociacao_historico FOR SELECT
      USING (public.is_gestor_da_equipe(negociacao_historico.usuario_id));
    CREATE POLICY "NegociacaoHistorico: admin ve todos"
      ON public.negociacao_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "NegociacaoHistorico: usuario pode inserir para si"
      ON public.negociacao_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: admin pode inserir para terceiro"
      ON public.negociacao_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = negociacao_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "NegociacaoHistorico: usuario pode atualizar seus proprios registros"
      ON public.negociacao_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: gestor atualiza registros da equipe"
      ON public.negociacao_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(negociacao_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(negociacao_historico.usuario_id));
    CREATE POLICY "NegociacaoHistorico: admin atualiza qualquer registro"
      ON public.negociacao_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "NegociacaoHistorico: usuario pode excluir seus proprios registros"
      ON public.negociacao_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "NegociacaoHistorico: gestor exclui registros da equipe"
      ON public.negociacao_historico FOR DELETE
      USING (public.is_gestor_da_equipe(negociacao_historico.usuario_id));
    CREATE POLICY "NegociacaoHistorico: admin exclui qualquer registro"
      ON public.negociacao_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Anexos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='anexos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their anexos" ON public.anexos;
    DROP POLICY IF EXISTS "Authenticated users can insert their anexos" ON public.anexos;
    DROP POLICY IF EXISTS "Authenticated users can update their anexos" ON public.anexos;
    DROP POLICY IF EXISTS "Authenticated users can delete their anexos" ON public.anexos;

    CREATE POLICY "Anexos: usuario pode ver seus proprios registros"
      ON public.anexos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: gestor ve registros da equipe"
      ON public.anexos FOR SELECT
      USING (public.is_gestor_da_equipe(anexos.usuario_id));
    CREATE POLICY "Anexos: admin ve todos"
      ON public.anexos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Anexos: usuario pode inserir para si"
      ON public.anexos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: admin pode inserir para terceiro"
      ON public.anexos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = anexos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Anexos: usuario pode atualizar seus proprios registros"
      ON public.anexos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: gestor atualiza registros da equipe"
      ON public.anexos FOR UPDATE
      USING (public.is_gestor_da_equipe(anexos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(anexos.usuario_id));
    CREATE POLICY "Anexos: admin atualiza qualquer registro"
      ON public.anexos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Anexos: usuario pode excluir seus proprios registros"
      ON public.anexos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Anexos: gestor exclui registros da equipe"
      ON public.anexos FOR DELETE
      USING (public.is_gestor_da_equipe(anexos.usuario_id));
    CREATE POLICY "Anexos: admin exclui qualquer registro"
      ON public.anexos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Whatsapp Mensagens
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='whatsapp_mensagens') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their whatsapp messages" ON public.whatsapp_mensagens;
    DROP POLICY IF EXISTS "Authenticated users can insert their whatsapp messages" ON public.whatsapp_mensagens;
    DROP POLICY IF EXISTS "Authenticated users can update their whatsapp messages" ON public.whatsapp_mensagens;
    DROP POLICY IF EXISTS "Authenticated users can delete their whatsapp messages" ON public.whatsapp_mensagens;

    CREATE POLICY "WhatsappMensagens: usuario pode ver seus proprios registros"
      ON public.whatsapp_mensagens FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: gestor ve registros da equipe"
      ON public.whatsapp_mensagens FOR SELECT
      USING (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id));
    CREATE POLICY "WhatsappMensagens: admin ve todos"
      ON public.whatsapp_mensagens FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "WhatsappMensagens: usuario pode inserir para si"
      ON public.whatsapp_mensagens FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: admin pode inserir para terceiro"
      ON public.whatsapp_mensagens FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = whatsapp_mensagens.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "WhatsappMensagens: usuario pode atualizar seus proprios registros"
      ON public.whatsapp_mensagens FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: gestor atualiza registros da equipe"
      ON public.whatsapp_mensagens FOR UPDATE
      USING (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id));
    CREATE POLICY "WhatsappMensagens: admin atualiza qualquer registro"
      ON public.whatsapp_mensagens FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "WhatsappMensagens: usuario pode excluir seus proprios registros"
      ON public.whatsapp_mensagens FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "WhatsappMensagens: gestor exclui registros da equipe"
      ON public.whatsapp_mensagens FOR DELETE
      USING (public.is_gestor_da_equipe(whatsapp_mensagens.usuario_id));
    CREATE POLICY "WhatsappMensagens: admin exclui qualquer registro"
      ON public.whatsapp_mensagens FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Assembleias
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assembleias') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their assembleias" ON public.assembleias;
    DROP POLICY IF EXISTS "Authenticated users can insert their assembleias" ON public.assembleias;
    DROP POLICY IF EXISTS "Authenticated users can update their assembleias" ON public.assembleias;
    DROP POLICY IF EXISTS "Authenticated users can delete their assembleias" ON public.assembleias;

    CREATE POLICY "Assembleias: usuario pode ver seus proprios registros"
      ON public.assembleias FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: gestor ve registros da equipe"
      ON public.assembleias FOR SELECT
      USING (public.is_gestor_da_equipe(assembleias.usuario_id));
    CREATE POLICY "Assembleias: admin ve todos"
      ON public.assembleias FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Assembleias: usuario pode inserir para si"
      ON public.assembleias FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: admin pode inserir para terceiro"
      ON public.assembleias FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assembleias.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Assembleias: usuario pode atualizar seus proprios registros"
      ON public.assembleias FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: gestor atualiza registros da equipe"
      ON public.assembleias FOR UPDATE
      USING (public.is_gestor_da_equipe(assembleias.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(assembleias.usuario_id));
    CREATE POLICY "Assembleias: admin atualiza qualquer registro"
      ON public.assembleias FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Assembleias: usuario pode excluir seus proprios registros"
      ON public.assembleias FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Assembleias: gestor exclui registros da equipe"
      ON public.assembleias FOR DELETE
      USING (public.is_gestor_da_equipe(assembleias.usuario_id));
    CREATE POLICY "Assembleias: admin exclui qualquer registro"
      ON public.assembleias FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Assembleia Avisos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assembleia_avisos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their assembleia avisos" ON public.assembleia_avisos;
    DROP POLICY IF EXISTS "Authenticated users can insert their assembleia avisos" ON public.assembleia_avisos;
    DROP POLICY IF EXISTS "Authenticated users can update their assembleia avisos" ON public.assembleia_avisos;
    DROP POLICY IF EXISTS "Authenticated users can delete their assembleia avisos" ON public.assembleia_avisos;

    CREATE POLICY "AssembleiaAvisos: usuario pode ver seus proprios registros"
      ON public.assembleia_avisos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: gestor ve registros da equipe"
      ON public.assembleia_avisos FOR SELECT
      USING (public.is_gestor_da_equipe(assembleia_avisos.usuario_id));
    CREATE POLICY "AssembleiaAvisos: admin ve todos"
      ON public.assembleia_avisos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AssembleiaAvisos: usuario pode inserir para si"
      ON public.assembleia_avisos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: admin pode inserir para terceiro"
      ON public.assembleia_avisos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assembleia_avisos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AssembleiaAvisos: usuario pode atualizar seus proprios registros"
      ON public.assembleia_avisos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: gestor atualiza registros da equipe"
      ON public.assembleia_avisos FOR UPDATE
      USING (public.is_gestor_da_equipe(assembleia_avisos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(assembleia_avisos.usuario_id));
    CREATE POLICY "AssembleiaAvisos: admin atualiza qualquer registro"
      ON public.assembleia_avisos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AssembleiaAvisos: usuario pode excluir seus proprios registros"
      ON public.assembleia_avisos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaAvisos: gestor exclui registros da equipe"
      ON public.assembleia_avisos FOR DELETE
      USING (public.is_gestor_da_equipe(assembleia_avisos.usuario_id));
    CREATE POLICY "AssembleiaAvisos: admin exclui qualquer registro"
      ON public.assembleia_avisos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Assembleia Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='assembleia_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their assembleia historico" ON public.assembleia_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their assembleia historico" ON public.assembleia_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their assembleia historico" ON public.assembleia_historico;

    CREATE POLICY "AssembleiaHistorico: usuario pode ver seus proprios registros"
      ON public.assembleia_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: gestor ve registros da equipe"
      ON public.assembleia_historico FOR SELECT
      USING (public.is_gestor_da_equipe(assembleia_historico.usuario_id));
    CREATE POLICY "AssembleiaHistorico: admin ve todos"
      ON public.assembleia_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AssembleiaHistorico: usuario pode inserir para si"
      ON public.assembleia_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: admin pode inserir para terceiro"
      ON public.assembleia_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = assembleia_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AssembleiaHistorico: usuario pode atualizar seus proprios registros"
      ON public.assembleia_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: gestor atualiza registros da equipe"
      ON public.assembleia_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(assembleia_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(assembleia_historico.usuario_id));
    CREATE POLICY "AssembleiaHistorico: admin atualiza qualquer registro"
      ON public.assembleia_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AssembleiaHistorico: usuario pode excluir seus proprios registros"
      ON public.assembleia_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AssembleiaHistorico: gestor exclui registros da equipe"
      ON public.assembleia_historico FOR DELETE
      USING (public.is_gestor_da_equipe(assembleia_historico.usuario_id));
    CREATE POLICY "AssembleiaHistorico: admin exclui qualquer registro"
      ON public.assembleia_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Loteria Federal
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='loteria_federal') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their loteria_federal" ON public.loteria_federal;
    DROP POLICY IF EXISTS "Authenticated users can insert their loteria_federal" ON public.loteria_federal;
    DROP POLICY IF EXISTS "Authenticated users can update their loteria_federal" ON public.loteria_federal;
    DROP POLICY IF EXISTS "Authenticated users can delete their loteria_federal" ON public.loteria_federal;

    CREATE POLICY "LoteriaFederal: usuario pode ver seus proprios registros"
      ON public.loteria_federal FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: gestor ve registros da equipe"
      ON public.loteria_federal FOR SELECT
      USING (public.is_gestor_da_equipe(loteria_federal.usuario_id));
    CREATE POLICY "LoteriaFederal: admin ve todos"
      ON public.loteria_federal FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LoteriaFederal: usuario pode inserir para si"
      ON public.loteria_federal FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: admin pode inserir para terceiro"
      ON public.loteria_federal FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = loteria_federal.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LoteriaFederal: usuario pode atualizar seus proprios registros"
      ON public.loteria_federal FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: gestor atualiza registros da equipe"
      ON public.loteria_federal FOR UPDATE
      USING (public.is_gestor_da_equipe(loteria_federal.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(loteria_federal.usuario_id));
    CREATE POLICY "LoteriaFederal: admin atualiza qualquer registro"
      ON public.loteria_federal FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LoteriaFederal: usuario pode excluir seus proprios registros"
      ON public.loteria_federal FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LoteriaFederal: gestor exclui registros da equipe"
      ON public.loteria_federal FOR DELETE
      USING (public.is_gestor_da_equipe(loteria_federal.usuario_id));
    CREATE POLICY "LoteriaFederal: admin exclui qualquer registro"
      ON public.loteria_federal FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Lances
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lances') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their lances" ON public.lances;
    DROP POLICY IF EXISTS "Authenticated users can insert their lances" ON public.lances;
    DROP POLICY IF EXISTS "Authenticated users can update their lances" ON public.lances;
    DROP POLICY IF EXISTS "Authenticated users can delete their lances" ON public.lances;

    CREATE POLICY "Lances: usuario pode ver seus proprios registros"
      ON public.lances FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Lances: gestor ve registros da equipe"
      ON public.lances FOR SELECT
      USING (public.is_gestor_da_equipe(lances.usuario_id));
    CREATE POLICY "Lances: admin ve todos"
      ON public.lances FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Lances: usuario pode inserir para si"
      ON public.lances FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Lances: admin pode inserir para terceiro"
      ON public.lances FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = lances.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Lances: usuario pode atualizar seus proprios registros"
      ON public.lances FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Lances: gestor atualiza registros da equipe"
      ON public.lances FOR UPDATE
      USING (public.is_gestor_da_equipe(lances.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(lances.usuario_id));
    CREATE POLICY "Lances: admin atualiza qualquer registro"
      ON public.lances FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Lances: usuario pode excluir seus proprios registros"
      ON public.lances FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Lances: gestor exclui registros da equipe"
      ON public.lances FOR DELETE
      USING (public.is_gestor_da_equipe(lances.usuario_id));
    CREATE POLICY "Lances: admin exclui qualquer registro"
      ON public.lances FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Contemplacoes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contemplacoes') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their contemplacoes" ON public.contemplacoes;
    DROP POLICY IF EXISTS "Authenticated users can insert their contemplacoes" ON public.contemplacoes;
    DROP POLICY IF EXISTS "Authenticated users can update their contemplacoes" ON public.contemplacoes;
    DROP POLICY IF EXISTS "Authenticated users can delete their contemplacoes" ON public.contemplacoes;

    CREATE POLICY "Contemplacoes: usuario pode ver seus proprios registros"
      ON public.contemplacoes FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: gestor ve registros da equipe"
      ON public.contemplacoes FOR SELECT
      USING (public.is_gestor_da_equipe(contemplacoes.usuario_id));
    CREATE POLICY "Contemplacoes: admin ve todos"
      ON public.contemplacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Contemplacoes: usuario pode inserir para si"
      ON public.contemplacoes FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: admin pode inserir para terceiro"
      ON public.contemplacoes FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = contemplacoes.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Contemplacoes: usuario pode atualizar seus proprios registros"
      ON public.contemplacoes FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: gestor atualiza registros da equipe"
      ON public.contemplacoes FOR UPDATE
      USING (public.is_gestor_da_equipe(contemplacoes.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(contemplacoes.usuario_id));
    CREATE POLICY "Contemplacoes: admin atualiza qualquer registro"
      ON public.contemplacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Contemplacoes: usuario pode excluir seus proprios registros"
      ON public.contemplacoes FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Contemplacoes: gestor exclui registros da equipe"
      ON public.contemplacoes FOR DELETE
      USING (public.is_gestor_da_equipe(contemplacoes.usuario_id));
    CREATE POLICY "Contemplacoes: admin exclui qualquer registro"
      ON public.contemplacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Contemplacao Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='contemplacao_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their contemplacao historico" ON public.contemplacao_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their contemplacao historico" ON public.contemplacao_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their contemplacao historico" ON public.contemplacao_historico;

    CREATE POLICY "ContemplacaoHistorico: usuario pode ver seus proprios registros"
      ON public.contemplacao_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: gestor ve registros da equipe"
      ON public.contemplacao_historico FOR SELECT
      USING (public.is_gestor_da_equipe(contemplacao_historico.usuario_id));
    CREATE POLICY "ContemplacaoHistorico: admin ve todos"
      ON public.contemplacao_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ContemplacaoHistorico: usuario pode inserir para si"
      ON public.contemplacao_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: admin pode inserir para terceiro"
      ON public.contemplacao_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = contemplacao_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ContemplacaoHistorico: usuario pode atualizar seus proprios registros"
      ON public.contemplacao_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: gestor atualiza registros da equipe"
      ON public.contemplacao_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(contemplacao_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(contemplacao_historico.usuario_id));
    CREATE POLICY "ContemplacaoHistorico: admin atualiza qualquer registro"
      ON public.contemplacao_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ContemplacaoHistorico: usuario pode excluir seus proprios registros"
      ON public.contemplacao_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ContemplacaoHistorico: gestor exclui registros da equipe"
      ON public.contemplacao_historico FOR DELETE
      USING (public.is_gestor_da_equipe(contemplacao_historico.usuario_id));
    CREATE POLICY "ContemplacaoHistorico: admin exclui qualquer registro"
      ON public.contemplacao_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Materiais Consultores
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='materiais_consultores') THEN
    DROP POLICY IF EXISTS "Authenticated users can view active materiais_consultores" ON public.materiais_consultores;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert materiais_consultores" ON public.materiais_consultores;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their materiais_consultores" ON public.materiais_consultores;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their materiais_consultores" ON public.materiais_consultores;

    CREATE POLICY "MateriaisConsultores: usuario pode ver seus proprios registros"
      ON public.materiais_consultores FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: gestor ve registros da equipe"
      ON public.materiais_consultores FOR SELECT
      USING (public.is_gestor_da_equipe(materiais_consultores.usuario_id));
    CREATE POLICY "MateriaisConsultores: admin ve todos"
      ON public.materiais_consultores FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "MateriaisConsultores: usuario pode inserir para si"
      ON public.materiais_consultores FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: admin pode inserir para terceiro"
      ON public.materiais_consultores FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = materiais_consultores.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "MateriaisConsultores: usuario pode atualizar seus proprios registros"
      ON public.materiais_consultores FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: gestor atualiza registros da equipe"
      ON public.materiais_consultores FOR UPDATE
      USING (public.is_gestor_da_equipe(materiais_consultores.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(materiais_consultores.usuario_id));
    CREATE POLICY "MateriaisConsultores: admin atualiza qualquer registro"
      ON public.materiais_consultores FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "MateriaisConsultores: usuario pode excluir seus proprios registros"
      ON public.materiais_consultores FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "MateriaisConsultores: gestor exclui registros da equipe"
      ON public.materiais_consultores FOR DELETE
      USING (public.is_gestor_da_equipe(materiais_consultores.usuario_id));
    CREATE POLICY "MateriaisConsultores: admin exclui qualquer registro"
      ON public.materiais_consultores FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Treinamentos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='treinamentos') THEN
    DROP POLICY IF EXISTS "Authenticated users can view active treinamentos" ON public.treinamentos;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert treinamentos" ON public.treinamentos;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their treinamentos" ON public.treinamentos;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their treinamentos" ON public.treinamentos;

    CREATE POLICY "Treinamentos: usuario pode ver seus proprios registros"
      ON public.treinamentos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: gestor ve registros da equipe"
      ON public.treinamentos FOR SELECT
      USING (public.is_gestor_da_equipe(treinamentos.usuario_id));
    CREATE POLICY "Treinamentos: admin ve todos"
      ON public.treinamentos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Treinamentos: usuario pode inserir para si"
      ON public.treinamentos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: admin pode inserir para terceiro"
      ON public.treinamentos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = treinamentos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Treinamentos: usuario pode atualizar seus proprios registros"
      ON public.treinamentos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: gestor atualiza registros da equipe"
      ON public.treinamentos FOR UPDATE
      USING (public.is_gestor_da_equipe(treinamentos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(treinamentos.usuario_id));
    CREATE POLICY "Treinamentos: admin atualiza qualquer registro"
      ON public.treinamentos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Treinamentos: usuario pode excluir seus proprios registros"
      ON public.treinamentos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Treinamentos: gestor exclui registros da equipe"
      ON public.treinamentos FOR DELETE
      USING (public.is_gestor_da_equipe(treinamentos.usuario_id));
    CREATE POLICY "Treinamentos: admin exclui qualquer registro"
      ON public.treinamentos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Links Uteis
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='links_uteis') THEN
    DROP POLICY IF EXISTS "Authenticated users can view active links_uteis" ON public.links_uteis;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can insert links_uteis" ON public.links_uteis;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can update their links_uteis" ON public.links_uteis;
    DROP POLICY IF EXISTS "Authenticated users with admin/gestor can delete their links_uteis" ON public.links_uteis;

    CREATE POLICY "LinksUteis: usuario pode ver seus proprios registros"
      ON public.links_uteis FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: gestor ve registros da equipe"
      ON public.links_uteis FOR SELECT
      USING (public.is_gestor_da_equipe(links_uteis.usuario_id));
    CREATE POLICY "LinksUteis: admin ve todos"
      ON public.links_uteis FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LinksUteis: usuario pode inserir para si"
      ON public.links_uteis FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: admin pode inserir para terceiro"
      ON public.links_uteis FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = links_uteis.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LinksUteis: usuario pode atualizar seus proprios registros"
      ON public.links_uteis FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: gestor atualiza registros da equipe"
      ON public.links_uteis FOR UPDATE
      USING (public.is_gestor_da_equipe(links_uteis.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(links_uteis.usuario_id));
    CREATE POLICY "LinksUteis: admin atualiza qualquer registro"
      ON public.links_uteis FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LinksUteis: usuario pode excluir seus proprios registros"
      ON public.links_uteis FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LinksUteis: gestor exclui registros da equipe"
      ON public.links_uteis FOR DELETE
      USING (public.is_gestor_da_equipe(links_uteis.usuario_id));
    CREATE POLICY "LinksUteis: admin exclui qualquer registro"
      ON public.links_uteis FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Comunicacoes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comunicacoes') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their comunicacoes" ON public.comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can insert their comunicacoes" ON public.comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can update their comunicacoes" ON public.comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can delete their comunicacoes" ON public.comunicacoes;

    CREATE POLICY "Comunicacoes: usuario pode ver seus proprios registros"
      ON public.comunicacoes FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: gestor ve registros da equipe"
      ON public.comunicacoes FOR SELECT
      USING (public.is_gestor_da_equipe(comunicacoes.usuario_id));
    CREATE POLICY "Comunicacoes: admin ve todos"
      ON public.comunicacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Comunicacoes: usuario pode inserir para si"
      ON public.comunicacoes FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: admin pode inserir para terceiro"
      ON public.comunicacoes FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = comunicacoes.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Comunicacoes: usuario pode atualizar seus proprios registros"
      ON public.comunicacoes FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: gestor atualiza registros da equipe"
      ON public.comunicacoes FOR UPDATE
      USING (public.is_gestor_da_equipe(comunicacoes.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(comunicacoes.usuario_id));
    CREATE POLICY "Comunicacoes: admin atualiza qualquer registro"
      ON public.comunicacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Comunicacoes: usuario pode excluir seus proprios registros"
      ON public.comunicacoes FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Comunicacoes: gestor exclui registros da equipe"
      ON public.comunicacoes FOR DELETE
      USING (public.is_gestor_da_equipe(comunicacoes.usuario_id));
    CREATE POLICY "Comunicacoes: admin exclui qualquer registro"
      ON public.comunicacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Comunicacao Templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='comunicacao_templates') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their comunicacao templates" ON public.comunicacao_templates;
    DROP POLICY IF EXISTS "Authenticated users can insert their comunicacao templates" ON public.comunicacao_templates;
    DROP POLICY IF EXISTS "Authenticated users can update their comunicacao templates" ON public.comunicacao_templates;
    DROP POLICY IF EXISTS "Authenticated users can delete their comunicacao templates" ON public.comunicacao_templates;

    CREATE POLICY "ComunicacaoTemplates: usuario pode ver seus proprios registros"
      ON public.comunicacao_templates FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: gestor ve registros da equipe"
      ON public.comunicacao_templates FOR SELECT
      USING (public.is_gestor_da_equipe(comunicacao_templates.usuario_id));
    CREATE POLICY "ComunicacaoTemplates: admin ve todos"
      ON public.comunicacao_templates FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ComunicacaoTemplates: usuario pode inserir para si"
      ON public.comunicacao_templates FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: admin pode inserir para terceiro"
      ON public.comunicacao_templates FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = comunicacao_templates.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ComunicacaoTemplates: usuario pode atualizar seus proprios registros"
      ON public.comunicacao_templates FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: gestor atualiza registros da equipe"
      ON public.comunicacao_templates FOR UPDATE
      USING (public.is_gestor_da_equipe(comunicacao_templates.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(comunicacao_templates.usuario_id));
    CREATE POLICY "ComunicacaoTemplates: admin atualiza qualquer registro"
      ON public.comunicacao_templates FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ComunicacaoTemplates: usuario pode excluir seus proprios registros"
      ON public.comunicacao_templates FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ComunicacaoTemplates: gestor exclui registros da equipe"
      ON public.comunicacao_templates FOR DELETE
      USING (public.is_gestor_da_equipe(comunicacao_templates.usuario_id));
    CREATE POLICY "ComunicacaoTemplates: admin exclui qualquer registro"
      ON public.comunicacao_templates FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Indicador Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='indicador_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view indicator history" ON public.indicador_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert indicator history" ON public.indicador_historico;

    CREATE POLICY "IndicadorHistorico: usuario pode ver seus proprios registros"
      ON public.indicador_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: gestor ve registros da equipe"
      ON public.indicador_historico FOR SELECT
      USING (public.is_gestor_da_equipe(indicador_historico.usuario_id));
    CREATE POLICY "IndicadorHistorico: admin ve todos"
      ON public.indicador_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "IndicadorHistorico: usuario pode inserir para si"
      ON public.indicador_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: admin pode inserir para terceiro"
      ON public.indicador_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = indicador_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "IndicadorHistorico: usuario pode atualizar seus proprios registros"
      ON public.indicador_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: gestor atualiza registros da equipe"
      ON public.indicador_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(indicador_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(indicador_historico.usuario_id));
    CREATE POLICY "IndicadorHistorico: admin atualiza qualquer registro"
      ON public.indicador_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "IndicadorHistorico: usuario pode excluir seus proprios registros"
      ON public.indicador_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "IndicadorHistorico: gestor exclui registros da equipe"
      ON public.indicador_historico FOR DELETE
      USING (public.is_gestor_da_equipe(indicador_historico.usuario_id));
    CREATE POLICY "IndicadorHistorico: admin exclui qualquer registro"
      ON public.indicador_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Cobranca Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cobranca_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their cobranca historico" ON public.cobranca_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their cobranca historico" ON public.cobranca_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their cobranca historico" ON public.cobranca_historico;

    CREATE POLICY "CobrancaHistorico: usuario pode ver seus proprios registros"
      ON public.cobranca_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: gestor ve registros da equipe"
      ON public.cobranca_historico FOR SELECT
      USING (public.is_gestor_da_equipe(cobranca_historico.usuario_id));
    CREATE POLICY "CobrancaHistorico: admin ve todos"
      ON public.cobranca_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CobrancaHistorico: usuario pode inserir para si"
      ON public.cobranca_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: admin pode inserir para terceiro"
      ON public.cobranca_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cobranca_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "CobrancaHistorico: usuario pode atualizar seus proprios registros"
      ON public.cobranca_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: gestor atualiza registros da equipe"
      ON public.cobranca_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(cobranca_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(cobranca_historico.usuario_id));
    CREATE POLICY "CobrancaHistorico: admin atualiza qualquer registro"
      ON public.cobranca_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CobrancaHistorico: usuario pode excluir seus proprios registros"
      ON public.cobranca_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CobrancaHistorico: gestor exclui registros da equipe"
      ON public.cobranca_historico FOR DELETE
      USING (public.is_gestor_da_equipe(cobranca_historico.usuario_id));
    CREATE POLICY "CobrancaHistorico: admin exclui qualquer registro"
      ON public.cobranca_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Lead Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_historico') THEN
    DROP POLICY IF EXISTS "Allow authenticated users to view lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Allow authenticated users to insert lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can view their lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can update their lead historico" ON public.lead_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their lead historico" ON public.lead_historico;

    CREATE POLICY "LeadHistorico: usuario pode ver seus proprios registros"
      ON public.lead_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: gestor ve registros da equipe"
      ON public.lead_historico FOR SELECT
      USING (public.is_gestor_da_equipe(lead_historico.usuario_id));
    CREATE POLICY "LeadHistorico: admin ve todos"
      ON public.lead_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LeadHistorico: usuario pode inserir para si"
      ON public.lead_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: admin pode inserir para terceiro"
      ON public.lead_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = lead_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LeadHistorico: usuario pode atualizar seus proprios registros"
      ON public.lead_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: gestor atualiza registros da equipe"
      ON public.lead_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(lead_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(lead_historico.usuario_id));
    CREATE POLICY "LeadHistorico: admin atualiza qualquer registro"
      ON public.lead_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LeadHistorico: usuario pode excluir seus proprios registros"
      ON public.lead_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadHistorico: gestor exclui registros da equipe"
      ON public.lead_historico FOR DELETE
      USING (public.is_gestor_da_equipe(lead_historico.usuario_id));
    CREATE POLICY "LeadHistorico: admin exclui qualquer registro"
      ON public.lead_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Lead Anexos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='lead_anexos') THEN
    DROP POLICY IF EXISTS "Allow authenticated users to view lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Allow authenticated users to insert lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Allow authenticated users to delete lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can view their lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can insert their lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can update their lead anexos" ON public.lead_anexos;
    DROP POLICY IF EXISTS "Authenticated users can delete their lead anexos" ON public.lead_anexos;

    CREATE POLICY "LeadAnexos: usuario pode ver seus proprios registros"
      ON public.lead_anexos FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: gestor ve registros da equipe"
      ON public.lead_anexos FOR SELECT
      USING (public.is_gestor_da_equipe(lead_anexos.usuario_id));
    CREATE POLICY "LeadAnexos: admin ve todos"
      ON public.lead_anexos FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "LeadAnexos: usuario pode inserir para si"
      ON public.lead_anexos FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: admin pode inserir para terceiro"
      ON public.lead_anexos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = lead_anexos.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "LeadAnexos: usuario pode atualizar seus proprios registros"
      ON public.lead_anexos FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: gestor atualiza registros da equipe"
      ON public.lead_anexos FOR UPDATE
      USING (public.is_gestor_da_equipe(lead_anexos.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(lead_anexos.usuario_id));
    CREATE POLICY "LeadAnexos: admin atualiza qualquer registro"
      ON public.lead_anexos FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "LeadAnexos: usuario pode excluir seus proprios registros"
      ON public.lead_anexos FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "LeadAnexos: gestor exclui registros da equipe"
      ON public.lead_anexos FOR DELETE
      USING (public.is_gestor_da_equipe(lead_anexos.usuario_id));
    CREATE POLICY "LeadAnexos: admin exclui qualquer registro"
      ON public.lead_anexos FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Agenda Tarefas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agenda_tarefas') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their agenda tarefas" ON public.agenda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can insert their agenda tarefas" ON public.agenda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can update their agenda tarefas" ON public.agenda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can delete their agenda tarefas" ON public.agenda_tarefas;

    CREATE POLICY "AgendaTarefas: usuario pode ver seus proprios registros"
      ON public.agenda_tarefas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: gestor ve registros da equipe"
      ON public.agenda_tarefas FOR SELECT
      USING (public.is_gestor_da_equipe(agenda_tarefas.usuario_id));
    CREATE POLICY "AgendaTarefas: admin ve todos"
      ON public.agenda_tarefas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AgendaTarefas: usuario pode inserir para si"
      ON public.agenda_tarefas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: admin pode inserir para terceiro"
      ON public.agenda_tarefas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agenda_tarefas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AgendaTarefas: usuario pode atualizar seus proprios registros"
      ON public.agenda_tarefas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: gestor atualiza registros da equipe"
      ON public.agenda_tarefas FOR UPDATE
      USING (public.is_gestor_da_equipe(agenda_tarefas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(agenda_tarefas.usuario_id));
    CREATE POLICY "AgendaTarefas: admin atualiza qualquer registro"
      ON public.agenda_tarefas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AgendaTarefas: usuario pode excluir seus proprios registros"
      ON public.agenda_tarefas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaTarefas: gestor exclui registros da equipe"
      ON public.agenda_tarefas FOR DELETE
      USING (public.is_gestor_da_equipe(agenda_tarefas.usuario_id));
    CREATE POLICY "AgendaTarefas: admin exclui qualquer registro"
      ON public.agenda_tarefas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Agenda Followups
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='agenda_followups') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their agenda followups" ON public.agenda_followups;
    DROP POLICY IF EXISTS "Authenticated users can insert their agenda followups" ON public.agenda_followups;
    DROP POLICY IF EXISTS "Authenticated users can update their agenda followups" ON public.agenda_followups;
    DROP POLICY IF EXISTS "Authenticated users can delete their agenda followups" ON public.agenda_followups;

    CREATE POLICY "AgendaFollowups: usuario pode ver seus proprios registros"
      ON public.agenda_followups FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: gestor ve registros da equipe"
      ON public.agenda_followups FOR SELECT
      USING (public.is_gestor_da_equipe(agenda_followups.usuario_id));
    CREATE POLICY "AgendaFollowups: admin ve todos"
      ON public.agenda_followups FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "AgendaFollowups: usuario pode inserir para si"
      ON public.agenda_followups FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: admin pode inserir para terceiro"
      ON public.agenda_followups FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agenda_followups.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "AgendaFollowups: usuario pode atualizar seus proprios registros"
      ON public.agenda_followups FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: gestor atualiza registros da equipe"
      ON public.agenda_followups FOR UPDATE
      USING (public.is_gestor_da_equipe(agenda_followups.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(agenda_followups.usuario_id));
    CREATE POLICY "AgendaFollowups: admin atualiza qualquer registro"
      ON public.agenda_followups FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "AgendaFollowups: usuario pode excluir seus proprios registros"
      ON public.agenda_followups FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "AgendaFollowups: gestor exclui registros da equipe"
      ON public.agenda_followups FOR DELETE
      USING (public.is_gestor_da_equipe(agenda_followups.usuario_id));
    CREATE POLICY "AgendaFollowups: admin exclui qualquer registro"
      ON public.agenda_followups FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Pos Venda Historico
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pos_venda_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pos_venda_historico" ON public.pos_venda_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their pos_venda_historico" ON public.pos_venda_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their pos_venda_historico" ON public.pos_venda_historico;

    CREATE POLICY "PosVendaHistorico: usuario pode ver seus proprios registros"
      ON public.pos_venda_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: gestor ve registros da equipe"
      ON public.pos_venda_historico FOR SELECT
      USING (public.is_gestor_da_equipe(pos_venda_historico.usuario_id));
    CREATE POLICY "PosVendaHistorico: admin ve todos"
      ON public.pos_venda_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PosVendaHistorico: usuario pode inserir para si"
      ON public.pos_venda_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: admin pode inserir para terceiro"
      ON public.pos_venda_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PosVendaHistorico: usuario pode atualizar seus proprios registros"
      ON public.pos_venda_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: gestor atualiza registros da equipe"
      ON public.pos_venda_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(pos_venda_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pos_venda_historico.usuario_id));
    CREATE POLICY "PosVendaHistorico: admin atualiza qualquer registro"
      ON public.pos_venda_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PosVendaHistorico: usuario pode excluir seus proprios registros"
      ON public.pos_venda_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaHistorico: gestor exclui registros da equipe"
      ON public.pos_venda_historico FOR DELETE
      USING (public.is_gestor_da_equipe(pos_venda_historico.usuario_id));
    CREATE POLICY "PosVendaHistorico: admin exclui qualquer registro"
      ON public.pos_venda_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Pos Venda Tarefas
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pos_venda_tarefas') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pos_venda_tarefas" ON public.pos_venda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can insert their pos_venda_tarefas" ON public.pos_venda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can update their pos_venda_tarefas" ON public.pos_venda_tarefas;
    DROP POLICY IF EXISTS "Authenticated users can delete their pos_venda_tarefas" ON public.pos_venda_tarefas;

    CREATE POLICY "PosVendaTarefas: usuario pode ver seus proprios registros"
      ON public.pos_venda_tarefas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: gestor ve registros da equipe"
      ON public.pos_venda_tarefas FOR SELECT
      USING (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id));
    CREATE POLICY "PosVendaTarefas: admin ve todos"
      ON public.pos_venda_tarefas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PosVendaTarefas: usuario pode inserir para si"
      ON public.pos_venda_tarefas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: admin pode inserir para terceiro"
      ON public.pos_venda_tarefas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda_tarefas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PosVendaTarefas: usuario pode atualizar seus proprios registros"
      ON public.pos_venda_tarefas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: gestor atualiza registros da equipe"
      ON public.pos_venda_tarefas FOR UPDATE
      USING (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id));
    CREATE POLICY "PosVendaTarefas: admin atualiza qualquer registro"
      ON public.pos_venda_tarefas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PosVendaTarefas: usuario pode excluir seus proprios registros"
      ON public.pos_venda_tarefas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaTarefas: gestor exclui registros da equipe"
      ON public.pos_venda_tarefas FOR DELETE
      USING (public.is_gestor_da_equipe(pos_venda_tarefas.usuario_id));
    CREATE POLICY "PosVendaTarefas: admin exclui qualquer registro"
      ON public.pos_venda_tarefas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  -- Pos Venda Comunicacoes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pos_venda_comunicacoes') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can insert their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can update their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;
    DROP POLICY IF EXISTS "Authenticated users can delete their pos_venda_comunicacoes" ON public.pos_venda_comunicacoes;

    CREATE POLICY "PosVendaComunicacoes: usuario pode ver seus proprios registros"
      ON public.pos_venda_comunicacoes FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: gestor ve registros da equipe"
      ON public.pos_venda_comunicacoes FOR SELECT
      USING (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id));
    CREATE POLICY "PosVendaComunicacoes: admin ve todos"
      ON public.pos_venda_comunicacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PosVendaComunicacoes: usuario pode inserir para si"
      ON public.pos_venda_comunicacoes FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: admin pode inserir para terceiro"
      ON public.pos_venda_comunicacoes FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda_comunicacoes.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PosVendaComunicacoes: usuario pode atualizar seus proprios registros"
      ON public.pos_venda_comunicacoes FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: gestor atualiza registros da equipe"
      ON public.pos_venda_comunicacoes FOR UPDATE
      USING (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id));
    CREATE POLICY "PosVendaComunicacoes: admin atualiza qualquer registro"
      ON public.pos_venda_comunicacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PosVendaComunicacoes: usuario pode excluir seus proprios registros"
      ON public.pos_venda_comunicacoes FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PosVendaComunicacoes: gestor exclui registros da equipe"
      ON public.pos_venda_comunicacoes FOR DELETE
      USING (public.is_gestor_da_equipe(pos_venda_comunicacoes.usuario_id));
    CREATE POLICY "PosVendaComunicacoes: admin exclui qualquer registro"
      ON public.pos_venda_comunicacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 2. PROPOSTAS - REMOVER POLÍCIA PÚBLICA E CORRIGIR
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='propostas') THEN
    DROP POLICY IF EXISTS "Users can view their proposals" ON public.propostas;
    DROP POLICY IF EXISTS "Public can view proposals by token" ON public.propostas;

    CREATE POLICY "Propostas: usuario pode ver suas proprias propostas"
      ON public.propostas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: gestor ve propostas da equipe"
      ON public.propostas FOR SELECT
      USING (public.is_gestor_da_equipe(propostas.usuario_id));
    CREATE POLICY "Propostas: admin ve todas"
      ON public.propostas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Propostas: usuario pode inserir para si"
      ON public.propostas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: admin pode inserir para terceiro"
      ON public.propostas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = propostas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Propostas: usuario pode atualizar suas proprias propostas"
      ON public.propostas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: gestor atualiza propostas da equipe"
      ON public.propostas FOR UPDATE
      USING (public.is_gestor_da_equipe(propostas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(propostas.usuario_id));
    CREATE POLICY "Propostas: admin atualiza qualquer proposta"
      ON public.propostas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Propostas: usuario pode excluir suas proprias propostas"
      ON public.propostas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Propostas: gestor exclui propostas da equipe"
      ON public.propostas FOR DELETE
      USING (public.is_gestor_da_equipe(propostas.usuario_id));
    CREATE POLICY "Propostas: admin exclui qualquer proposta"
      ON public.propostas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 3. PROPOSTA_EVENTOS - REMOVER INSERT PÚBLICO
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='proposta_eventos') THEN
    DROP POLICY IF EXISTS "Users can view events for their proposals" ON public.proposta_eventos;
    DROP POLICY IF EXISTS "System can insert proposal events" ON public.proposta_eventos;
    DROP POLICY IF EXISTS "Public can insert proposal events" ON public.proposta_eventos;

    CREATE POLICY "PropostaEventos: usuario pode ver eventos de suas propostas"
      ON public.proposta_eventos FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.propostas p
          WHERE p.id = proposta_eventos.proposta_id AND p.usuario_id = auth.uid()
        )
        OR public.is_admin_safe()
      );
    CREATE POLICY "PropostaEventos: admin pode inserir eventos"
      ON public.proposta_eventos FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (
          SELECT 1 FROM public.propostas p
          WHERE p.id = proposta_eventos.proposta_id
        )
      );
  END IF;
END $$;

-- ============================================================
-- 4. PROPOSTA_FOLLOWUPS
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='proposta_followups') THEN
    DROP POLICY IF EXISTS "Users can view their proposal followups" ON public.proposta_followups;
    DROP POLICY IF EXISTS "Users can insert their proposal followups" ON public.proposta_followups;

    CREATE POLICY "PropostaFollowups: usuario pode ver seus proprios registros"
      ON public.proposta_followups FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: gestor ve registros da equipe"
      ON public.proposta_followups FOR SELECT
      USING (public.is_gestor_da_equipe(proposta_followups.usuario_id));
    CREATE POLICY "PropostaFollowups: admin ve todos"
      ON public.proposta_followups FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PropostaFollowups: usuario pode inserir para si"
      ON public.proposta_followups FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: admin pode inserir para terceiro"
      ON public.proposta_followups FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = proposta_followups.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PropostaFollowups: usuario pode atualizar seus proprios registros"
      ON public.proposta_followups FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: gestor atualiza registros da equipe"
      ON public.proposta_followups FOR UPDATE
      USING (public.is_gestor_da_equipe(proposta_followups.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(proposta_followups.usuario_id));
    CREATE POLICY "PropostaFollowups: admin atualiza qualquer registro"
      ON public.proposta_followups FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PropostaFollowups: usuario pode excluir seus proprios registros"
      ON public.proposta_followups FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PropostaFollowups: gestor exclui registros da equipe"
      ON public.proposta_followups FOR DELETE
      USING (public.is_gestor_da_equipe(proposta_followups.usuario_id));
    CREATE POLICY "PropostaFollowups: admin exclui qualquer registro"
      ON public.proposta_followups FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 5. CREDITOS INVESTIMENTO E TABELAS RELACIONADAS
-- (usuario_id referencia public.profiles, não auth.users)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='creditos_investimento') THEN
    DROP POLICY IF EXISTS "Consultor ve seus creditos" ON public.creditos_investimento;
    DROP POLICY IF EXISTS "Consultor cria seus creditos" ON public.creditos_investimento;
    DROP POLICY IF EXISTS "Consultor atualiza seus creditos" ON public.creditos_investimento;

    CREATE POLICY "CreditosInvestimento: usuario pode ver seus proprios registros"
      ON public.creditos_investimento FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: gestor ve registros da equipe"
      ON public.creditos_investimento FOR SELECT
      USING (public.is_gestor_da_equipe(creditos_investimento.usuario_id));
    CREATE POLICY "CreditosInvestimento: admin ve todos"
      ON public.creditos_investimento FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditosInvestimento: usuario pode inserir para si"
      ON public.creditos_investimento FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: admin pode inserir para terceiro"
      ON public.creditos_investimento FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = creditos_investimento.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "CreditosInvestimento: usuario pode atualizar seus proprios registros"
      ON public.creditos_investimento FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: gestor atualiza registros da equipe"
      ON public.creditos_investimento FOR UPDATE
      USING (public.is_gestor_da_equipe(creditos_investimento.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(creditos_investimento.usuario_id));
    CREATE POLICY "CreditosInvestimento: admin atualiza qualquer registro"
      ON public.creditos_investimento FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditosInvestimento: usuario pode excluir seus proprios registros"
      ON public.creditos_investimento FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "CreditosInvestimento: gestor exclui registros da equipe"
      ON public.creditos_investimento FOR DELETE
      USING (public.is_gestor_da_equipe(creditos_investimento.usuario_id));
    CREATE POLICY "CreditosInvestimento: admin exclui qualquer registro"
      ON public.creditos_investimento FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_historico') THEN
    DROP POLICY IF EXISTS "Leio historico dos meus creditos" ON public.credito_historico;

    CREATE POLICY "CreditoHistorico: usuario pode ver historico de seus creditos"
      ON public.credito_historico FOR SELECT
      USING (
        auth.uid() = usuario_id
        OR public.is_gestor_da_equipe(usuario_id)
        OR public.is_admin_safe()
      );
    CREATE POLICY "CreditoHistorico: usuario pode inserir historico"
      ON public.credito_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoHistorico: admin pode atualizar qualquer registro"
      ON public.credito_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoHistorico: admin pode excluir qualquer registro"
      ON public.credito_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_tarefas') THEN
    DROP POLICY IF EXISTS "Gerencio minhas tarefas" ON public.credito_tarefas;

    CREATE POLICY "CreditoTarefas: usuario pode gerenciar suas proprias tarefas"
      ON public.credito_tarefas FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoTarefas: gestor ve tarefas da equipe"
      ON public.credito_tarefas FOR SELECT
      USING (public.is_gestor_da_equipe(credito_tarefas.usuario_id));
    CREATE POLICY "CreditoTarefas: admin ve todas"
      ON public.credito_tarefas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditoTarefas: admin pode atualizar qualquer tarefa"
      ON public.credito_tarefas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoTarefas: admin pode excluir qualquer tarefa"
      ON public.credito_tarefas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_reunioes') THEN
    DROP POLICY IF EXISTS "Gerencio minhas reunioes" ON public.credito_reunioes;

    CREATE POLICY "CreditoReunioes: usuario pode gerenciar suas proprias reunioes"
      ON public.credito_reunioes FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoReunioes: gestor ve reunioes da equipe"
      ON public.credito_reunioes FOR SELECT
      USING (public.is_gestor_da_equipe(credito_reunioes.usuario_id));
    CREATE POLICY "CreditoReunioes: admin ve todas"
      ON public.credito_reunioes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditoReunioes: admin pode atualizar qualquer reuniao"
      ON public.credito_reunioes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoReunioes: admin pode excluir qualquer reuniao"
      ON public.credito_reunioes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='credito_mensagens_registradas') THEN
    DROP POLICY IF EXISTS "Gerencio minhas mensagens" ON public.credito_mensagens_registradas;

    CREATE POLICY "CreditoMensagens: usuario pode gerenciar suas proprias mensagens"
      ON public.credito_mensagens_registradas FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditoMensagens: gestor ve mensagens da equipe"
      ON public.credito_mensagens_registradas FOR SELECT
      USING (public.is_gestor_da_equipe(credito_mensagens_registradas.usuario_id));
    CREATE POLICY "CreditoMensagens: admin ve todas"
      ON public.credito_mensagens_registradas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditoMensagens: admin pode atualizar qualquer mensagem"
      ON public.credito_mensagens_registradas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditoMensagens: admin pode excluir qualquer mensagem"
      ON public.credito_mensagens_registradas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='creditos_simulacoes') THEN
    DROP POLICY IF EXISTS "Gerencio minhas simulacoes" ON public.creditos_simulacoes;

    CREATE POLICY "CreditosSimulacoes: usuario pode gerenciar suas proprias simulacoes"
      ON public.creditos_simulacoes FOR ALL
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "CreditosSimulacoes: gestor ve simulacoes da equipe"
      ON public.creditos_simulacoes FOR SELECT
      USING (public.is_gestor_da_equipe(creditos_simulacoes.usuario_id));
    CREATE POLICY "CreditosSimulacoes: admin ve todas"
      ON public.creditos_simulacoes FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "CreditosSimulacoes: admin pode atualizar qualquer simulacao"
      ON public.creditos_simulacoes FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "CreditosSimulacoes: admin pode excluir qualquer simulacao"
      ON public.creditos_simulacoes FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 6. PLAYBOOKS - DADOS DE REFERÊNCIA (leitura pública autenticada)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='playbooks_atendimento') THEN
    DROP POLICY IF EXISTS "Leio playbooks" ON public.playbooks_atendimento;
    CREATE POLICY "Playbooks: usuario autenticado pode ver"
      ON public.playbooks_atendimento FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='playbook_mensagens') THEN
    DROP POLICY IF EXISTS "Leio mensagens do playbook" ON public.playbook_mensagens;
    CREATE POLICY "PlaybookMensagens: usuario autenticado pode ver ativas"
      ON public.playbook_mensagens FOR SELECT
      USING (auth.role() = 'authenticated' AND ativo = true);
  END IF;
END $$;

-- ============================================================
-- 7. TABELAS LIVE - CORRIGIR public.is_admin() → public.is_admin_safe()
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_presentes_categorias') THEN
    DROP POLICY IF EXISTS "Autenticados veem categorias ativas" ON public.live_presentes_categorias;
    DROP POLICY IF EXISTS "Somente admin gerencia categorias" ON public.live_presentes_categorias;

    CREATE POLICY "LivePresentesCategorias: autenticados veem ativas"
      ON public.live_presentes_categorias FOR SELECT
      USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin_safe()));
    CREATE POLICY "LivePresentesCategorias: somente admin gerencia"
      ON public.live_presentes_categorias FOR ALL
      USING (auth.role() = 'authenticated' AND public.is_admin_safe())
      WITH CHECK (auth.role() = 'authenticated' AND public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_presentes_subcategorias') THEN
    DROP POLICY IF EXISTS "Autenticados veem subcategorias ativas" ON public.live_presentes_subcategorias;
    DROP POLICY IF EXISTS "Somente admin gerencia subcategorias" ON public.live_presentes_subcategorias;

    CREATE POLICY "LivePresentesSubcategorias: autenticados veem ativas"
      ON public.live_presentes_subcategorias FOR SELECT
      USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin_safe()));
    CREATE POLICY "LivePresentesSubcategorias: somente admin gerencia"
      ON public.live_presentes_subcategorias FOR ALL
      USING (auth.role() = 'authenticated' AND public.is_admin_safe())
      WITH CHECK (auth.role() = 'authenticated' AND public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='live_presentes') THEN
    DROP POLICY IF EXISTS "Autenticados veem presentes ativos" ON public.live_presentes;
    DROP POLICY IF EXISTS "Somente admin gerencia presentes" ON public.live_presentes;

    CREATE POLICY "LivePresentes: autenticados veem ativos"
      ON public.live_presentes FOR SELECT
      USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin_safe()));
    CREATE POLICY "LivePresentes: somente admin gerencia"
      ON public.live_presentes FOR ALL
      USING (auth.role() = 'authenticated' AND public.is_admin_safe())
      WITH CHECK (auth.role() = 'authenticated' AND public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 8. TICKER_MESSAGES - REMOVER GRANTS P/ ANON
-- ============================================================
-- A tabela ticker_messages e usada apenas por usuarios autenticados
-- (dashboard, negociacoes, mensagens-dinamicas). O frontend acessa via
-- createClient() (autenticado), nunca via anon. Os grants SQL a 'anon'
-- concedidos pela migration 20260913000004 sao um risco residual e
-- sao revogados aqui. As policies RLS ja restringem o acesso.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ticker_messages') THEN
    REVOKE ALL ON public.ticker_messages FROM anon;
  END IF;
END $$;

-- ============================================================
-- 9. TRIGGERS PARA TABELAS RESTANTES (usuario_id NOT NULL)
-- ============================================================
DO $$
BEGIN
  -- Clientes (já pode ter triggers da migration anterior, mas garante idempotência)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='clientes') THEN
    DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.clientes;
    CREATE TRIGGER trg_prohibit_usuario_id_change
      BEFORE UPDATE ON public.clientes
      FOR EACH ROW
      EXECUTE FUNCTION public.prohibit_usuario_id_change();

    DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.clientes;
    CREATE TRIGGER trg_validate_admin_insert
      BEFORE INSERT ON public.clientes
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_admin_insert();
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    -- Leads pode não ter usuario_id; o trigger validate_admin_insert referencia NEW.usuario_id
    -- que causaria erro se a coluna não existir. Apenas adiciona se a coluna existir.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='leads' AND column_name='usuario_id'
    ) THEN
      DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.leads;
      CREATE TRIGGER trg_prohibit_usuario_id_change
        BEFORE UPDATE ON public.leads
        FOR EACH ROW
        EXECUTE FUNCTION public.prohibit_usuario_id_change();

      DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.leads;
      CREATE TRIGGER trg_validate_admin_insert
        BEFORE INSERT ON public.leads
        FOR EACH ROW
        EXECUTE FUNCTION public.validate_admin_insert();
    END IF;
  END IF;
END $$;

-- Aplicar triggers nas demais tabelas com usuario_id que ainda não têm
-- Verifica existência da tabela e da coluna usuario_id antes de criar triggers
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN (
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public'
      AND table_name IN (
        'indicadores','agenda_eventos','negociacoes','cobrancas','pos_venda',
        'recrutamento','parceiros','comissoes_indicadores','contatos_indicados',
        'cliente_contatos','cliente_historico','negociacao_historico','anexos',
        'whatsapp_mensagens','assembleias','assembleia_avisos','assembleia_historico',
        'loteria_federal','lances','contemplacoes','contemplacao_historico',
        'materiais_consultores','treinamentos','links_uteis','comunicacoes',
        'comunicacao_templates','indicador_historico','cobranca_historico',
        'lead_historico','lead_anexos','agenda_tarefas','agenda_followups',
        'pos_venda_historico','pos_venda_tarefas','pos_venda_comunicacoes',
        'propostas','proposta_followups','creditos_investimento','credito_historico',
        'credito_tarefas','credito_reunioes','credito_mensagens_registradas',
        'creditos_simulacoes','pastas','pasta_itens','prospeccao_historico',
        'user_permission_grants','user_evolution_history','metas'
      )
  ) LOOP
    -- Criar trigger prohibit_usuario_id_change apenas se a coluna usuario_id existir
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name = tbl.table_name
        AND column_name = 'usuario_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.%I', tbl.table_name);
      EXECUTE format('CREATE TRIGGER trg_prohibit_usuario_id_change
        BEFORE UPDATE ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.prohibit_usuario_id_change()', tbl.table_name);
    END IF;

    -- Criar trigger validate_admin_insert apenas se a coluna usuario_id existir
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name = tbl.table_name
        AND column_name = 'usuario_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.%I', tbl.table_name);
      EXECUTE format('CREATE TRIGGER trg_validate_admin_insert
        BEFORE INSERT ON public.%I
        FOR EACH ROW
        EXECUTE FUNCTION public.validate_admin_insert()', tbl.table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 9. PASTAS, PASTA_ITENS, PROSPECCAO_HISTORICO - POLÍTICAS RLS
-- Tabelas com usuario_id, sem seção individual na migration anterior.
-- Seguem o padrão proprietário + gestor da equipe + admin.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pastas') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pastas" ON public.pastas;
    DROP POLICY IF EXISTS "Authenticated users can insert their pastas" ON public.pastas;
    DROP POLICY IF EXISTS "Authenticated users can update their pastas" ON public.pastas;
    DROP POLICY IF EXISTS "Authenticated users can delete their pastas" ON public.pastas;

    CREATE POLICY "Pastas: usuario pode ver suas proprias pastas"
      ON public.pastas FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: gestor ve pastas da equipe"
      ON public.pastas FOR SELECT
      USING (public.is_gestor_da_equipe(pastas.usuario_id));
    CREATE POLICY "Pastas: admin ve todas as pastas"
      ON public.pastas FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "Pastas: usuario pode inserir sua propria pasta"
      ON public.pastas FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: admin pode inserir pasta para terceiro"
      ON public.pastas FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pastas.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "Pastas: usuario pode atualizar suas proprias pastas"
      ON public.pastas FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: gestor atualiza pastas da equipe"
      ON public.pastas FOR UPDATE
      USING (public.is_gestor_da_equipe(pastas.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pastas.usuario_id));
    CREATE POLICY "Pastas: admin atualiza qualquer pasta"
      ON public.pastas FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "Pastas: usuario pode excluir suas proprias pastas"
      ON public.pastas FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "Pastas: gestor exclui pastas da equipe"
      ON public.pastas FOR DELETE
      USING (public.is_gestor_da_equipe(pastas.usuario_id));
    CREATE POLICY "Pastas: admin exclui qualquer pasta"
      ON public.pastas FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='pasta_itens') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their pasta itens" ON public.pasta_itens;
    DROP POLICY IF EXISTS "Authenticated users can insert their pasta itens" ON public.pasta_itens;
    DROP POLICY IF EXISTS "Authenticated users can update their pasta itens" ON public.pasta_itens;
    DROP POLICY IF EXISTS "Authenticated users can delete their pasta itens" ON public.pasta_itens;

    CREATE POLICY "PastaItens: usuario pode ver seus proprios itens"
      ON public.pasta_itens FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: gestor ve itens da equipe"
      ON public.pasta_itens FOR SELECT
      USING (public.is_gestor_da_equipe(pasta_itens.usuario_id));
    CREATE POLICY "PastaItens: admin ve todos os itens"
      ON public.pasta_itens FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "PastaItens: usuario pode inserir seu proprio item"
      ON public.pasta_itens FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: admin pode inserir item para terceiro"
      ON public.pasta_itens FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pasta_itens.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "PastaItens: usuario pode atualizar seus proprios itens"
      ON public.pasta_itens FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: gestor atualiza itens da equipe"
      ON public.pasta_itens FOR UPDATE
      USING (public.is_gestor_da_equipe(pasta_itens.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(pasta_itens.usuario_id));
    CREATE POLICY "PastaItens: admin atualiza qualquer item"
      ON public.pasta_itens FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "PastaItens: usuario pode excluir seus proprios itens"
      ON public.pasta_itens FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "PastaItens: gestor exclui itens da equipe"
      ON public.pasta_itens FOR DELETE
      USING (public.is_gestor_da_equipe(pasta_itens.usuario_id));
    CREATE POLICY "PastaItens: admin exclui qualquer item"
      ON public.pasta_itens FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='prospeccao_historico') THEN
    DROP POLICY IF EXISTS "Authenticated users can view their prospeccao historico" ON public.prospeccao_historico;
    DROP POLICY IF EXISTS "Authenticated users can insert their prospeccao historico" ON public.prospeccao_historico;
    DROP POLICY IF EXISTS "Authenticated users can update their prospeccao historico" ON public.prospeccao_historico;
    DROP POLICY IF EXISTS "Authenticated users can delete their prospeccao historico" ON public.prospeccao_historico;

    CREATE POLICY "ProspeccaoHistorico: usuario pode ver seu proprio historico"
      ON public.prospeccao_historico FOR SELECT
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: gestor ve historico da equipe"
      ON public.prospeccao_historico FOR SELECT
      USING (public.is_gestor_da_equipe(prospeccao_historico.usuario_id));
    CREATE POLICY "ProspeccaoHistorico: admin ve todo o historico"
      ON public.prospeccao_historico FOR SELECT
      USING (public.is_admin_safe());
    CREATE POLICY "ProspeccaoHistorico: usuario pode inserir seu proprio historico"
      ON public.prospeccao_historico FOR INSERT
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: admin pode inserir historico para terceiro"
      ON public.prospeccao_historico FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = prospeccao_historico.usuario_id AND p.ativo = TRUE)
      );
    CREATE POLICY "ProspeccaoHistorico: usuario pode atualizar seu proprio historico"
      ON public.prospeccao_historico FOR UPDATE
      USING (auth.uid() = usuario_id)
      WITH CHECK (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: gestor atualiza historico da equipe"
      ON public.prospeccao_historico FOR UPDATE
      USING (public.is_gestor_da_equipe(prospeccao_historico.usuario_id))
      WITH CHECK (public.is_gestor_da_equipe(prospeccao_historico.usuario_id));
    CREATE POLICY "ProspeccaoHistorico: admin atualiza qualquer historico"
      ON public.prospeccao_historico FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());
    CREATE POLICY "ProspeccaoHistorico: usuario pode excluir seu proprio historico"
      ON public.prospeccao_historico FOR DELETE
      USING (auth.uid() = usuario_id);
    CREATE POLICY "ProspeccaoHistorico: gestor exclui historico da equipe"
      ON public.prospeccao_historico FOR DELETE
      USING (public.is_gestor_da_equipe(prospeccao_historico.usuario_id));
    CREATE POLICY "ProspeccaoHistorico: admin exclui qualquer historico"
      ON public.prospeccao_historico FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

-- ============================================================
-- 10. PERMISSION_PRESETS / PRESET_ITEMS - USAR is_admin_safe()
-- As policies da Migration 1 usam profiles.perfil = 'Administrador'
-- sem checar ativo. Substituir por is_admin_safe() (já existe na Migration 3).
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permission_presets') THEN
    DROP POLICY IF EXISTS "Only admins can insert permission presets" ON public.permission_presets;
    CREATE POLICY "Only admins can insert permission presets"
      ON public.permission_presets FOR INSERT
      WITH CHECK (
        auth.role() = 'authenticated'
        AND public.is_admin_safe()
      );

    DROP POLICY IF EXISTS "Only admins can update permission presets" ON public.permission_presets;
    CREATE POLICY "Only admins can update permission presets"
      ON public.permission_presets FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());

    DROP POLICY IF EXISTS "Only admins can delete permission presets" ON public.permission_presets;
    CREATE POLICY "Only admins can delete permission presets"
      ON public.permission_presets FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='permission_preset_items') THEN
    DROP POLICY IF EXISTS "Only admins can insert permission preset items" ON public.permission_preset_items;
    CREATE POLICY "Only admins can insert permission preset items"
      ON public.permission_preset_items FOR INSERT
      WITH CHECK (
        auth.role() = 'authenticated'
        AND public.is_admin_safe()
      );

    DROP POLICY IF EXISTS "Only admins can update permission preset items" ON public.permission_preset_items;
    CREATE POLICY "Only admins can update permission preset items"
      ON public.permission_preset_items FOR UPDATE
      USING (public.is_admin_safe())
      WITH CHECK (public.is_admin_safe());

    DROP POLICY IF EXISTS "Only admins can delete permission preset items" ON public.permission_preset_items;
    CREATE POLICY "Only admins can delete permission preset items"
      ON public.permission_preset_items FOR DELETE
      USING (public.is_admin_safe());
  END IF;
END $$;

COMMIT;
