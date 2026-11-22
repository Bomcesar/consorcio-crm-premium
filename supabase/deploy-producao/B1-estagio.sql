-- ============================================================
-- Estagio B1 - Fundacao estrutural e funcoes auxiliares
-- Aplicar SOMENTE apos 00-pre-voo.sql e 01-pacote-aditivo.sql, e apos B1/B2 (para B2/B3).
-- Ordem interna preservada; cada migration em BEGIN/COMMIT proprio.
-- ============================================================

-- 20261001000000  (20261001000000_expand_metas_rls_gestores.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- Fix: Allow Gestores (managers) to INSERT/UPDATE/DELETE metas
--
-- The original policies in 20260822000001_create_metas_system.sql.sql
-- only permitted Administradores for INSERT/UPDATE/DELETE.
-- However, the application-level permission system (hasPermission)
-- grants Gestores the "metas.editar" permission, and the module
-- visibility table grants Gestores access to the /metas route.
--
-- This caused a mismatch: Gestores passed the client-side permission
-- check but received a 403 Forbidden from the Supabase REST API
-- because the database RLS policy rejected them.
-- ============================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can update metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can delete metas" ON public.metas;

-- Recreate INSERT policy: allow Administradores and Gestores
CREATE POLICY "Admins and Gestores can insert metas"
  ON public.metas FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- Recreate UPDATE policy: allow Administradores and Gestores
CREATE POLICY "Admins and Gestores can update metas"
  ON public.metas FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- Recreate DELETE policy: allow Administradores and Gestores
CREATE POLICY "Admins and Gestores can delete metas"
  ON public.metas FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

COMMIT;

-- ============================================================

-- 20261002000000  (20261002000000_create_live_core.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ (FASE 2 â€” FUNDAÃ‡ÃƒO)
-- live_rooms, live_participantes, live_solicitacoes
-- ============================================================

-- ------------------------------------------------------------
-- live_rooms
-- status: aguardando -> ao_vivo -> apresentacao -> encerrada
-- modo:   audio | apresentacao
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  anfitriao_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'ao_vivo', 'apresentacao', 'encerrada')),
  modo TEXT NOT NULL DEFAULT 'audio'
    CHECK (modo IN ('audio', 'apresentacao')),
  livekit_room TEXT NOT NULL UNIQUE,
  max_cadeiras INTEGER NOT NULL DEFAULT 8 CHECK (max_cadeiras BETWEEN 1 AND 50),
  iniciada_em TIMESTAMPTZ,
  encerrada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS live_rooms_anfitriao_id_idx ON public.live_rooms (anfitriao_id);
CREATE INDEX IF NOT EXISTS live_rooms_status_idx ON public.live_rooms (status);
CREATE INDEX IF NOT EXISTS live_rooms_created_at_idx ON public.live_rooms (created_at DESC);

-- ------------------------------------------------------------
-- live_participantes
-- O convidado externo entra por 'convidado_hash' e NUNCA ocupa cadeira.
-- A regra Ã© garantida por CHECK no banco, nÃ£o apenas na interface.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_participantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  convidado_hash TEXT,
  nome_exibicao TEXT NOT NULL DEFAULT '',
  perfil TEXT,
  tipo TEXT NOT NULL DEFAULT 'ouvinte'
    CHECK (tipo IN ('anfitriao', 'participante', 'ouvinte', 'convidado')),
  -- Cadeira 0 Ã© reservada ao anfitriÃ£o; as demais comeÃ§am em 1.
  cadeira INTEGER CHECK (cadeira IS NULL OR cadeira >= 0),
  microfone_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  camera_ativa BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
  saiu_em TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Exatamente uma origem: usuÃ¡rio cadastrado OU convidado externo
  CONSTRAINT live_participantes_origem_check CHECK (
    (usuario_id IS NOT NULL AND convidado_hash IS NULL) OR
    (usuario_id IS NULL AND convidado_hash IS NOT NULL)
  ),

  -- Convidado externo nunca ocupa cadeira (regra da versÃ£o 1)
  CONSTRAINT live_participantes_convidado_sem_cadeira_check CHECK (
    tipo <> 'convidado' OR cadeira IS NULL
  ),

  -- AnfitriÃ£o Ã© sempre um usuÃ¡rio interno identificado
  CONSTRAINT live_participantes_anfitriao_interno_check CHECK (
    tipo <> 'anfitriao' OR usuario_id IS NOT NULL
  ),

  -- Cadeira 0 (palco) Ã© exclusiva do anfitriÃ£o
  CONSTRAINT live_participantes_cadeira_zero_check CHECK (
    cadeira IS DISTINCT FROM 0 OR tipo = 'anfitriao'
  )
);

-- Uma pessoa por cadeira ativa, por sala
CREATE UNIQUE INDEX IF NOT EXISTS live_participantes_cadeira_unica
  ON public.live_participantes (live_id, cadeira)
  WHERE cadeira IS NOT NULL AND saiu_em IS NULL;

-- Uma sessÃ£o por usuÃ¡rio por sala
CREATE UNIQUE INDEX IF NOT EXISTS live_participantes_usuario_unico
  ON public.live_participantes (live_id, usuario_id)
  WHERE usuario_id IS NOT NULL AND saiu_em IS NULL;

CREATE INDEX IF NOT EXISTS live_participantes_live_id_idx ON public.live_participantes (live_id);
CREATE INDEX IF NOT EXISTS live_participantes_usuario_id_idx ON public.live_participantes (usuario_id);

-- Um convidado externo Ã© a MESMA pessoa em todos os acessos do
-- mesmo convite: o par (sala, hash do token) identifica o convidado.
-- Sem este Ã­ndice, cada abertura de link criaria uma nova linha e a
-- contagem de pessoas na sala ficaria inflada.
CREATE UNIQUE INDEX IF NOT EXISTS live_participantes_convidado_unico
  ON public.live_participantes (live_id, convidado_hash)
  WHERE convidado_hash IS NOT NULL AND saiu_em IS NULL;

-- ------------------------------------------------------------
-- live_solicitacoes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_solicitacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'aceita', 'recusada', 'cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  respondida_em TIMESTAMPTZ,
  respondido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Impede solicitaÃ§Ã£o duplicada enquanto estiver pendente
CREATE UNIQUE INDEX IF NOT EXISTS live_solicitacoes_pendente_unica
  ON public.live_solicitacoes (live_id, usuario_id)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS live_solicitacoes_live_id_idx ON public.live_solicitacoes (live_id, status);

-- ------------------------------------------------------------
-- FunÃ§Ãµes de autorizaÃ§Ã£o da sala (SECURITY DEFINER evita recursÃ£o de RLS)
-- ------------------------------------------------------------

-- Sou participante ativo desta sala?
CREATE OR REPLACE FUNCTION public.live_participa(p_live_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.live_participantes p
    WHERE p.live_id = p_live_id
      AND p.usuario_id = auth.uid()
      AND p.saiu_em IS NULL
      AND p.bloqueado = FALSE
  );
$$;

-- Sou o anfitriÃ£o desta sala?
CREATE OR REPLACE FUNCTION public.live_e_anfitriao(p_live_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.live_rooms r
    WHERE r.id = p_live_id
      AND r.anfitriao_id = auth.uid()
  );
$$;

-- A sala estÃ¡ aberta para novos ouvintes?
CREATE OR REPLACE FUNCTION public.live_aberta(p_live_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.live_rooms r
    WHERE r.id = p_live_id
      AND r.status <> 'encerrada'
  );
$$;

GRANT EXECUTE ON FUNCTION public.live_participa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.live_e_anfitriao(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.live_aberta(UUID) TO authenticated;

-- ------------------------------------------------------------
-- Triggers updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_live_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_rooms_updated_at ON public.live_rooms;
CREATE TRIGGER update_live_rooms_updated_at
  BEFORE UPDATE ON public.live_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_live_rooms_updated_at();

CREATE OR REPLACE FUNCTION public.update_live_participantes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_participantes_updated_at ON public.live_participantes;
CREATE TRIGGER update_live_participantes_updated_at
  BEFORE UPDATE ON public.live_participantes
  FOR EACH ROW EXECUTE FUNCTION public.update_live_participantes_updated_at();

-- ------------------------------------------------------------
-- ProteÃ§Ã£o de campos controlados apenas pelo anfitriÃ£o.
-- RLS nÃ£o pode comparar OLD/NEW, entÃ£o a invariante Ã© garantida aqui:
-- um participante comum sÃ³ altera microfone/cÃ¢mera â€” nunca tipo,
-- cadeira ou bloqueio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_participantes_proteger_campos()
RETURNS TRIGGER AS $$
BEGIN
  -- OperaÃ§Ãµes de sistema (sem sessÃ£o autenticada, service_role, job de
  -- manutenÃ§Ã£o): a RLS jÃ¡ nÃ£o se aplica a elas, entÃ£o o guard nÃ£o tem
  -- o que proteger. Sem esta saÃ­da, encerrar uma sala que teve
  -- visitante convidado falhava, porque a cascata de encerramento mexe
  -- em `saiu_em` de linhas cujo `usuario_id` Ã© NULL.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convidado externo: sem usuÃ¡rio, logo a linha nÃ£o pertence a quem
  -- estÃ¡ chamando.
  IF NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.usuario_id = auth.uid() THEN
    IF NOT public.live_e_anfitriao(NEW.live_id) THEN
      IF NEW.tipo IS DISTINCT FROM OLD.tipo
         OR NEW.cadeira IS DISTINCT FROM OLD.cadeira
         OR NEW.bloqueado IS DISTINCT FROM OLD.bloqueado
         OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
         OR NEW.convidado_hash IS DISTINCT FROM OLD.convidado_hash
         OR NEW.saiu_em IS DISTINCT FROM OLD.saiu_em THEN
        RAISE EXCEPTION 'Somente o anfitriao pode alterar assento, tipo ou bloqueio.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS live_participantes_proteger_campos ON public.live_participantes;
CREATE TRIGGER live_participantes_proteger_campos
  BEFORE UPDATE ON public.live_participantes
  FOR EACH ROW EXECUTE FUNCTION public.live_participantes_proteger_campos();

-- ------------------------------------------------------------
-- MÃ¡quina de estados da sala.
-- RLS nÃ£o compara OLD/NEW, entÃ£o as invariantes abaixo sÃ£o
-- garantidas no banco:
--   - o anfitriÃ£o nÃ£o pode ser trocado;
--   - uma sala encerrada Ã© definitiva (o histÃ³rico nÃ£o Ã© reaberto);
--   - `iniciada_em` e `encerrada_em` reflectem o status real.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_rooms_transicao_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.anfitriao_id IS DISTINCT FROM OLD.anfitriao_id THEN
    RAISE EXCEPTION 'O anfitriao da live nao pode ser alterado.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status = 'encerrada' AND NEW.status IS DISTINCT FROM 'encerrada' THEN
    RAISE EXCEPTION 'Uma live encerrada nao pode ser reaberta.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IN ('ao_vivo', 'apresentacao') THEN
    NEW.iniciada_em := COALESCE(OLD.iniciada_em, NEW.iniciada_em, NOW());
  END IF;

  IF NEW.status = 'encerrada' THEN
    NEW.encerrada_em := COALESCE(NEW.encerrada_em, NOW());
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS live_rooms_transicao_status ON public.live_rooms;
CREATE TRIGGER live_rooms_transicao_status
  BEFORE UPDATE ON public.live_rooms
  FOR EACH ROW EXECUTE FUNCTION public.live_rooms_transicao_status();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.live_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_solicitacoes ENABLE ROW LEVEL SECURITY;

-- live_rooms ------------------------------------------------------------
-- LÃª: participantes da sala; o anfitriÃ£o sempre; e qualquer usuÃ¡rio
--     autenticado enquanto a live estiver aberta (necessÃ¡rio para
--     poder ENTRAR na sala).
DROP POLICY IF EXISTS "Leitura da live" ON public.live_rooms;
CREATE POLICY "Leitura da live"
  ON public.live_rooms FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      public.live_e_anfitriao(id)
      OR status <> 'encerrada'
      OR public.live_participa(id)
    )
  );

-- SÃ³ o prÃ³prio anfitriÃ£o cria a sala (nÃ£o Ã© possÃ­vel se	auto_atribuir)
DROP POLICY IF EXISTS "Anfitriao cria a live" ON public.live_rooms;
CREATE POLICY "Anfitriao cria a live"
  ON public.live_rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND anfitriao_id = auth.uid());

-- Somente o anfitriÃ£o altera status/modo/tÃ­tulo/cadeiras
DROP POLICY IF EXISTS "Anfitriao atualiza a live" ON public.live_rooms;
CREATE POLICY "Anfitriao atualiza a live"
  ON public.live_rooms FOR UPDATE
  USING (auth.role() = 'authenticated' AND anfitriao_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND anfitriao_id = auth.uid());

-- NinguÃ©m deleta live: o histÃ³rico Ã© preservado
DROP POLICY IF EXISTS "Ninguem deleta live" ON public.live_rooms;
CREATE POLICY "Ninguem deleta live"
  ON public.live_rooms FOR DELETE
  USING (FALSE);

-- live_participantes ----------------------------------------------------
DROP POLICY IF EXISTS "Leitura dos participantes" ON public.live_participantes;
CREATE POLICY "Leitura dos participantes"
  ON public.live_participantes FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      public.live_e_anfitriao(live_id)
      OR public.live_participa(live_id)
      OR public.live_aberta(live_id)
    )
  );

-- Entro na sala como ouvinte (nunca como anfitriÃ£o, nunca em cadeira)
DROP POLICY IF EXISTS "Entro na sala como ouvinte" ON public.live_participantes;
CREATE POLICY "Entro na sala como ouvinte"
  ON public.live_participantes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND usuario_id = auth.uid()
    AND tipo IN ('ouvinte', 'participante')
    AND bloqueado = FALSE
    AND public.live_aberta(live_id)
  );

-- O anfitriÃ£o registra o prÃ³prio assento
DROP POLICY IF EXISTS "Anfitriao registra o proprio assento" ON public.live_participantes;
CREATE POLICY "Anfitriao registra o proprio assento"
  ON public.live_participantes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND tipo = 'anfitriao'
    AND usuario_id = auth.uid()
  );

-- Minhas Updates: RLS permite; a trigger protege os campos do anfitriÃ£o
DROP POLICY IF EXISTS "Atualizo meu estado" ON public.live_participantes;
CREATE POLICY "Atualizo meu estado"
  ON public.live_participantes FOR UPDATE
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- O anfitriÃ£o controla a sala
DROP POLICY IF EXISTS "Anfitriao controla a sala" ON public.live_participantes;
CREATE POLICY "Anfitriao controla a sala"
  ON public.live_participantes FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id))
  WITH CHECK (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

-- Sair da sala: eu mesmo ou o anfitriÃ£o
DROP POLICY IF EXISTS "Saio da sala" ON public.live_participantes;
CREATE POLICY "Saio da sala"
  ON public.live_participantes FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND (usuario_id = auth.uid() OR public.live_e_anfitriao(live_id))
  );

-- live_solicitacoes -----------------------------------------------------
DROP POLICY IF EXISTS "Leio minhas solicitacoes ou as da sala" ON public.live_solicitacoes;
CREATE POLICY "Leio minhas solicitacoes ou as da sala"
  ON public.live_solicitacoes FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (usuario_id = auth.uid() OR public.live_e_anfitriao(live_id))
  );

-- Somente usuÃ¡rios cadastrados pedem para falar
DROP POLICY IF EXISTS "Peca para falar" ON public.live_solicitacoes;
CREATE POLICY "Peca para falar"
  ON public.live_solicitacoes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND usuario_id = auth.uid()
    AND status = 'pendente'
    AND public.live_participa(live_id)
  );

-- O anfitriÃ£o responde; o prÃ³prio usuÃ¡rio cancela
DROP POLICY IF EXISTS "Respondo ou cancelo" ON public.live_solicitacoes;
CREATE POLICY "Respondo ou cancelo"
  ON public.live_solicitacoes FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (usuario_id = auth.uid() OR public.live_e_anfitriao(live_id))
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (usuario_id = auth.uid() OR public.live_e_anfitriao(live_id))
  );

COMMIT;

-- ============================================================

-- 20261002000001  (20261002000001_create_live_chat_convites.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ (FASE 2)
-- live_convites (token temporÃ¡rio seguro), live_convite_acessos,
-- live_chat_mensagens
-- ============================================================

-- ------------------------------------------------------------
-- live_convites
-- O token NUNCA Ã© gravado em texto puro: sÃ³ o SHA-256.
-- Se o banco vazar, nenhum link externo pode ser aberto.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  rotulo TEXT NOT NULL DEFAULT '',
  criado_por UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expira_em TIMESTAMPTZ NOT NULL,
  limite_acessos INTEGER CHECK (limite_acessos IS NULL OR limite_acessos > 0),
  acessos INTEGER NOT NULL DEFAULT 0 CHECK (acessos >= 0),
  revogado BOOLEAN NOT NULL DEFAULT FALSE,
  ultimo_acesso_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS live_convites_live_id_idx ON public.live_convites (live_id);
CREATE INDEX IF NOT EXISTS live_convites_token_hash_idx ON public.live_convites (token_hash);

-- ------------------------------------------------------------
-- live_convite_acessos
-- LGPD minimizada: guardamos apenas o IP hasheado e o user agent
-- truncado. Nunca o IP em texto puro.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_convite_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  convite_id UUID NOT NULL REFERENCES public.live_convites(id) ON DELETE CASCADE,
  nome_exibicao TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT '',
  entrou_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  saiu_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS live_convite_acessos_convite_id_idx
  ON public.live_convite_acessos (convite_id, entrou_em DESC);

-- ------------------------------------------------------------
-- live_chat_mensagens
-- Convidados externos escrevem aqui via Route Handler (service role)
-- depois de validar o token. Nunca recebem sessÃ£o Supabase.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_chat_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  autor_usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  autor_convidado_hash TEXT,
  nome_exibicao TEXT NOT NULL DEFAULT '',
  perfil TEXT,
  mensagem TEXT NOT NULL CHECK (char_length(mensagem) BETWEEN 1 AND 500),
  tipo TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'presente', 'sistema')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT live_chat_origem_check CHECK (
    (autor_usuario_id IS NOT NULL AND autor_convidado_hash IS NULL) OR
    (autor_usuario_id IS NULL AND autor_convidado_hash IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS live_chat_live_id_created_at_idx
  ON public.live_chat_mensagens (live_id, created_at);

-- ------------------------------------------------------------
-- Trigger: encerrar a live invalida TODOS os convites da sala
-- (requisito: o encerramento deve invalidar os links).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_encerrar_invalida_convites()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'encerrada' AND OLD.status IS DISTINCT FROM 'encerrada' THEN
    NEW.encerrada_em := COALESCE(NEW.encerrada_em, NOW());
    NEW.modo := 'audio';
    UPDATE public.live_convites
    SET revogado = TRUE, updated_at = NOW()
    WHERE live_id = NEW.id AND revogado = FALSE;
    UPDATE public.live_participantes
    SET saiu_em = COALESCE(saiu_em, NOW()), updated_at = NOW()
    WHERE live_id = NEW.id AND saiu_em IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS live_encerrar_invalida_convites ON public.live_rooms;
CREATE TRIGGER live_encerrar_invalida_convites
  BEFORE UPDATE ON public.live_rooms
  FOR EACH ROW EXECUTE FUNCTION public.live_encerrar_invalida_convites();

CREATE OR REPLACE FUNCTION public.update_live_convites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_convites_updated_at ON public.live_convites;
CREATE TRIGGER update_live_convites_updated_at
  BEFORE UPDATE ON public.live_convites
  FOR EACH ROW EXECUTE FUNCTION public.update_live_convites_updated_at();

-- ------------------------------------------------------------
-- FunÃ§Ã£o server-side (SECURITY DEFINER) para validar e consumir
-- um convite. Usada pelas Route Handlers com service role.
-- Retorna o id da live quando o convite Ã© vÃ¡lido.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_convite_validar(p_token_hash TEXT)
RETURNS TABLE (
  live_id UUID,
  convite_id UUID,
  nome_exibicao TEXT,
  status TEXT,
  modo TEXT,
  titulo TEXT,
  descricao TEXT,
  anfitriao_nome TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite public.live_convites%ROWTYPE;
  v_live public.live_rooms%ROWTYPE;
BEGIN
  SELECT * INTO v_convite FROM public.live_convites WHERE token_hash = p_token_hash;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'convite_inexistente';
  END IF;

  IF v_convite.revogado THEN
    RAISE EXCEPTION 'convite_revogado';
  END IF;

  IF v_convite.expira_em <= NOW() THEN
    RAISE EXCEPTION 'convite_expirado';
  END IF;

  IF v_convite.limite_acessos IS NOT NULL AND v_convite.acessos >= v_convite.limite_acessos THEN
    RAISE EXCEPTION 'limite_acessos';
  END IF;

  SELECT * INTO v_live FROM public.live_rooms WHERE id = v_convite.live_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'convite_inexistente';
  END IF;

  IF v_live.status = 'encerrada' THEN
    RAISE EXCEPTION 'live_encerrada';
  END IF;

  RETURN QUERY
    SELECT
      v_live.id,
      v_convite.id,
      '',
      v_live.status,
      v_live.modo,
      v_live.titulo,
      v_live.descricao,
      COALESCE((SELECT p.nome FROM public.profiles p WHERE p.id = v_live.anfitriao_id), 'AnfitriÃ£o');
END;
$$;

REVOKE ALL ON FUNCTION public.live_convite_validar(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_convite_validar(TEXT) TO service_role;

-- Registra o acesso e incrementa o contador (uma Ãºnica vez por entrada)
CREATE OR REPLACE FUNCTION public.live_convite_registrar_acesso(
  p_token_hash TEXT,
  p_nome_exibicao TEXT,
  p_user_agent TEXT,
  p_ip_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_convite public.live_convites%ROWTYPE;
  v_acesso_id UUID;
BEGIN
  SELECT * INTO v_convite
  FROM public.live_convites
  WHERE token_hash = p_token_hash
    AND revogado = FALSE
    AND expira_em > NOW()
    AND (limite_acessos IS NULL OR acessos < limite_acessos)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.live_convites
  SET acessos = acessos + 1, ultimo_acesso_em = NOW()
  WHERE id = v_convite.id;

  INSERT INTO public.live_convite_acessos (convite_id, nome_exibicao, user_agent, ip_hash)
  VALUES (v_convite.id, left(COALESCE(p_nome_exibicao, ''), 80), left(COALESCE(p_user_agent, ''), 300), COALESCE(p_ip_hash, ''))
  RETURNING id INTO v_acesso_id;

  -- Registro do convidado na sala, sem cadeira e somente ouvinte.
  -- Reentradas no mesmo link atualizam o mesmo registro em vez de
  -- criar um novo participante.
  INSERT INTO public.live_participantes (live_id, convidado_hash, nome_exibicao, tipo)
  VALUES (v_convite.live_id, p_token_hash, left(COALESCE(p_nome_exibicao, ''), 80), 'convidado')
  ON CONFLICT (live_id, convidado_hash) WHERE convidado_hash IS NOT NULL AND saiu_em IS NULL
  DO UPDATE SET
    nome_exibicao = EXCLUDED.nome_exibicao,
    saiu_em = NULL,
    last_seen_at = NOW();

  RETURN v_acesso_id;
END;
$$;

REVOKE ALL ON FUNCTION public.live_convite_registrar_acesso(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_convite_registrar_acesso(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.live_convites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_convite_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_chat_mensagens ENABLE ROW LEVEL SECURITY;

-- live_convites: visÃ­vel e gerenciÃ¡vel APENAS pelo anfitriÃ£o
DROP POLICY IF EXISTS "Anfitriao ve os convites" ON public.live_convites;
CREATE POLICY "Anfitriao ve os convites"
  ON public.live_convites FOR SELECT
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

DROP POLICY IF EXISTS "Anfitriao cria convite" ON public.live_convites;
CREATE POLICY "Anfitriao cria convite"
  ON public.live_convites FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND criado_por = auth.uid()
    AND public.live_e_anfitriao(live_id)
  );

DROP POLICY IF EXISTS "Anfitriao gerencia convite" ON public.live_convites;
CREATE POLICY "Anfitriao gerencia convite"
  ON public.live_convites FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id))
  WITH CHECK (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

DROP POLICY IF EXISTS "Anfitriao remove convite" ON public.live_convites;
CREATE POLICY "Anfitriao remove convite"
  ON public.live_convites FOR DELETE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

-- live_convite_acessos: somente o anfitriÃ£o
DROP POLICY IF EXISTS "Anfitriao ve os acessos" ON public.live_convite_acessos;
CREATE POLICY "Anfitriao ve os acessos"
  ON public.live_convite_acessos FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND public.live_e_anfitriao(
      (SELECT c.live_id FROM public.live_convites c WHERE c.id = convite_id)
    )
  );

-- live_chat_mensagens
DROP POLICY IF EXISTS "Leio o chat da sala" ON public.live_chat_mensagens;
CREATE POLICY "Leio o chat da sala"
  ON public.live_chat_mensagens FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      public.live_e_anfitriao(live_id)
      OR public.live_participa(live_id)
      OR public.live_aberta(live_id)
    )
  );

-- Escrevo mensagens como eu mesmo, nunca em nome de terceiro
DROP POLICY IF EXISTS "Envio mensagem" ON public.live_chat_mensagens;
CREATE POLICY "Envio mensagem"
  ON public.live_chat_mensagens FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND autor_usuario_id = auth.uid()
    AND autor_convidado_hash IS NULL
    AND public.live_participa(live_id)
    AND tipo = 'texto'
  );

-- Mensagens nÃ£o podem ser editadas nem apagadas por ninguÃ©m
DROP POLICY IF EXISTS "Ninguem altera o chat" ON public.live_chat_mensagens;
CREATE POLICY "Ninguem altera o chat"
  ON public.live_chat_mensagens FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Ninguem apaga o chat" ON public.live_chat_mensagens;
CREATE POLICY "Ninguem apaga o chat"
  ON public.live_chat_mensagens FOR DELETE
  USING (FALSE);

COMMIT;

-- ============================================================

-- 20261002000002  (20261002000002_create_live_presentes.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ (FASE 6)
-- Categorias, presentes e envios.
--
-- IMPORTANTE: o presente representa uma FAIXA DE CRÃ‰DITO
-- associada a quem estÃ¡ na cadeira. NÃƒO Ã© transferÃªncia
-- financeira, nÃ£o Ã© saldo, nÃ£o Ã© pagamento. NÃ£o existe
-- carteira nem integraÃ§Ã£o com gateway neste mÃ³dulo.
-- ============================================================

-- ------------------------------------------------------------
-- live_presentes_categorias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_presentes_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT NOT NULL DEFAULT '',
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS live_presentes_categorias_ordem_idx
  ON public.live_presentes_categorias (ordem, nome);

-- Subcategorias de SERVIÃ‡OS (SaÃºde, EstÃ©tica, EducaÃ§Ã£o, Cursos, Outros)
CREATE TABLE IF NOT EXISTS public.live_presentes_subcategorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.live_presentes_categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (categoria_id, slug)
);

CREATE INDEX IF NOT EXISTS live_presentes_subcategorias_categoria_id_idx
  ON public.live_presentes_subcategorias (categoria_id, ordem);

-- ------------------------------------------------------------
-- live_presentes  (cadastro administrÃ¡vel â€” nada hard-coded no app)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_presentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.live_presentes_categorias(id) ON DELETE RESTRICT,
  subcategoria_id UUID REFERENCES public.live_presentes_subcategorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  -- RepresentaÃ§Ã£o de crÃ©dito. NÃƒO Ã© valor financeiro.
  valor_credito NUMERIC(12, 2) NOT NULL CHECK (valor_credito >= 0),
  imagem_path TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- O nome do presente Ã© Ãºnico dentro da categoria: evita duas
  -- faixas de crÃ©dito iguais registradas para o mesmo grupo.
  CONSTRAINT live_presentes_categoria_nome_unico UNIQUE (categoria_id, nome)
);

CREATE INDEX IF NOT EXISTS live_presentes_categoria_id_idx
  ON public.live_presentes (categoria_id, ordem);

CREATE INDEX IF NOT EXISTS live_presentes_ativo_idx
  ON public.live_presentes (ativo);

-- ------------------------------------------------------------
-- live_presentes_envios
-- Snapshot de valor e categoria no momento do envio:
-- desativar ou editar um presente NÃƒO altera o histÃ³rico.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_presentes_envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  presente_id UUID REFERENCES public.live_presentes(id) ON DELETE SET NULL,
  categoria_id UUID REFERENCES public.live_presentes_categorias(id) ON DELETE SET NULL,
  categoria_nome TEXT NOT NULL DEFAULT '',
  presente_nome TEXT NOT NULL DEFAULT '',
  remetente_usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  remetente_convidado_hash TEXT,
  destinatario_participante_id UUID NOT NULL REFERENCES public.live_participantes(id) ON DELETE CASCADE,
  valor_credito_representado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT live_presentes_envios_origem_check CHECK (
    (remetente_usuario_id IS NOT NULL AND remetente_convidado_hash IS NULL) OR
    (remetente_usuario_id IS NULL AND remetente_convidado_hash IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS live_presentes_envios_live_id_idx
  ON public.live_presentes_envios (live_id, created_at DESC);

CREATE INDEX IF NOT EXISTS live_presentes_envios_destinatario_idx
  ON public.live_presentes_envios (destinatario_participante_id, created_at DESC);

-- ------------------------------------------------------------
-- Triggers updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_live_presentes_categorias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_presentes_categorias_updated_at ON public.live_presentes_categorias;
CREATE TRIGGER update_live_presentes_categorias_updated_at
  BEFORE UPDATE ON public.live_presentes_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_live_presentes_categorias_updated_at();

CREATE OR REPLACE FUNCTION public.update_live_presentes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_presentes_updated_at ON public.live_presentes;
CREATE TRIGGER update_live_presentes_updated_at
  BEFORE UPDATE ON public.live_presentes
  FOR EACH ROW EXECUTE FUNCTION public.update_live_presentes_updated_at();

DROP TRIGGER IF EXISTS update_live_presentes_subcategorias_updated_at ON public.live_presentes_subcategorias;
CREATE TRIGGER update_live_presentes_subcategorias_updated_at
  BEFORE UPDATE ON public.live_presentes_subcategorias
  FOR EACH ROW EXECUTE FUNCTION public.update_live_presentes_updated_at();

-- ------------------------------------------------------------
-- Garantia: sÃ³ Ã© possÃ­vel enviar presente para quem estÃ¡ EM CADEIRA
-- (a regra Ã© do banco, nÃ£o apenas da interface).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_presentes_destinatario_em_cadeira()
RETURNS TRIGGER AS $$
DECLARE
  v_em_cadeira BOOLEAN;
BEGIN
  SELECT (cadeira IS NOT NULL AND saiu_em IS NULL) INTO v_em_cadeira
  FROM public.live_participantes
  WHERE id = NEW.destinatario_participante_id
    AND live_id = NEW.live_id;

  IF v_em_cadeira IS NOT TRUE THEN
    RAISE EXCEPTION 'destinatario_fora_da_cadeira'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS live_presentes_destinatario_em_cadeira ON public.live_presentes_envios;
CREATE TRIGGER live_presentes_destinatario_em_cadeira
  BEFORE INSERT ON public.live_presentes_envios
  FOR EACH ROW EXECUTE FUNCTION public.live_presentes_destinatario_em_cadeira();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.live_presentes_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presentes_subcategorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_presentes_envios ENABLE ROW LEVEL SECURITY;

-- Categorias -------------------------------------------------------------
-- Participantes veem sÃ³ o que estÃ¡ ativo; o admin enxerga tambÃ©m os
-- registros desativados, para poder reativÃ¡-los.
DROP POLICY IF EXISTS "Autenticados veem categorias ativas" ON public.live_presentes_categorias;
CREATE POLICY "Autenticados veem categorias ativas"
  ON public.live_presentes_categorias FOR SELECT
  USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin()));

DROP POLICY IF EXISTS "Somente admin gerencia categorias" ON public.live_presentes_categorias;
CREATE POLICY "Somente admin gerencia categorias"
  ON public.live_presentes_categorias FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

-- Subcategorias ----------------------------------------------------------
DROP POLICY IF EXISTS "Autenticados veem subcategorias ativas" ON public.live_presentes_subcategorias;
CREATE POLICY "Autenticados veem subcategorias ativas"
  ON public.live_presentes_subcategorias FOR SELECT
  USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin()));

DROP POLICY IF EXISTS "Somente admin gerencia subcategorias" ON public.live_presentes_subcategorias;
CREATE POLICY "Somente admin gerencia subcategorias"
  ON public.live_presentes_subcategorias FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

-- Presentes --------------------------------------------------------------
DROP POLICY IF EXISTS "Autenticados veem presentes ativos" ON public.live_presentes;
CREATE POLICY "Autenticados veem presentes ativos"
  ON public.live_presentes FOR SELECT
  USING (auth.role() = 'authenticated' AND (ativo = TRUE OR public.is_admin()));

DROP POLICY IF EXISTS "Somente admin gerencia presentes" ON public.live_presentes;
CREATE POLICY "Somente admin gerencia presentes"
  ON public.live_presentes FOR ALL
  USING (auth.role() = 'authenticated' AND public.is_admin())
  WITH CHECK (auth.role() = 'authenticated' AND public.is_admin());

-- Envios -----------------------------------------------------------------
DROP POLICY IF EXISTS "Leio os presentes da sala" ON public.live_presentes_envios;
CREATE POLICY "Leio os presentes da sala"
  ON public.live_presentes_envios FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      public.live_e_anfitriao(live_id)
      OR public.live_participa(live_id)
      OR public.live_aberta(live_id)
    )
  );

DROP POLICY IF EXISTS "Envio presente em meu nome" ON public.live_presentes_envios;
CREATE POLICY "Envio presente em meu nome"
  ON public.live_presentes_envios FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (
      (remetente_usuario_id = auth.uid() AND remetente_convidado_hash IS NULL)
      OR public.live_e_anfitriao(live_id)
    )
    AND public.live_participa(live_id)
  );

-- Envios sÃ£o imutÃ¡veis (preserva o histÃ³rico e o indicador)
DROP POLICY IF EXISTS "Ninguem altera envios" ON public.live_presentes_envios;
CREATE POLICY "Ninguem altera envios"
  ON public.live_presentes_envios FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Ninguem apaga envios" ON public.live_presentes_envios;
CREATE POLICY "Ninguem apaga envios"
  ON public.live_presentes_envios FOR DELETE
  USING (FALSE);

-- ============================================================
-- SEED â€” categorias e valores iniciais (editÃ¡veis no admin)
-- ============================================================

INSERT INTO public.live_presentes_categorias (nome, slug, emoji, ordem, ativo)
VALUES
  ('Motors / VeÃ­culos', 'motors', 'ðŸš—', 1, TRUE),
  ('Motos', 'motos', 'ðŸï¸', 2, TRUE),
  ('Lar / ImÃ³veis', 'lar', 'ðŸ ', 3, TRUE),
  ('ServiÃ§os', 'servicos', 'ðŸ› ï¸', 4, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  emoji = EXCLUDED.emoji,
  ordem = EXCLUDED.ordem;

INSERT INTO public.live_presentes_subcategorias (categoria_id, nome, slug, ordem, ativo)
SELECT c.id, s.nome, s.slug, s.ordem, TRUE
FROM public.live_presentes_categorias c
CROSS JOIN (
  VALUES
    ('SaÃºde', 'saude', 1),
    ('EstÃ©tica', 'estetica', 2),
    ('EducaÃ§Ã£o', 'educacao', 3),
    ('Cursos', 'cursos', 4),
    ('Outros', 'outros', 5)
) AS s(nome, slug, ordem)
WHERE c.slug = 'servicos'
ON CONFLICT (categoria_id, slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem;

-- Valores de crÃ©dito representÃ¡veis: de R$ 1.000 a R$ 1.000.000.
-- O ID Ã© derivado de md5(categoria + valor) e o conflito Ã© resolvido
-- por (categoria, nome): reexecutar a migration nÃ£o duplica linhas
-- nem sobrescreve ajustes feitos no admin.
-- Um registro por faixa, aplicado a todas as categorias.
INSERT INTO public.live_presentes (id, categoria_id, nome, valor_credito, imagem_path, ativo, ordem)
SELECT
  md5(c.slug || '-' || v.valor::text)::uuid,
  c.id,
  'R$ ' || to_char(v.valor, 'FM999,999,999'),
  v.valor,
  '',
  TRUE,
  (row_number() OVER (ORDER BY v.valor))::int
FROM public.live_presentes_categorias c
CROSS JOIN (
  VALUES
    (1000::numeric), (2000), (3000), (4000), (5000),
    (10000), (20000), (30000), (40000), (50000),
    (60000), (70000), (80000), (90000), (100000),
    (200000), (300000), (400000), (500000), (600000),
    (700000), (800000), (900000), (1000000)
) AS v(valor)
WHERE c.ativo = TRUE
ON CONFLICT (categoria_id, nome) DO NOTHING;

COMMIT;

-- ============================================================

-- 20261002000003  (20261002000003_create_live_apresentacoes.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ (FASE 8)
-- ApresentaÃ§Ã£o: PDF, vÃ­deo e compartilhamento de tela.
-- O arquivo reaproveita a infraestrutura de anexos existente
-- (bucket privado "anexos" + tabela public.anexos), com
-- entity_type = 'live_apresentacao'.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_apresentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'pdf' CHECK (tipo IN ('pdf', 'video', 'screen')),
  -- Reaproveita a tabela genÃ©rica de anexos do sistema
  anexo_id UUID REFERENCES public.anexos(id) ON DELETE SET NULL,
  caminho TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  titulo TEXT NOT NULL DEFAULT '',
  pagina_atual INTEGER NOT NULL DEFAULT 1 CHECK (pagina_atual >= 1),
  total_paginas INTEGER NOT NULL DEFAULT 0 CHECK (total_paginas >= 0),
  -- SincronizaÃ§Ã£o de reproduÃ§Ã£o de vÃ­deo (evita que cada
  -- espectador rode seu prÃ³prio Ã¡udio/posiÃ§Ã£o)
  reproduzindo BOOLEAN NOT NULL DEFAULT FALSE,
  tempo_atual_segundos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrada_em TIMESTAMPTZ,
  iniciado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Compartilhamento de tela nÃ£o tem arquivo: o conteÃºdo vem do
  -- track de tela do LiveKit.
  CONSTRAINT live_apresentacoes_tela_sem_arquivo_check CHECK (
    tipo <> 'screen' OR caminho = ''
  )
);

CREATE INDEX IF NOT EXISTS live_apresentacoes_live_id_idx
  ON public.live_apresentacoes (live_id, encerrada_em);

-- A sala tem no mÃ¡ximo UMA apresentaÃ§Ã£o aberta. ComeÃ§ar outra
-- exige encerrar a anterior, o que garante que a sincronizaÃ§Ã£o de
-- pÃ¡gina e de reproduÃ§Ã£o nÃ£o divirjam entre participantes.
CREATE UNIQUE INDEX IF NOT EXISTS live_apresentacoes_ativa_unica
  ON public.live_apresentacoes (live_id)
  WHERE encerrada_em IS NULL;

-- ------------------------------------------------------------
-- Trigger updated_at
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_live_apresentacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_live_apresentacoes_updated_at ON public.live_apresentacoes;
CREATE TRIGGER update_live_apresentacoes_updated_at
  BEFORE UPDATE ON public.live_apresentacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_live_apresentacoes_updated_at();

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.live_apresentacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leio a apresentacao da sala" ON public.live_apresentacoes;
CREATE POLICY "Leio a apresentacao da sala"
  ON public.live_apresentacoes FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      public.live_e_anfitriao(live_id)
      OR public.live_participa(live_id)
      OR public.live_aberta(live_id)
    )
  );

-- Somente o anfitriÃ£o inicia, controla pÃ¡ginas e encerra
DROP POLICY IF EXISTS "Anfitriao inicia apresentacao" ON public.live_apresentacoes;
CREATE POLICY "Anfitriao inicia apresentacao"
  ON public.live_apresentacoes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.live_e_anfitriao(live_id)
    AND iniciado_por = auth.uid()
  );

DROP POLICY IF EXISTS "Anfitriao controla apresentacao" ON public.live_apresentacoes;
CREATE POLICY "Anfitriao controla apresentacao"
  ON public.live_apresentacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id))
  WITH CHECK (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

DROP POLICY IF EXISTS "Anfitriao encerra apresentacao" ON public.live_apresentacoes;
CREATE POLICY "Anfitriao encerra apresentacao"
  ON public.live_apresentacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

COMMIT;

-- ============================================================

-- 20261002000004  (20261002000004_live_permissions_and_visibility.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ
-- PermissÃµes (cÃ³digos live.*) e visibilidade do menu
-- ============================================================

INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  ('live.acessar',            'Acessar Live de Voz',        'Live de Voz', 'Ver o mÃ³dulo e entrar nas lives'),
  ('live.iniciar',            'Iniciar Live',               'Live de Voz', 'Criar uma live e tornÃ¡-la anfitriÃ£o'),
  ('live.encerrar',           'Encerrar Live',              'Live de Voz', 'Encerrar a prÃ³pria live'),
  ('live.convidar',           'Gerar Links de Convite',     'Live de Voz', 'Gerar e revogar links temporÃ¡rios para convidados'),
  ('live.participar',         'Participar da Live',         'Live de Voz', 'Solicitar e ocupar cadeira'),
  ('live.presentear',         'Apresentar',                 'Live de Voz', 'Iniciar apresentaÃ§Ã£o em vÃ­deo, tela, PDF ou vÃ­deo'),
  ('live.chat',               'Participar do Chat',         'Live de Voz', 'Enviar mensagens no chat da live'),
  ('live.presentes.enviar',   'Enviar Presentes',           'Live de Voz', 'Enviar presentes para quem estÃ¡ em cadeira'),
  ('live.presentes.gerenciar','Gerenciar Presentes',        'Live de Voz', 'Criar categorias, presentes, imagens e valores')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao;

-- Concede o uso do mÃ³dulo a todos os perfis do sistema.
-- Quem pode iniciar uma Live nÃ£o Ã© uma permissÃ£o estÃ¡tica: o poder
-- de anfitriÃ£o vem de `live_rooms.anfitriao_id`, preenchido pelo
-- servidor e imutÃ¡vel para quem nÃ£o Ã© o dono da sala.
-- `live.presentes.gerenciar` NÃƒO Ã© concedido aqui: continua
-- restrito ao Administrador (is_admin() na RLS).
INSERT INTO public.user_permission_grants (usuario_id, permissao_id)
SELECT u.id, p.id
FROM public.profiles u
CROSS JOIN public.user_permissions p
WHERE p.codigo IN (
  'live.acessar',
  'live.iniciar',
  'live.encerrar',
  'live.convidar',
  'live.participar',
  'live.presentear',
  'live.chat',
  'live.presentes.enviar'
)
  AND u.ativo = TRUE
ON CONFLICT (usuario_id, permissao_id) DO NOTHING;

-- Concede a visibilidade do mÃ³dulo a todos os perfis do sistema.
-- As permissÃµes de controle continuam sendo checadas em cÃ³digo
-- (hasPermission) e no banco (is_admin / live_e_anfitriao).
INSERT INTO public.module_visibility (perfil, modulo, href, titulo, visivel)
SELECT p.perfil, 'Live de Voz', '/live-voz', 'Live de Voz', TRUE
FROM (
  VALUES
    ('Administrador'::text),
    ('Gestor'::text),
    ('Consultor'::text),
    ('Trainee'::text),
    ('Secretaria'::text),
    ('Indicador'::text),
    ('Assistente'::text)
) AS p(perfil)
ON CONFLICT (perfil, modulo) DO UPDATE SET
  href = EXCLUDED.href,
  titulo = EXCLUDED.titulo,
  visivel = TRUE;

COMMIT;

-- ============================================================

-- 20261002000005  (20261002000005_live_realtime_publication.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ â€” Realtime
-- Habilita a publicaÃ§Ã£o das tabelas do mÃ³dulo no Supabase Realtime
-- (o projeto nÃ£o tinha nenhuma tabela publicada atÃ© aqui).
-- ============================================================

ALTER TABLE public.live_rooms            REPLICA IDENTITY FULL;
ALTER TABLE public.live_participantes    REPLICA IDENTITY FULL;
ALTER TABLE public.live_solicitacoes      REPLICA IDENTITY FULL;
ALTER TABLE public.live_chat_mensagens    REPLICA IDENTITY FULL;
ALTER TABLE public.live_presentes_envios  REPLICA IDENTITY FULL;
ALTER TABLE public.live_apresentacoes    REPLICA IDENTITY FULL;

DO $$
DECLARE
  t TEXT;
  tabela TEXT;
BEGIN
  FOREACH tabela IN ARRAY ARRAY[
    'live_rooms', 'live_participantes', 'live_solicitacoes',
    'live_chat_mensagens', 'live_presentes_envios', 'live_apresentacoes'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tabela
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tabela);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ============================================================

-- 20261002000006  (20261002000006_fix_live_participantes_guard.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ â€” CORREÃ‡ÃƒO
--
-- Encerrar uma sala com visitante convidado falhava com
--   42501 "Somente o anfitriao pode alterar assento, tipo ou bloqueio."
--
-- Causa: ao encerrar, a trigger `live_encerrar_invalida_convites` faz
--   UPDATE public.live_participantes SET saiu_em = NOW()
-- o que dispara `live_participantes_proteger_campos`. O guard usava
--
--   IF NEW.usuario_id IS NOT DISTINCT FROM auth.uid() THEN
--
-- e, em qualquer contexto SEM usuÃ¡rio autenticado (service_role,
-- job de manutenÃ§Ã£o, webhook), `auth.uid()` Ã© NULL. Como a linha do
-- convidado tem `usuario_id` NULL, a comparaÃ§Ã£o `NULL IS NOT DISTINCT
-- FROM NULL` Ã© TRUE e o guard disparava, abortando o encerramento.
--
-- A correÃ§Ã£o NÃƒO enfraquece a seguranÃ§a: com service_role a RLS jÃ¡ Ã©
-- ignorada por definiÃ§Ã£o, entÃ£o o guard nunca protegeu esse caminho.
-- Ele continua valendo integralmente para chamadas autenticadas, que Ã©
-- o Ãºnico cenÃ¡rio que precisa ser protegido.
-- ============================================================

CREATE OR REPLACE FUNCTION public.live_participantes_proteger_campos()
RETURNS TRIGGER AS $$
BEGIN
  -- OperaÃ§Ãµes de sistema (sem sessÃ£o): RLS jÃ¡ nÃ£o se aplica a elas.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convidados externos nÃ£o tÃªm usuÃ¡rio: a linha nunca pertence a
  -- quem estÃ¡ chamando, entÃ£o nÃ£o hÃ¡ o que proteger aqui.
  IF NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.usuario_id = auth.uid() AND NOT public.live_e_anfitriao(NEW.live_id) THEN
    IF NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.cadeira IS DISTINCT FROM OLD.cadeira
       OR NEW.bloqueado IS DISTINCT FROM OLD.bloqueado
       OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
       OR NEW.convidado_hash IS DISTINCT FROM OLD.convidado_hash
       OR NEW.saiu_em IS DISTINCT FROM OLD.saiu_em THEN
      RAISE EXCEPTION 'Somente o anfitriao pode alterar assento, tipo ou bloqueio.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;

-- ============================================================

-- 20261002000007  (20261002000007_live_audio_moderation.sql.sql)
-- ============================================================
BEGIN;

-- ============================================================
-- MÃ“DULO: LIVE DE VOZ â€” MODERAÃ‡ÃƒO DE ÃUDIO
--
-- 1. `silenciado_pelo_anfitriao`: estado de mute IMPOSTO pelo
--    anfitriÃ£o, distinto de `microfone_ativo`, que Ã© o que o
--    prÃ³prio participante realmente publikou.
--
--    Sem essa separaÃ§Ã£o o painel mentia: o anfitriÃ£o via
--    "microfone desligado" enquanto o Ã¡udio continuava no SFU.
--    O cliente do participante lÃª esta flag e desliga o prÃ³prio
--    track de verdade; sÃ³ aÃ­ o Ã­cone do painel reflete a
--    realidade.
--
-- 2. PermissÃ£o `live.audio.controlar` para amarrar o controle de
--    Ã¡udio Ã  hierarquia de acesso, e polÃ­tica que permite ao
--    anfitriÃ£o OU ao Administrador alterar a sala.
--
-- 3. A trigger de proteÃ§Ã£o passa a incluir a nova coluna: o
--    participante pode gravar `microfone_ativo`, mas NÃƒO pode
--    limpar `silenciado_pelo_anfitriao` sozinho. Sem isso o mute
--    seria contornÃ¡vel com uma chamada direta Ã  API.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Coluna de mute imposto
-- ------------------------------------------------------------
ALTER TABLE public.live_participantes
  ADD COLUMN IF NOT EXISTS silenciado_pelo_anfitriao BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- 2. PermissÃ£o de controle de Ã¡udio
--
-- Concedida a todos os perfis ativos, como as demais `live.*`: o
-- que restringe a aÃ§Ã£o nÃ£o Ã© a permissÃ£o isolada, e sim a
-- combinaÃ§Ã£o "permissÃ£o + ser o anfitriÃ£o da sala" checada na
-- interface, e "anfitriÃ£o OU administrador" checada na RLS abaixo.
-- O Gestor nÃ£o entra na lista de restriÃ§Ãµes do `usePermissions`
-- para este cÃ³digo, entÃ£o tambÃ©m pode controlled a prÃ³pria sala.
-- ------------------------------------------------------------
INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  ('live.audio.controlar', 'Controlar Ã¡udio da sala', 'Live de Voz',
   'Silenciar o Ã¡udio da apresentaÃ§Ã£o para todos ou para cadeiras especÃ­ficas')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao;

INSERT INTO public.user_permission_grants (usuario_id, permissao_id)
SELECT u.id, p.id
FROM public.profiles u
CROSS JOIN public.user_permissions p
WHERE p.codigo = 'live.audio.controlar'
  AND u.ativo = TRUE
ON CONFLICT (usuario_id, permissao_id) DO NOTHING;

-- ------------------------------------------------------------
-- 3. RLS: anfitriÃ£o da sala OU administrador
--
-- A policy "Anfitriao controla a sala" jÃ¡ cobre o anfitriÃ£o. Esta
-- acrescenta o Administrador, que precisa poder intervir em uma
-- sala de outro usuÃ¡rio sem precisar abrir uma sala nova.
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Anfitriao ou admin controla a sala" ON public.live_participantes;
CREATE POLICY "Anfitriao ou admin controla a sala"
  ON public.live_participantes FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND (public.live_e_anfitriao(live_id) OR public.is_admin())
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.live_e_anfitriao(live_id) OR public.is_admin())
  );

-- ------------------------------------------------------------
-- 4. A coluna de mute entra na trigger de proteÃ§Ã£o
--
-- Sem esta linha o participante poderia enviar
-- `{"silenciado_pelo_anfitriao": false}` na prÃ³pria linha e
-- burlar o mute do anfitriÃ£o sem tocar no LiveKit.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_participantes_proteger_campos()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.usuario_id = auth.uid() AND NOT public.live_e_anfitriao(NEW.live_id) THEN
    IF NEW.tipo IS DISTINCT FROM OLD.tipo
       OR NEW.cadeira IS DISTINCT FROM OLD.cadeira
       OR NEW.bloqueado IS DISTINCT FROM OLD.bloqueado
       OR NEW.usuario_id IS DISTINCT FROM OLD.usuario_id
       OR NEW.convidado_hash IS DISTINCT FROM OLD.convidado_hash
       OR NEW.saiu_em IS DISTINCT FROM OLD.saiu_em
       OR NEW.silenciado_pelo_anfitriao IS DISTINCT FROM OLD.silenciado_pelo_anfitriao THEN
      RAISE EXCEPTION 'Somente o anfitriao pode alterar assento, tipo, bloqueio ou silencio.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ------------------------------------------------------------
-- 5. Realtime: a coluna precisa chegar ao painel do anfitriÃ£o
--    e ao cliente do participante.
-- ------------------------------------------------------------
ALTER TABLE public.live_participantes REPLICA IDENTITY FULL;

COMMIT;

-- ============================================================

-- 20261002000008  (20261002000008_create_credito_investimento.sql.sql)
-- ============================================================
BEGIN;
-- Migration: create credito investimento module tables
-- Objetivo: modulo comercial de Credito Investimento com pipeline, playbooks de atendimento,
--           motor de mensagens WhatsApp e automacao de tarefas.

-- ============================================================
-- 1. TIPOS E ENUMS
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
-- 2. TABELAS
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
COMMIT;

-- ============================================================

-- 20261002000009  (20261002000009_credito_investimento_incremental.sql)
-- ============================================================
BEGIN;
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
COMMIT;

-- ============================================================

-- 20261107000010  (20261107000010_fix_credito_investimento.sql)
-- ============================================================
BEGIN;
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
COMMIT;

-- ============================================================

-- 20261108000011  (20261108000011_expand_cargos_e_permissoes.sql)
-- ============================================================
-- Migration: 20261108000011_expand_cargos_e_permissoes.sql
-- Objetivo: expandir cargos e permissoes do sistema hierarquico.
-- Principio: apenas adicionar o que esta ausente. Nao DROP CASCADE. Nao apagar dados.
--           Nao alterar o modulo Credito Investimento. Preservar marked_id.
-- Compatibilidade: 10 perfis (Administrador, Gestor Pleno, Gestor, Consultor Pleno,
--           Consultor, Consultor em prÃ©via, LÃ­der em treinamento, Indicador, Trainee, Secretaria).
-- AUTossuficiente: cria tabelas ausentes e os dez presets, se as migrations anteriores nao foram aplicadas.

BEGIN;

-- ============================================================
-- 0. GARANTIR QUE TABELAS BASE EXISTEM (caso migrations anteriores nao tenham sido aplicadas)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permission_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permission_preset_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES public.permission_presets(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES public.user_permissions(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 0,
  UNIQUE(preset_id, permissao_id)
);

-- ============================================================
-- 1. DEZ PRESETS (todos cadastrados com ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.permission_presets (nome, descricao, categoria)
VALUES
  ('Administrador', 'Acesso total ao sistema', 'Administracao'),
  ('Gestor Pleno', 'Gestao operacional ampliada, sem configuracoes estruturais', 'Gerencia'),
  ('Gestor', 'Gerenciamento de equipe e indicadores', 'Gerencia'),
  ('Consultor Pleno', 'Autonomia operacional ampliada', 'Comercial'),
  ('Consultor', 'Operacoes de vendas e atendimento', 'Comercial'),
  ('Consultor em previa', 'Acesso operacional restrito', 'Comercial'),
  ('Lider em treinamento', 'Acesso limitado de desenvolvimento', 'Gerencia'),
  ('Indicador', 'Acesso inicial restrito', 'Comercial'),
  ('Trainee', 'Legado, equivalente a Consultor em previa', 'Comercial'),
  ('Secretaria', 'Apoio operacional, matriz independente', 'Administrativo')
ON CONFLICT (nome) DO NOTHING;

-- ============================================================
-- 2. PERMISSÃ•ES AUSENTES NA TABELA user_permissions
-- CÃ³digos referenciados por src/lib/auth-user.ts que ainda nÃ£o existem.
-- ============================================================

INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  -- Metas
  ('metas.excluir', 'Excluir Metas', 'Metas', 'Excluir metas de venda'),

  -- Usuarios / hierarquia
  ('usuarios.promover_admin', 'Promover para Administrador', 'Usuarios', 'Promover usuario ao perfil Administrador'),
  ('usuarios.alterar_gestor', 'Alterar Gestor do Usuario', 'Usuarios', 'Alterar o gestor responsavel por um usuario'),

  -- Seguranca / estrutura
  ('seguranca.global', 'Seguranca Global', 'Seguranca', 'Acesso a configuracoes de segurancas globais'),
  ('schema.alterar', 'Alterar Schema', 'Seguranca', 'Alterar estrutura do banco de dados'),
  ('rls.alterar', 'Alterar Policies RLS', 'Seguranca', 'Alterar polÃ­ticas de seguranca em nivel de linha'),

  -- Credito Investimento (modulo preservado â€” apenas registros de permissao)
  ('credito_investimento.visualizar', 'Ver Credito Investimento', 'Credito Investimento', 'Visualizar pipeline de credito'),
  ('credito_investimento.criar', 'Criar Credito Investimento', 'Credito Investimento', 'Criar novos registros de credito'),
  ('credito_investimento.editar', 'Editar Credito Investimento', 'Credito Investimento', 'Editar registros de credito existentes'),

  -- Links uteis
  ('links_uteis.visualizar', 'Ver Links Uteis', 'Links Uteis', 'Visualizar links uteis'),
  ('links_uteis.criar', 'Criar Links Uteis', 'Links Uteis', 'Criar links uteis'),
  ('links_uteis.editar', 'Editar Links Uteis', 'Links Uteis', 'Editar links uteis existentes'),

  -- Playbooks
  ('playbooks.visualizar', 'Ver Playbooks', 'Playbooks', 'Visualizar playbooks de atendimento'),
  ('playbooks.criar', 'Criar Playbooks', 'Playbooks', 'Criar playbooks de atendimento'),
  ('playbooks.editar', 'Editar Playbooks', 'Playbooks', 'Editar playbooks existentes'),

  -- Simulacoes
  ('simulacoes.visualizar', 'Ver Simulacoes', 'Simulacoes', 'Visualizar simulacoes de credito'),
  ('simulacoes.criar', 'Criar Simulacoes', 'Simulacoes', 'Criar simulacoes de credito'),
  ('simulacoes.editar', 'Editar Simulacoes', 'Simulacoes', 'Editar simulacoes existentes'),

  -- Reunioes
  ('reunioes.visualizar', 'Ver Reunioes', 'Reunioes', 'Visualizar reunioes agendadas'),
  ('reunioes.criar', 'Criar Reunioes', 'Reunioes', 'Criar novas reunioes'),
  ('reunioes.editar', 'Editar Reunioes', 'Reunioes', 'Editar reunioes existentes'),

  -- Tarefas
  ('tarefas.visualizar', 'Ver Tarefas', 'Tarefas', 'Visualizar tarefas'),
  ('tarefas.criar', 'Criar Tarefas', 'Tarefas', 'Criar novas tarefas'),
  ('tarefas.editar', 'Editar Tarefas', 'Tarefas', 'Editar tarefas existentes')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================
-- 3. VINCULACAO DE PERMISSOES AOS PRESETS (matriz intencionalmente definida para todos os dez cargos)
-- ============================================================

-- 3.1. Administrador â€” acesso total (24 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Administrador'
  AND up.codigo IN (
    'metas.excluir',
    'usuarios.promover_admin',
    'usuarios.alterar_gestor',
    'seguranca.global',
    'schema.alterar',
    'rls.alterar',
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.2. Gestor Pleno â€” gestao operacional ampliada (19 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Gestor Pleno'
  AND up.codigo IN (
    'metas.excluir',
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.3. Gestor â€” gerenciamento de equipe (19 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Gestor'
  AND up.codigo IN (
    'metas.excluir',
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.4. Consultor Pleno â€” autonomia operacional ampliada (19 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Consultor Pleno'
  AND up.codigo IN (
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'links_uteis.visualizar',
    'links_uteis.criar',
    'links_uteis.editar',
    'playbooks.visualizar',
    'playbooks.criar',
    'playbooks.editar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.5. Consultor â€” operacoes de vendas e atendimento (14 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Consultor'
  AND up.codigo IN (
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'playbooks.visualizar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.6. Consultor em previa â€” acesso operacional restrito (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Consultor em previa'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.7. Lider em treinamento â€” acesso limitado de desenvolvimento (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Lider em treinamento'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.8. Indicador â€” acesso inicial restrito (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Indicador'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.9. Trainee â€” legado, equivalente a Consultor em previa (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Trainee'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.10. Secretaria â€” apoio operacional, matriz independente (14 permissoes)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Secretaria'
  AND up.codigo IN (
    'credito_investimento.visualizar',
    'credito_investimento.criar',
    'credito_investimento.editar',
    'playbooks.visualizar',
    'simulacoes.visualizar',
    'simulacoes.criar',
    'simulacoes.editar',
    'reunioes.visualizar',
    'reunioes.criar',
    'reunioes.editar',
    'tarefas.visualizar',
    'tarefas.criar',
    'tarefas.editar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- ============================================================
-- 4. INDICES DE SUPORTE (somente se ausentes)
-- ============================================================

CREATE INDEX IF NOT EXISTS user_permissions_categoria_idx ON public.user_permissions (categoria);
CREATE INDEX IF NOT EXISTS permission_presets_nome_idx ON public.permission_presets (nome);
CREATE INDEX IF NOT EXISTS permission_preset_items_preset_id_idx ON public.permission_preset_items (preset_id);
CREATE INDEX IF NOT EXISTS permission_preset_items_permissao_id_idx ON public.permission_preset_items (permissao_id);

-- ============================================================
-- 5. SEGURANÃ‡A â€” ROW LEVEL SECURITY NAS TABELAS DE PRESETS
-- ============================================================

-- Habilitar RLS nas duas tabelas (nao depende de funcoes da migration 00003)
ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_preset_items ENABLE ROW LEVEL SECURITY;

-- Policies para permission_presets
DROP POLICY IF EXISTS "Authenticated users can view permission presets" ON public.permission_presets;
CREATE POLICY "Authenticated users can view permission presets"
  ON public.permission_presets FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can insert permission presets" ON public.permission_presets;
CREATE POLICY "Only admins can insert permission presets"
  ON public.permission_presets FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Only admins can update permission presets" ON public.permission_presets;
CREATE POLICY "Only admins can update permission presets"
  ON public.permission_presets FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete permission presets" ON public.permission_presets;
CREATE POLICY "Only admins can delete permission presets"
  ON public.permission_presets FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

-- Policies para permission_preset_items
DROP POLICY IF EXISTS "Authenticated users can view permission preset items" ON public.permission_preset_items;
CREATE POLICY "Authenticated users can view permission preset items"
  ON public.permission_preset_items FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can insert permission preset items" ON public.permission_preset_items;
CREATE POLICY "Only admins can insert permission preset items"
  ON public.permission_preset_items FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Only admins can update permission preset items" ON public.permission_preset_items;
CREATE POLICY "Only admins can update permission preset items"
  ON public.permission_preset_items FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete permission preset items" ON public.permission_preset_items;
CREATE POLICY "Only admins can delete permission preset items"
  ON public.permission_preset_items FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

COMMIT;

-- ============================================================

-- 20261108000012  (20261108000012_funcoes_auxiliares_hierarquia.sql)
-- ============================================================
-- Migration: 20261108000012_funcoes_auxiliares_hierarquia.sql
-- Objetivo: funÃ§Ãµes auxiliares de hierarquia (SECURITY DEFINER) para uso em
--           policies RLS e validaÃ§Ã£o server-side, evitando recursÃ£o RLS.
-- Principio: apenas criar funÃ§Ãµes novas. Nao alterar tabelas existentes.
--           Nao DROP CASCADE. Nao apagar dados.

BEGIN;

-- ============================================================
-- 1. FUNÃ‡ÃƒO: pode atribuir perfil (can_assign_profile)
-- Verifica se o usuÃ¡rio corrente pode atribuir um determinado perfil a outro usuÃ¡rio.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_assign_profile(
  p_current_user_id UUID,
  p_new_profile TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_perfil TEXT;
BEGIN
  -- Obter perfil do usuÃ¡rio corrente
  SELECT perfil INTO v_current_perfil FROM public.profiles WHERE id = p_current_user_id;

  IF v_current_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Administrador pode atribuir qualquer perfil
  IF v_current_perfil = 'Administrador' THEN
    RETURN TRUE;
  END IF;

  -- Nunca pode atribuir Administrador nem Gestor Pleno (exceto Administrador)
  IF p_new_profile IN ('Administrador', 'Gestor Pleno') THEN
    RETURN FALSE;
  END IF;

  -- Gestor Pleno pode atribuir: Gestor, Consultor Pleno, Consultor, Consultor em prÃ©via, LÃ­der em treinamento, Indicador
  IF v_current_perfil = 'Gestor Pleno' THEN
    RETURN p_new_profile IN (
      'Gestor', 'Consultor Pleno', 'Consultor', 'Consultor em prÃ©via', 'LÃ­der em treinamento', 'Indicador'
    );
  END IF;

  -- Gestor pode atribuir: Consultor, Consultor em prÃ©via, LÃ­der em treinamento, Indicador
  IF v_current_perfil = 'Gestor' THEN
    RETURN p_new_profile IN (
      'Consultor', 'Consultor em prÃ©via', 'LÃ­der em treinamento', 'Indicador'
    );
  END IF;

  -- Consultor Pleno pode atribuir: Consultor, Consultor em prÃ©via, Indicador
  IF v_current_perfil = 'Consultor Pleno' THEN
    RETURN p_new_profile IN ('Consultor', 'Consultor em prÃ©via', 'Indicador');
  END IF;

  -- Outros perfis nÃ£o podem atribuir
  RETURN FALSE;
END;
$$;

-- ============================================================
-- 2. FUNÃ‡ÃƒO: pode promover usuÃ¡rio (can_promote_to)
-- Verifica se o usuÃ¡rio corrente pode promover o usuÃ¡rio alvo para um novo perfil.
-- Impede auto-promoÃ§Ã£o e autoelevaÃ§Ã£o.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_promote_to(
  p_current_user_id UUID,
  p_target_user_id UUID,
  p_new_profile TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_perfil TEXT;
  v_target_rank INTEGER;
BEGIN
  -- NÃ£o permite auto-promoÃ§Ã£o
  IF p_current_user_id = p_target_user_id THEN
    RETURN FALSE;
  END IF;

  -- Verificar se pode atribuir o perfil
  IF NOT public.can_assign_profile(p_current_user_id, p_new_profile) THEN
    RETURN FALSE;
  END IF;

  -- Obter perfil atual do usuÃ¡rio alvo
  SELECT perfil INTO v_target_perfil FROM public.profiles WHERE id = p_target_user_id;

  IF v_target_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calcular ranks para verificar se Ã© promoÃ§Ã£o (rank deve aumentar)
  SELECT
    CASE v_target_perfil
      WHEN 'Gestor Pleno' THEN 95
      WHEN 'Gestor' THEN 90
      WHEN 'Consultor Pleno' THEN 80
      WHEN 'Consultor' THEN 70
      WHEN 'Consultor em prÃ©via' THEN 60
      WHEN 'LÃ­der em treinamento' THEN 50
      WHEN 'Indicador' THEN 40
      WHEN 'Trainee' THEN 60
      WHEN 'Secretaria' THEN 55
      ELSE 0
    END
  INTO v_target_rank;

  DECLARE
    v_new_rank INTEGER;
  BEGIN
    SELECT
      CASE p_new_profile
        WHEN 'Gestor Pleno' THEN 95
        WHEN 'Gestor' THEN 90
        WHEN 'Consultor Pleno' THEN 80
        WHEN 'Consultor' THEN 70
        WHEN 'Consultor em prÃ©via' THEN 60
        WHEN 'LÃ­der em treinamento' THEN 50
        WHEN 'Indicador' THEN 40
        WHEN 'Trainee' THEN 60
        WHEN 'Secretaria' THEN 55
        ELSE 0
      END
    INTO v_new_rank;

    -- NÃ£o pode promover para um perfil igual ou inferior ao atual
    IF v_target_rank >= v_new_rank THEN
      RETURN FALSE;
    END IF;
  END;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 3. FUNÃ‡ÃƒO: obter membros da equipe (get_team_members)
-- Retorna os IDs dos usuÃ¡rios gerenciados por um gestor (via gestor_id).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_team_members(
  p_manager_id UUID
)
RETURNS TABLE (
  usuario_id UUID,
  perfil TEXT,
  ativo BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT id, perfil, ativo
  FROM public.profiles
  WHERE gestor_id = p_manager_id;
END;
$$;

-- ============================================================
-- 4. FUNÃ‡ÃƒO: Ã© gestor de (is_gestor_of_direct)
-- Verifica se o usuÃ¡rio corrente Ã© gestor direto do usuÃ¡rio alvo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_gestor_of_direct(
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND perfil = 'Gestor'
      AND gestor_id IS NOT NULL
      AND p_target_user_id IN (
        SELECT id FROM public.profiles WHERE gestor_id = auth.uid()
      )
  );
END;
$$;

COMMIT;

-- ============================================================

-- 20261108000013  (20261108000013_fix_profiles_role_security.sql)
-- ============================================================
-- Migration: 20261108000013_fix_profiles_role_security.sql
-- Objetivo: Eliminar possibilidade de autoelevaÃ§Ã£o de cargo em public.profiles.
-- Principio: proteger a coluna perfil contra alteracao por nao-administradores.
--           Nao alterar migrations historicas. Nao DROP CASCADE. Nao apagar dados.
--           Nao modificar o modulo Credito Investimento. Preservar marked_id.
--           Nao executar SQL remoto.
-- Compatibilidade com a migration 20261108000011_expand_cargos_e_permissoes.sql.

BEGIN;

-- ============================================================
-- 0. GARANTIR COLUNA gestor_id (compatÃ­vel com migration 00003 se aplicada)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 1. FUNÃ‡ÃƒO AUXILIAR SEGURA: is_admin_safe()
-- Evita recursÃ£o RLS ao consultar public.profiles.
-- SECURITY DEFINER, search_path vazio, referÃªncias qualificadas.
-- Retorna sempre TRUE ou FALSE, nunca NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_perfil TEXT;
BEGIN
  -- UsuÃ¡rio nÃ£o autenticado nunca Ã© Administrador
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT perfil INTO v_perfil
  FROM public.profiles
  WHERE id = auth.uid();

  -- Se nÃ£o encontrou perfil ou nÃ£o Ã© Administrador, retorna FALSE
  IF v_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_perfil = 'Administrador';
END;
$$;

-- ============================================================
-- 2. CORRIGIR POLICIES DE UPDATE EM PROFILES
-- Usuario comum sÃ³ edita nome e avatar_url (campos pessoais).
-- Nao usamos OLD nas policies (nÃ£o disponÃ­vel em RLS).
-- A validaÃ§Ã£o de colunas alteradas ocorre no trigger profiles_protect_role_change().
-- Apenas Administrador altera perfil, gestor_id, ativo, ultimo_login, email.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own personal fields" ON public.profiles;

CREATE POLICY "Users can update own personal fields"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Only admins can update profile administrative fields"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

-- Corrigir policy SELECT para evitar recursÃ£o RLS
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_admin_safe()
  );

-- ============================================================
-- 3. CORRIGIR handle_new_user()
-- Cadastro publico recebe sempre Indicador, ignorando metadata de cargo.
-- ON CONFLICT DO NOTHING: nunca rebaixa ou sobrescreve perfil existente.
-- SECURITY DEFINER com search_path vazio.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_nome TEXT;
  v_avatar_url TEXT;
BEGIN
  v_nome := trim(COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), split_part(NEW.email, '@', 1)));
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  -- Perfil sempre Indicador para cadastro publico. O cliente nao escolhe.
  -- ON CONFLICT DO NOTHING: nunca rebaixa ou sobrescreve perfil existente.
  INSERT INTO public.profiles (id, nome, email, perfil, ativo, ultimo_login, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, 'Indicador', TRUE, NULL, v_avatar_url)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. TRIGGER DE PROTECAO CONTRA AUTO ELEVACAO DE CARGO
-- Impede UPDATE que altere id, perfil, gestor_id, ativo, ultimo_login,
-- email, created_at ou updated_at a menos que o usuario corrente seja
-- Administrador (verificado via is_admin_safe()).
-- auth.uid() IS NULL nao autoriza alteracoes (apenas operaÃ§Ãµes internas
-- via service_role, que bypassa RLS nativamente, sÃ£o afetadas).
-- ============================================================

CREATE OR REPLACE FUNCTION public.profiles_protect_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Se campos administrativos foram alterados, exige Administrador verificado
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.perfil IS DISTINCT FROM OLD.perfil
     OR NEW.gestor_id IS DISTINCT FROM OLD.gestor_id
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.ultimo_login IS DISTINCT FROM OLD.ultimo_login
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
    -- auth.uid() IS NULL nÃ£o autoriza: apenas operaÃ§Ãµes internas via
    -- service_role, que bypassam RLS nativamente no Supabase, passam aqui.
    -- Chamadas pÃºblicas autenticadas nunca tÃªm auth.uid() NULL.
    IF NOT public.is_admin_safe() THEN
      RAISE EXCEPTION 'Somente Administrador pode alterar campos administrativos do usuario.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_role_change ON public.profiles;

CREATE TRIGGER trg_profiles_protect_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_role_change();

-- ============================================================
-- 5. INDICES DE SUPORTE
-- ============================================================

CREATE INDEX IF NOT EXISTS profiles_gestor_id_idx ON public.profiles (gestor_id);

COMMIT;

-- ============================================================

