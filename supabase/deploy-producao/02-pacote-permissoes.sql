-- PACOTE 2: hardening de RLS e hierarquia de cargos
-- Gerado a partir de supabase/migrations. Nao editar manualmente.
--
-- ALTERA PERMISSOES CRITICAS. Exige backup previo e autorizacao expressa.
--
-- Como aplicar:
--   Recomendado: apos backup e pre-voo, aplicar com "npx supabase db push" (transacao por arquivo e registro em schema_migrations).
--   Alternativa: colar este arquivo no SQL Editor. Cada migration esta encapsulada em BEGIN/COMMIT.
--   Este pacote substitui policies de tabelas que ja possuem dados de producao.

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
-- MÓDULO: LIVE DE VOZ (FASE 2 — FUNDAÇÃO)
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
-- A regra é garantida por CHECK no banco, não apenas na interface.
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
  -- Cadeira 0 é reservada ao anfitrião; as demais começam em 1.
  cadeira INTEGER CHECK (cadeira IS NULL OR cadeira >= 0),
  microfone_ativo BOOLEAN NOT NULL DEFAULT FALSE,
  camera_ativa BOOLEAN NOT NULL DEFAULT FALSE,
  bloqueado BOOLEAN NOT NULL DEFAULT FALSE,
  saiu_em TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Exatamente uma origem: usuário cadastrado OU convidado externo
  CONSTRAINT live_participantes_origem_check CHECK (
    (usuario_id IS NOT NULL AND convidado_hash IS NULL) OR
    (usuario_id IS NULL AND convidado_hash IS NOT NULL)
  ),

  -- Convidado externo nunca ocupa cadeira (regra da versão 1)
  CONSTRAINT live_participantes_convidado_sem_cadeira_check CHECK (
    tipo <> 'convidado' OR cadeira IS NULL
  ),

  -- Anfitrião é sempre um usuário interno identificado
  CONSTRAINT live_participantes_anfitriao_interno_check CHECK (
    tipo <> 'anfitriao' OR usuario_id IS NOT NULL
  ),

  -- Cadeira 0 (palco) é exclusiva do anfitrião
  CONSTRAINT live_participantes_cadeira_zero_check CHECK (
    cadeira IS DISTINCT FROM 0 OR tipo = 'anfitriao'
  )
);

-- Uma pessoa por cadeira ativa, por sala
CREATE UNIQUE INDEX IF NOT EXISTS live_participantes_cadeira_unica
  ON public.live_participantes (live_id, cadeira)
  WHERE cadeira IS NOT NULL AND saiu_em IS NULL;

-- Uma sessão por usuário por sala
CREATE UNIQUE INDEX IF NOT EXISTS live_participantes_usuario_unico
  ON public.live_participantes (live_id, usuario_id)
  WHERE usuario_id IS NOT NULL AND saiu_em IS NULL;

CREATE INDEX IF NOT EXISTS live_participantes_live_id_idx ON public.live_participantes (live_id);
CREATE INDEX IF NOT EXISTS live_participantes_usuario_id_idx ON public.live_participantes (usuario_id);

-- Um convidado externo é a MESMA pessoa em todos os acessos do
-- mesmo convite: o par (sala, hash do token) identifica o convidado.
-- Sem este índice, cada abertura de link criaria uma nova linha e a
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

-- Impede solicitação duplicada enquanto estiver pendente
CREATE UNIQUE INDEX IF NOT EXISTS live_solicitacoes_pendente_unica
  ON public.live_solicitacoes (live_id, usuario_id)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS live_solicitacoes_live_id_idx ON public.live_solicitacoes (live_id, status);

-- ------------------------------------------------------------
-- Funções de autorização da sala (SECURITY DEFINER evita recursão de RLS)
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

-- Sou o anfitrião desta sala?
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

-- A sala está aberta para novos ouvintes?
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
-- Proteção de campos controlados apenas pelo anfitrião.
-- RLS não pode comparar OLD/NEW, então a invariante é garantida aqui:
-- um participante comum só altera microfone/câmera — nunca tipo,
-- cadeira ou bloqueio.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.live_participantes_proteger_campos()
RETURNS TRIGGER AS $$
BEGIN
  -- Operações de sistema (sem sessão autenticada, service_role, job de
  -- manutenção): a RLS já não se aplica a elas, então o guard não tem
  -- o que proteger. Sem esta saída, encerrar uma sala que teve
  -- visitante convidado falhava, porque a cascata de encerramento mexe
  -- em `saiu_em` de linhas cujo `usuario_id` é NULL.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convidado externo: sem usuário, logo a linha não pertence a quem
  -- está chamando.
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
-- Máquina de estados da sala.
-- RLS não compara OLD/NEW, então as invariantes abaixo são
-- garantidas no banco:
--   - o anfitrião não pode ser trocado;
--   - uma sala encerrada é definitiva (o histórico não é reaberto);
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
-- Lê: participantes da sala; o anfitrião sempre; e qualquer usuário
--     autenticado enquanto a live estiver aberta (necessário para
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

-- Só o próprio anfitrião cria a sala (não é possível se	auto_atribuir)
DROP POLICY IF EXISTS "Anfitriao cria a live" ON public.live_rooms;
CREATE POLICY "Anfitriao cria a live"
  ON public.live_rooms FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND anfitriao_id = auth.uid());

-- Somente o anfitrião altera status/modo/título/cadeiras
DROP POLICY IF EXISTS "Anfitriao atualiza a live" ON public.live_rooms;
CREATE POLICY "Anfitriao atualiza a live"
  ON public.live_rooms FOR UPDATE
  USING (auth.role() = 'authenticated' AND anfitriao_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND anfitriao_id = auth.uid());

-- Ninguém deleta live: o histórico é preservado
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

-- Entro na sala como ouvinte (nunca como anfitrião, nunca em cadeira)
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

-- O anfitrião registra o próprio assento
DROP POLICY IF EXISTS "Anfitriao registra o proprio assento" ON public.live_participantes;
CREATE POLICY "Anfitriao registra o proprio assento"
  ON public.live_participantes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND tipo = 'anfitriao'
    AND usuario_id = auth.uid()
  );

-- Minhas Updates: RLS permite; a trigger protege os campos do anfitrião
DROP POLICY IF EXISTS "Atualizo meu estado" ON public.live_participantes;
CREATE POLICY "Atualizo meu estado"
  ON public.live_participantes FOR UPDATE
  USING (auth.role() = 'authenticated' AND usuario_id = auth.uid())
  WITH CHECK (auth.role() = 'authenticated' AND usuario_id = auth.uid());

-- O anfitrião controla a sala
DROP POLICY IF EXISTS "Anfitriao controla a sala" ON public.live_participantes;
CREATE POLICY "Anfitriao controla a sala"
  ON public.live_participantes FOR UPDATE
  USING (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id))
  WITH CHECK (auth.role() = 'authenticated' AND public.live_e_anfitriao(live_id));

-- Sair da sala: eu mesmo ou o anfitrião
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

-- Somente usuários cadastrados pedem para falar
DROP POLICY IF EXISTS "Peca para falar" ON public.live_solicitacoes;
CREATE POLICY "Peca para falar"
  ON public.live_solicitacoes FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND usuario_id = auth.uid()
    AND status = 'pendente'
    AND public.live_participa(live_id)
  );

-- O anfitrião responde; o próprio usuário cancela
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
-- MÓDULO: LIVE DE VOZ (FASE 2)
-- live_convites (token temporário seguro), live_convite_acessos,
-- live_chat_mensagens
-- ============================================================

-- ------------------------------------------------------------
-- live_convites
-- O token NUNCA é gravado em texto puro: só o SHA-256.
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
-- depois de validar o token. Nunca recebem sessão Supabase.
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
-- Função server-side (SECURITY DEFINER) para validar e consumir
-- um convite. Usada pelas Route Handlers com service role.
-- Retorna o id da live quando o convite é válido.
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
      COALESCE((SELECT p.nome FROM public.profiles p WHERE p.id = v_live.anfitriao_id), 'Anfitrião');
END;
$$;

REVOKE ALL ON FUNCTION public.live_convite_validar(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.live_convite_validar(TEXT) TO service_role;

-- Registra o acesso e incrementa o contador (uma única vez por entrada)
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

-- live_convites: visível e gerenciável APENAS pelo anfitrião
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

-- live_convite_acessos: somente o anfitrião
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

-- Mensagens não podem ser editadas nem apagadas por ninguém
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
-- MÓDULO: LIVE DE VOZ (FASE 6)
-- Categorias, presentes e envios.
--
-- IMPORTANTE: o presente representa uma FAIXA DE CRÉDITO
-- associada a quem está na cadeira. NÃO é transferência
-- financeira, não é saldo, não é pagamento. Não existe
-- carteira nem integração com gateway neste módulo.
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

-- Subcategorias de SERVIÇOS (Saúde, Estética, Educação, Cursos, Outros)
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
-- live_presentes  (cadastro administrável — nada hard-coded no app)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.live_presentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id UUID NOT NULL REFERENCES public.live_presentes_categorias(id) ON DELETE RESTRICT,
  subcategoria_id UUID REFERENCES public.live_presentes_subcategorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  -- Representação de crédito. NÃO é valor financeiro.
  valor_credito NUMERIC(12, 2) NOT NULL CHECK (valor_credito >= 0),
  imagem_path TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- O nome do presente é único dentro da categoria: evita duas
  -- faixas de crédito iguais registradas para o mesmo grupo.
  CONSTRAINT live_presentes_categoria_nome_unico UNIQUE (categoria_id, nome)
);

CREATE INDEX IF NOT EXISTS live_presentes_categoria_id_idx
  ON public.live_presentes (categoria_id, ordem);

CREATE INDEX IF NOT EXISTS live_presentes_ativo_idx
  ON public.live_presentes (ativo);

-- ------------------------------------------------------------
-- live_presentes_envios
-- Snapshot de valor e categoria no momento do envio:
-- desativar ou editar um presente NÃO altera o histórico.
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
-- Garantia: só é possível enviar presente para quem está EM CADEIRA
-- (a regra é do banco, não apenas da interface).
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
-- Participantes veem só o que está ativo; o admin enxerga também os
-- registros desativados, para poder reativá-los.
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

-- Envios são imutáveis (preserva o histórico e o indicador)
DROP POLICY IF EXISTS "Ninguem altera envios" ON public.live_presentes_envios;
CREATE POLICY "Ninguem altera envios"
  ON public.live_presentes_envios FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Ninguem apaga envios" ON public.live_presentes_envios;
CREATE POLICY "Ninguem apaga envios"
  ON public.live_presentes_envios FOR DELETE
  USING (FALSE);

-- ============================================================
-- SEED — categorias e valores iniciais (editáveis no admin)
-- ============================================================

INSERT INTO public.live_presentes_categorias (nome, slug, emoji, ordem, ativo)
VALUES
  ('Motors / Veículos', 'motors', '🚗', 1, TRUE),
  ('Motos', 'motos', '🏍️', 2, TRUE),
  ('Lar / Imóveis', 'lar', '🏠', 3, TRUE),
  ('Serviços', 'servicos', '🛠️', 4, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  emoji = EXCLUDED.emoji,
  ordem = EXCLUDED.ordem;

INSERT INTO public.live_presentes_subcategorias (categoria_id, nome, slug, ordem, ativo)
SELECT c.id, s.nome, s.slug, s.ordem, TRUE
FROM public.live_presentes_categorias c
CROSS JOIN (
  VALUES
    ('Saúde', 'saude', 1),
    ('Estética', 'estetica', 2),
    ('Educação', 'educacao', 3),
    ('Cursos', 'cursos', 4),
    ('Outros', 'outros', 5)
) AS s(nome, slug, ordem)
WHERE c.slug = 'servicos'
ON CONFLICT (categoria_id, slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  ordem = EXCLUDED.ordem;

-- Valores de crédito representáveis: de R$ 1.000 a R$ 1.000.000.
-- O ID é derivado de md5(categoria + valor) e o conflito é resolvido
-- por (categoria, nome): reexecutar a migration não duplica linhas
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
-- MÓDULO: LIVE DE VOZ (FASE 8)
-- Apresentação: PDF, vídeo e compartilhamento de tela.
-- O arquivo reaproveita a infraestrutura de anexos existente
-- (bucket privado "anexos" + tabela public.anexos), com
-- entity_type = 'live_apresentacao'.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.live_apresentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  live_id UUID NOT NULL REFERENCES public.live_rooms(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'pdf' CHECK (tipo IN ('pdf', 'video', 'screen')),
  -- Reaproveita a tabela genérica de anexos do sistema
  anexo_id UUID REFERENCES public.anexos(id) ON DELETE SET NULL,
  caminho TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  titulo TEXT NOT NULL DEFAULT '',
  pagina_atual INTEGER NOT NULL DEFAULT 1 CHECK (pagina_atual >= 1),
  total_paginas INTEGER NOT NULL DEFAULT 0 CHECK (total_paginas >= 0),
  -- Sincronização de reprodução de vídeo (evita que cada
  -- espectador rode seu próprio áudio/posição)
  reproduzindo BOOLEAN NOT NULL DEFAULT FALSE,
  tempo_atual_segundos NUMERIC(10, 2) NOT NULL DEFAULT 0,
  iniciado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrada_em TIMESTAMPTZ,
  iniciado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Compartilhamento de tela não tem arquivo: o conteúdo vem do
  -- track de tela do LiveKit.
  CONSTRAINT live_apresentacoes_tela_sem_arquivo_check CHECK (
    tipo <> 'screen' OR caminho = ''
  )
);

CREATE INDEX IF NOT EXISTS live_apresentacoes_live_id_idx
  ON public.live_apresentacoes (live_id, encerrada_em);

-- A sala tem no máximo UMA apresentação aberta. Começar outra
-- exige encerrar a anterior, o que garante que a sincronização de
-- página e de reprodução não divirjam entre participantes.
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

-- Somente o anfitrião inicia, controla páginas e encerra
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
-- MÓDULO: LIVE DE VOZ
-- Permissões (códigos live.*) e visibilidade do menu
-- ============================================================

INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  ('live.acessar',            'Acessar Live de Voz',        'Live de Voz', 'Ver o módulo e entrar nas lives'),
  ('live.iniciar',            'Iniciar Live',               'Live de Voz', 'Criar uma live e torná-la anfitrião'),
  ('live.encerrar',           'Encerrar Live',              'Live de Voz', 'Encerrar a própria live'),
  ('live.convidar',           'Gerar Links de Convite',     'Live de Voz', 'Gerar e revogar links temporários para convidados'),
  ('live.participar',         'Participar da Live',         'Live de Voz', 'Solicitar e ocupar cadeira'),
  ('live.presentear',         'Apresentar',                 'Live de Voz', 'Iniciar apresentação em vídeo, tela, PDF ou vídeo'),
  ('live.chat',               'Participar do Chat',         'Live de Voz', 'Enviar mensagens no chat da live'),
  ('live.presentes.enviar',   'Enviar Presentes',           'Live de Voz', 'Enviar presentes para quem está em cadeira'),
  ('live.presentes.gerenciar','Gerenciar Presentes',        'Live de Voz', 'Criar categorias, presentes, imagens e valores')
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  categoria = EXCLUDED.categoria,
  descricao = EXCLUDED.descricao;

-- Concede o uso do módulo a todos os perfis do sistema.
-- Quem pode iniciar uma Live não é uma permissão estática: o poder
-- de anfitrião vem de `live_rooms.anfitriao_id`, preenchido pelo
-- servidor e imutável para quem não é o dono da sala.
-- `live.presentes.gerenciar` NÃO é concedido aqui: continua
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

-- Concede a visibilidade do módulo a todos os perfis do sistema.
-- As permissões de controle continuam sendo checadas em código
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
-- MÓDULO: LIVE DE VOZ — Realtime
-- Habilita a publicação das tabelas do módulo no Supabase Realtime
-- (o projeto não tinha nenhuma tabela publicada até aqui).
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
-- MÓDULO: LIVE DE VOZ — CORREÇÃO
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
-- e, em qualquer contexto SEM usuário autenticado (service_role,
-- job de manutenção, webhook), `auth.uid()` é NULL. Como a linha do
-- convidado tem `usuario_id` NULL, a comparação `NULL IS NOT DISTINCT
-- FROM NULL` é TRUE e o guard disparava, abortando o encerramento.
--
-- A correção NÃO enfraquece a segurança: com service_role a RLS já é
-- ignorada por definição, então o guard nunca protegeu esse caminho.
-- Ele continua valendo integralmente para chamadas autenticadas, que é
-- o único cenário que precisa ser protegido.
-- ============================================================

CREATE OR REPLACE FUNCTION public.live_participantes_proteger_campos()
RETURNS TRIGGER AS $$
BEGIN
  -- Operações de sistema (sem sessão): RLS já não se aplica a elas.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Convidados externos não têm usuário: a linha nunca pertence a
  -- quem está chamando, então não há o que proteger aqui.
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
-- MÓDULO: LIVE DE VOZ — MODERAÇÃO DE ÁUDIO
--
-- 1. `silenciado_pelo_anfitriao`: estado de mute IMPOSTO pelo
--    anfitrião, distinto de `microfone_ativo`, que é o que o
--    próprio participante realmente publikou.
--
--    Sem essa separação o painel mentia: o anfitrião via
--    "microfone desligado" enquanto o áudio continuava no SFU.
--    O cliente do participante lê esta flag e desliga o próprio
--    track de verdade; só aí o ícone do painel reflete a
--    realidade.
--
-- 2. Permissão `live.audio.controlar` para amarrar o controle de
--    áudio à hierarquia de acesso, e política que permite ao
--    anfitrião OU ao Administrador alterar a sala.
--
-- 3. A trigger de proteção passa a incluir a nova coluna: o
--    participante pode gravar `microfone_ativo`, mas NÃO pode
--    limpar `silenciado_pelo_anfitriao` sozinho. Sem isso o mute
--    seria contornável com uma chamada direta à API.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Coluna de mute imposto
-- ------------------------------------------------------------
ALTER TABLE public.live_participantes
  ADD COLUMN IF NOT EXISTS silenciado_pelo_anfitriao BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------
-- 2. Permissão de controle de áudio
--
-- Concedida a todos os perfis ativos, como as demais `live.*`: o
-- que restringe a ação não é a permissão isolada, e sim a
-- combinação "permissão + ser o anfitrião da sala" checada na
-- interface, e "anfitrião OU administrador" checada na RLS abaixo.
-- O Gestor não entra na lista de restrições do `usePermissions`
-- para este código, então também pode controlled a própria sala.
-- ------------------------------------------------------------
INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  ('live.audio.controlar', 'Controlar áudio da sala', 'Live de Voz',
   'Silenciar o áudio da apresentação para todos ou para cadeiras específicas')
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
-- 3. RLS: anfitrião da sala OU administrador
--
-- A policy "Anfitriao controla a sala" já cobre o anfitrião. Esta
-- acrescenta o Administrador, que precisa poder intervir em uma
-- sala de outro usuário sem precisar abrir uma sala nova.
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
-- 4. A coluna de mute entra na trigger de proteção
--
-- Sem esta linha o participante poderia enviar
-- `{"silenciado_pelo_anfitriao": false}` na própria linha e
-- burlar o mute do anfitrião sem tocar no LiveKit.
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
-- 5. Realtime: a coluna precisa chegar ao painel do anfitrião
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
--           Consultor, Consultor em prévia, Líder em treinamento, Indicador, Trainee, Secretaria).
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
-- 2. PERMISSÕES AUSENTES NA TABELA user_permissions
-- Códigos referenciados por src/lib/auth-user.ts que ainda não existem.
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
  ('rls.alterar', 'Alterar Policies RLS', 'Seguranca', 'Alterar políticas de seguranca em nivel de linha'),

  -- Credito Investimento (modulo preservado — apenas registros de permissao)
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

-- 3.1. Administrador — acesso total (24 permissoes)
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

-- 3.2. Gestor Pleno — gestao operacional ampliada (19 permissoes)
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

-- 3.3. Gestor — gerenciamento de equipe (19 permissoes)
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

-- 3.4. Consultor Pleno — autonomia operacional ampliada (19 permissoes)
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

-- 3.5. Consultor — operacoes de vendas e atendimento (14 permissoes)
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

-- 3.6. Consultor em previa — acesso operacional restrito (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Consultor em previa'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.7. Lider em treinamento — acesso limitado de desenvolvimento (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Lider em treinamento'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.8. Indicador — acesso inicial restrito (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Indicador'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.9. Trainee — legado, equivalente a Consultor em previa (1 permissao: playbooks.visualizar)
INSERT INTO public.permission_preset_items (preset_id, permissao_id, ordem)
SELECT pp.id, up.id, 50
FROM public.permission_presets pp
CROSS JOIN public.user_permissions up
WHERE pp.nome = 'Trainee'
  AND up.codigo IN (
    'playbooks.visualizar'
  )
ON CONFLICT (preset_id, permissao_id) DO NOTHING;

-- 3.10. Secretaria — apoio operacional, matriz independente (14 permissoes)
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
-- 5. SEGURANÇA — ROW LEVEL SECURITY NAS TABELAS DE PRESETS
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
-- Objetivo: funções auxiliares de hierarquia (SECURITY DEFINER) para uso em
--           policies RLS e validação server-side, evitando recursão RLS.
-- Principio: apenas criar funções novas. Nao alterar tabelas existentes.
--           Nao DROP CASCADE. Nao apagar dados.

BEGIN;

-- ============================================================
-- 1. FUNÇÃO: pode atribuir perfil (can_assign_profile)
-- Verifica se o usuário corrente pode atribuir um determinado perfil a outro usuário.
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
  -- Obter perfil do usuário corrente
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

  -- Gestor Pleno pode atribuir: Gestor, Consultor Pleno, Consultor, Consultor em prévia, Líder em treinamento, Indicador
  IF v_current_perfil = 'Gestor Pleno' THEN
    RETURN p_new_profile IN (
      'Gestor', 'Consultor Pleno', 'Consultor', 'Consultor em prévia', 'Líder em treinamento', 'Indicador'
    );
  END IF;

  -- Gestor pode atribuir: Consultor, Consultor em prévia, Líder em treinamento, Indicador
  IF v_current_perfil = 'Gestor' THEN
    RETURN p_new_profile IN (
      'Consultor', 'Consultor em prévia', 'Líder em treinamento', 'Indicador'
    );
  END IF;

  -- Consultor Pleno pode atribuir: Consultor, Consultor em prévia, Indicador
  IF v_current_perfil = 'Consultor Pleno' THEN
    RETURN p_new_profile IN ('Consultor', 'Consultor em prévia', 'Indicador');
  END IF;

  -- Outros perfis não podem atribuir
  RETURN FALSE;
END;
$$;

-- ============================================================
-- 2. FUNÇÃO: pode promover usuário (can_promote_to)
-- Verifica se o usuário corrente pode promover o usuário alvo para um novo perfil.
-- Impede auto-promoção e autoelevação.
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
  -- Não permite auto-promoção
  IF p_current_user_id = p_target_user_id THEN
    RETURN FALSE;
  END IF;

  -- Verificar se pode atribuir o perfil
  IF NOT public.can_assign_profile(p_current_user_id, p_new_profile) THEN
    RETURN FALSE;
  END IF;

  -- Obter perfil atual do usuário alvo
  SELECT perfil INTO v_target_perfil FROM public.profiles WHERE id = p_target_user_id;

  IF v_target_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calcular ranks para verificar se é promoção (rank deve aumentar)
  SELECT
    CASE v_target_perfil
      WHEN 'Gestor Pleno' THEN 95
      WHEN 'Gestor' THEN 90
      WHEN 'Consultor Pleno' THEN 80
      WHEN 'Consultor' THEN 70
      WHEN 'Consultor em prévia' THEN 60
      WHEN 'Líder em treinamento' THEN 50
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
        WHEN 'Consultor em prévia' THEN 60
        WHEN 'Líder em treinamento' THEN 50
        WHEN 'Indicador' THEN 40
        WHEN 'Trainee' THEN 60
        WHEN 'Secretaria' THEN 55
        ELSE 0
      END
    INTO v_new_rank;

    -- Não pode promover para um perfil igual ou inferior ao atual
    IF v_target_rank >= v_new_rank THEN
      RETURN FALSE;
    END IF;
  END;

  RETURN TRUE;
END;
$$;

-- ============================================================
-- 3. FUNÇÃO: obter membros da equipe (get_team_members)
-- Retorna os IDs dos usuários gerenciados por um gestor (via gestor_id).
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
-- 4. FUNÇÃO: é gestor de (is_gestor_of_direct)
-- Verifica se o usuário corrente é gestor direto do usuário alvo.
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
-- Objetivo: Eliminar possibilidade de autoelevação de cargo em public.profiles.
-- Principio: proteger a coluna perfil contra alteracao por nao-administradores.
--           Nao alterar migrations historicas. Nao DROP CASCADE. Nao apagar dados.
--           Nao modificar o modulo Credito Investimento. Preservar marked_id.
--           Nao executar SQL remoto.
-- Compatibilidade com a migration 20261108000011_expand_cargos_e_permissoes.sql.

BEGIN;

-- ============================================================
-- 0. GARANTIR COLUNA gestor_id (compatível com migration 00003 se aplicada)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================================
-- 1. FUNÇÃO AUXILIAR SEGURA: is_admin_safe()
-- Evita recursão RLS ao consultar public.profiles.
-- SECURITY DEFINER, search_path vazio, referências qualificadas.
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
  -- Usuário não autenticado nunca é Administrador
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT perfil INTO v_perfil
  FROM public.profiles
  WHERE id = auth.uid();

  -- Se não encontrou perfil ou não é Administrador, retorna FALSE
  IF v_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN v_perfil = 'Administrador';
END;
$$;

-- ============================================================
-- 2. CORRIGIR POLICIES DE UPDATE EM PROFILES
-- Usuario comum só edita nome e avatar_url (campos pessoais).
-- Nao usamos OLD nas policies (não disponível em RLS).
-- A validação de colunas alteradas ocorre no trigger profiles_protect_role_change().
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

-- Corrigir policy SELECT para evitar recursão RLS
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
-- auth.uid() IS NULL nao autoriza alteracoes (apenas operações internas
-- via service_role, que bypassa RLS nativamente, são afetadas).
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
    -- auth.uid() IS NULL não autoriza: apenas operações internas via
    -- service_role, que bypassam RLS nativamente no Supabase, passam aqui.
    -- Chamadas públicas autenticadas nunca têm auth.uid() NULL.
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
-- 20261110000000  (20261110000000_correcao_seguranca_rls.sql)
-- ============================================================
-- Migration: 20261110000000_correcao_seguranca_rls.sql
-- Objetivo: Correção integrada de segurança RLS, perfis, cargos e políticas
--           para o Sistema Operacional do Consultor.
-- Princípios:
--   - Não alterar migrations históricas.
--   - Não utilizar DROP CASCADE.
--   - Não excluir tabelas, colunas ou registros existentes.
--   - Ser idempotente: verificar estado antes de alterar.
--   - Preservar todos os dados existentes.
--   - Não implementar Secretaria nem tabela secretaria_vinculos_operacionais.
--
-- Aplicar manualmente no Supabase Studio após revisão.

BEGIN;

-- ============================================================
-- 0. GARANTIR COLUNAS AUSENTES EM public.profiles
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'gestor_id'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ativo'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;
END $$;

-- ============================================================
-- 1. CORRIGIR CHECK CONSTRAINT DE profiles.perfil (10 cargos oficiais)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_perfil_check'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_perfil_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_perfil_check
    CHECK (perfil IN (
      'Administrador',
      'Gestor Pleno',
      'Gestor',
      'Consultor Pleno',
      'Consultor',
      'Consultor em prévia',
      'Líder em treinamento',
      'Indicador',
      'Trainee',
      'Secretaria'
    )) NOT VALID;

  ALTER TABLE public.profiles VALIDATE CONSTRAINT profiles_perfil_check;
END $$;

-- Índice de suporte para gestor_id
CREATE INDEX IF NOT EXISTS profiles_gestor_id_idx ON public.profiles (gestor_id);

-- ============================================================
-- 2. FUNÇÃO: is_admin_safe()
-- Verifica se o usuário autenticado é Administrador ATIVO.
-- search_path vazio, referências qualificadas, SECURITY DEFINER.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_perfil TEXT;
  v_ativo BOOLEAN;
BEGIN
  -- Usuário não autenticado nunca é Administrador
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT perfil, ativo INTO v_perfil, v_ativo
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_perfil IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Exigir ativo = TRUE (cobre NULL e FALSE)
  IF NOT v_ativo THEN
    RETURN FALSE;
  END IF;

  RETURN v_perfil = 'Administrador';
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_safe() TO authenticated;

-- ============================================================
-- 3. FUNÇÃO: is_gestor_da_equipe(p_proprietario_id UUID)
-- Verifica se o usuário autenticado (Gestor ou Gestor Pleno, ativo)
-- é o gestor direto do proprietário informado, e que o proprietário está ativo.
-- Evita recursão RLS: não aceita UUID fornecido pelo cliente para o chamador;
-- usa auth.uid() internamente. Usa search_path vazio.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_gestor_da_equipe(p_proprietario_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_perfil TEXT;
  v_caller_ativo BOOLEAN;
  v_owner_perfil TEXT;
  v_owner_ativo BOOLEAN;
  v_owner_gestor_id UUID;
BEGIN
  -- Obter dados do chamador (auth.uid() da sessão, não parâmetro do cliente)
  SELECT perfil, ativo INTO v_caller_perfil, v_caller_ativo
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_perfil IS NULL OR NOT v_caller_ativo THEN
    RETURN FALSE;
  END IF;

  -- Apenas Gestor e Gestor Pleno podem acessar equipe
  IF v_caller_perfil NOT IN ('Gestor', 'Gestor Pleno') THEN
    RETURN FALSE;
  END IF;

  -- Obter dados do proprietário do registro
  SELECT perfil, ativo, gestor_id INTO v_owner_perfil, v_owner_ativo, v_owner_gestor_id
  FROM public.profiles
  WHERE id = p_proprietario_id;

  IF v_owner_perfil IS NULL OR NOT v_owner_ativo THEN
    RETURN FALSE;
  END IF;

  -- Validar relação hierárquica real: proprietário é liderado pelo chamador
  RETURN v_owner_gestor_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.is_gestor_da_equipe(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_gestor_da_equipe(UUID) TO authenticated;

-- ============================================================
-- 4. TABELA: public.audit_log
-- Registro de operações administrativas. Sem senhas, tokens ou segredos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  acao TEXT NOT NULL,
  usuario_responsavel UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_afetado UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  valores_antes JSONB,
  valores_depois JSONB,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Somente Administrador pode consultar audit_log
DROP POLICY IF EXISTS "Audit log: admin pode consultar" ON public.audit_log;
CREATE POLICY "Audit log: admin pode consultar"
  ON public.audit_log FOR SELECT
  USING (public.is_admin_safe());

-- Somente service_role (backend) pode inserir
DROP POLICY IF EXISTS "Audit log: backend pode inserir" ON public.audit_log;
CREATE POLICY "Audit log: backend pode inserir"
  ON public.audit_log FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Nenhum pode atualizar ou excluir (imutável)
DROP POLICY IF EXISTS "Audit log: sem atualizacao" ON public.audit_log;
CREATE POLICY "Audit log: sem atualizacao"
  ON public.audit_log FOR UPDATE
  USING (FALSE);

DROP POLICY IF EXISTS "Audit log: sem exclusao" ON public.audit_log;
CREATE POLICY "Audit log: sem exclusao"
  ON public.audit_log FOR DELETE
  USING (FALSE);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at);
CREATE INDEX IF NOT EXISTS audit_log_usuario_responsavel_idx ON public.audit_log (usuario_responsavel);
CREATE INDEX IF NOT EXISTS audit_log_tabela_registro_idx ON public.audit_log (tabela, registro_id);

-- ============================================================
-- 5. CORRIGIR handle_new_user()
-- Cadastro público recebe sempre 'Indicador'. Não confiar em raw_user_meta_data.
-- ON CONFLICT DO NOTHING: nunca sobrescrever perfil existente.
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

  -- Perfil sempre Indicador para cadastro público
  INSERT INTO public.profiles (id, nome, email, perfil, ativo, ultimo_login, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, 'Indicador', TRUE, NULL, v_avatar_url)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 6. TRIGGER: profiles_protect_role_change()
-- Impede alteração de campos administrativos por não-administradores.
-- service_role é permitido (operações backend pré-validadas pelo Server Action).
-- Usuários autenticados precisam de is_admin_safe().
-- ============================================================

CREATE OR REPLACE FUNCTION public.profiles_protect_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.perfil IS DISTINCT FROM OLD.perfil
     OR NEW.gestor_id IS DISTINCT FROM OLD.gestor_id
     OR NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.ultimo_login IS DISTINCT FROM OLD.ultimo_login
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN

    -- Operações backend via service_role são pré-validadas pelo Server Action
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Usuários autenticados precisam ser Administrador ativo
    IF NOT public.is_admin_safe() THEN
      RAISE EXCEPTION 'Somente Administrador ativo pode alterar campos administrativos do usuario.'
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
-- 7. TRIGGER: prohibit_usuario_id_change()
-- Impede alteração de usuario_id em registros comerciais após a criação.
-- service_role permitido (transferência administrativa pré-validada).
-- ============================================================

CREATE OR REPLACE FUNCTION public.prohibit_usuario_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.usuario_id IS DISTINCT FROM OLD.usuario_id THEN
    -- service_role: transferência administrativa pré-validada pelo Server Action
    IF auth.role() = 'service_role' THEN
      RETURN NEW;
    END IF;

    -- Usuários autenticados nunca podem alterar usuario_id
    RAISE EXCEPTION 'usuario_id nao pode ser alterado apos a criacao.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. TRIGGER: validate_admin_insert()
-- Valida INSERT em tabelas comerciais.
-- INSERT próprio (usuario_id = auth.uid()): permitido se policy permitir.
-- INSERT para terceiro: somente service_role (pré-validado) ou Administrador.
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_admin_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_dest_perfil TEXT;
  v_dest_ativo BOOLEAN;
BEGIN
  -- Inserção própria: usuario_id bate com auth.uid() da sessão autenticada
  IF NEW.usuario_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- service_role: operação backend pré-validada pelo Server Action.
  -- Validar apenas integridade de destino.
  IF auth.role() = 'service_role' THEN
    SELECT perfil, ativo INTO v_dest_perfil, v_dest_ativo
    FROM public.profiles
    WHERE id = NEW.usuario_id;

    IF v_dest_perfil IS NULL OR NOT v_dest_ativo THEN
      RAISE EXCEPTION 'Usuario de destino nao existe ou esta inativo.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  -- Usuário autenticado (Administrador) inserindo para terceiro: permitido
  IF public.is_admin_safe() THEN
    SELECT perfil, ativo INTO v_dest_perfil, v_dest_ativo
    FROM public.profiles
    WHERE id = NEW.usuario_id;

    IF v_dest_perfil IS NULL OR NOT v_dest_ativo THEN
      RAISE EXCEPTION 'Usuario de destino nao existe ou esta inativo.'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  -- Usuário autenticado inserindo para terceiro: sempre bloqueado
  RAISE EXCEPTION 'Somente operacao administrativa pode criar registros para terceiros.'
    USING ERRCODE = '42501';
END;
$$;

-- ============================================================
-- 9. APLICAR TRIGGERS NAS TABELAS COMERCIAIS
-- Tabelas com coluna usuario_id NOT NULL
-- ============================================================

-- Clientes
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

-- Leads
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

-- Indicadores
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.indicadores;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.indicadores;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Agenda Eventos
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.agenda_eventos;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.agenda_eventos;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.agenda_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Negociacoes
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.negociacoes;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.negociacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.negociacoes;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.negociacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Cobrancas
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.cobrancas;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.cobrancas;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Pos Venda
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.pos_venda;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.pos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.pos_venda;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.pos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Recrutamento
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.recrutamento;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.recrutamento
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.recrutamento;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.recrutamento
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Parceiros
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.parceiros;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.parceiros;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Comissoes Indicadores
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.comissoes_indicadores;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.comissoes_indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.comissoes_indicadores;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.comissoes_indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- Metas (usuario_id nullable)
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.metas;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.metas;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- User Permission Grants
DROP TRIGGER IF EXISTS trg_prohibit_usuario_id_change ON public.user_permission_grants;
CREATE TRIGGER trg_prohibit_usuario_id_change
  BEFORE UPDATE ON public.user_permission_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.prohibit_usuario_id_change();

DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.user_permission_grants;
CREATE TRIGGER trg_validate_admin_insert
  BEFORE INSERT ON public.user_permission_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_admin_insert();

-- User Evolution History
-- Tabela user_evolution_history pode não existir em instalações que não aplicaram
-- a migration que a cria. Protegemos toda a operação com verificação de existência.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_evolution_history') THEN
    DROP TRIGGER IF EXISTS trg_prohibitUsuario_id_change ON public.user_evolution_history;
    CREATE TRIGGER trg_prohibitUsuario_id_change
      BEFORE UPDATE ON public.user_evolution_history
      FOR EACH ROW
      EXECUTE FUNCTION public.prohibit_usuario_id_change();

    DROP TRIGGER IF EXISTS trg_validate_admin_insert ON public.user_evolution_history;
    CREATE TRIGGER trg_validate_admin_insert
      BEFORE INSERT ON public.user_evolution_history
      FOR EACH ROW
      EXECUTE FUNCTION public.validate_admin_insert();
  END IF;
END $$;

-- ============================================================
-- 10. CORRIGIR POLICIES RLS — TABELAS COMERCIAIS
-- Remover policies antigas permissivas e criar novas restritivas.
-- ============================================================

-- Helper macro para drop de policies antigas (executado individualmente por tabela)

-- ===== CLIENTES =====
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can view their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can insert their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can update their clients" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated users can delete their clients" ON public.clientes;

CREATE POLICY "Clientes: usuario pode ver seus proprios registros"
  ON public.clientes FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Clientes: gestor ve registros da equipe"
  ON public.clientes FOR SELECT
  USING (public.is_gestor_da_equipe(clientes.usuario_id));

CREATE POLICY "Clientes: admin ve todos"
  ON public.clientes FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Clientes: usuario pode inserir para si"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Clientes: admin pode inserir para terceiro"
  ON public.clientes FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = clientes.usuario_id AND p.ativo = TRUE
    )
  );

CREATE POLICY "Clientes: usuario pode atualizar seus proprios registros"
  ON public.clientes FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Clientes: gestor atualiza registros da equipe"
  ON public.clientes FOR UPDATE
  USING (public.is_gestor_da_equipe(clientes.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(clientes.usuario_id));

CREATE POLICY "Clientes: admin atualiza qualquer registro"
  ON public.clientes FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Clientes: usuario pode excluir seus proprios registros"
  ON public.clientes FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Clientes: gestor exclui registros da equipe"
  ON public.clientes FOR DELETE
  USING (public.is_gestor_da_equipe(clientes.usuario_id));

CREATE POLICY "Clientes: admin exclui qualquer registro"
  ON public.clientes FOR DELETE
  USING (public.is_admin_safe());

-- ===== LEADS =====
DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update their leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete their leads" ON public.leads;

CREATE POLICY "Leads: usuario pode ver seus proprios registros"
  ON public.leads FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Leads: gestor ve registros da equipe"
  ON public.leads FOR SELECT
  USING (public.is_gestor_da_equipe(leads.usuario_id));

CREATE POLICY "Leads: admin ve todos"
  ON public.leads FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Leads: usuario pode inserir para si"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Leads: admin pode inserir para terceiro"
  ON public.leads FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = leads.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Leads: usuario pode atualizar seus proprios registros"
  ON public.leads FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Leads: gestor atualiza registros da equipe"
  ON public.leads FOR UPDATE
  USING (public.is_gestor_da_equipe(leads.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(leads.usuario_id));

CREATE POLICY "Leads: admin atualiza qualquer registro"
  ON public.leads FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Leads: usuario pode excluir seus proprios registros"
  ON public.leads FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Leads: gestor exclui registros da equipe"
  ON public.leads FOR DELETE
  USING (public.is_gestor_da_equipe(leads.usuario_id));

CREATE POLICY "Leads: admin exclui qualquer registro"
  ON public.leads FOR DELETE
  USING (public.is_admin_safe());

-- ===== INDICADORES =====
DROP POLICY IF EXISTS "Authenticated users can view their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can insert their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can update their indicators" ON public.indicadores;
DROP POLICY IF EXISTS "Authenticated users can delete their indicators" ON public.indicadores;

CREATE POLICY "Indicadores: usuario pode ver seus proprios registros"
  ON public.indicadores FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: gestor ve registros da equipe"
  ON public.indicadores FOR SELECT
  USING (public.is_gestor_da_equipe(indicadores.usuario_id));

CREATE POLICY "Indicadores: admin ve todos"
  ON public.indicadores FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Indicadores: usuario pode inserir para si"
  ON public.indicadores FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: admin pode inserir para terceiro"
  ON public.indicadores FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = indicadores.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Indicadores: usuario pode atualizar seus proprios registros"
  ON public.indicadores FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: gestor atualiza registros da equipe"
  ON public.indicadores FOR UPDATE
  USING (public.is_gestor_da_equipe(indicadores.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(indicadores.usuario_id));

CREATE POLICY "Indicadores: admin atualiza qualquer registro"
  ON public.indicadores FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Indicadores: usuario pode excluir seus proprios registros"
  ON public.indicadores FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Indicadores: gestor exclui registros da equipe"
  ON public.indicadores FOR DELETE
  USING (public.is_gestor_da_equipe(indicadores.usuario_id));

CREATE POLICY "Indicadores: admin exclui qualquer registro"
  ON public.indicadores FOR DELETE
  USING (public.is_admin_safe());

-- ===== AGENDA_EVENTOS =====
DROP POLICY IF EXISTS "Authenticated users can view their agenda events" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Authenticated users can insert their agenda events" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Authenticated users can update their agenda events" ON public.agenda_eventos;
DROP POLICY IF EXISTS "Authenticated users can delete their agenda events" ON public.agenda_eventos;

CREATE POLICY "Agenda: usuario pode ver seus proprios registros"
  ON public.agenda_eventos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Agenda: gestor ve registros da equipe"
  ON public.agenda_eventos FOR SELECT
  USING (public.is_gestor_da_equipe(agenda_eventos.usuario_id));

CREATE POLICY "Agenda: admin ve todos"
  ON public.agenda_eventos FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Agenda: usuario pode inserir para si"
  ON public.agenda_eventos FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Agenda: admin pode inserir para terceiro"
  ON public.agenda_eventos FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = agenda_eventos.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Agenda: usuario pode atualizar seus proprios registros"
  ON public.agenda_eventos FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Agenda: gestor atualiza registros da equipe"
  ON public.agenda_eventos FOR UPDATE
  USING (public.is_gestor_da_equipe(agenda_eventos.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(agenda_eventos.usuario_id));

CREATE POLICY "Agenda: admin atualiza qualquer registro"
  ON public.agenda_eventos FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Agenda: usuario pode excluir seus proprios registros"
  ON public.agenda_eventos FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Agenda: gestor exclui registros da equipe"
  ON public.agenda_eventos FOR DELETE
  USING (public.is_gestor_da_equipe(agenda_eventos.usuario_id));

CREATE POLICY "Agenda: admin exclui qualquer registro"
  ON public.agenda_eventos FOR DELETE
  USING (public.is_admin_safe());

-- ===== NEGOCIACOES =====
DROP POLICY IF EXISTS "Authenticated users can view their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can insert their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can update their negotiations" ON public.negociacoes;
DROP POLICY IF EXISTS "Authenticated users can delete their negotiations" ON public.negociacoes;

CREATE POLICY "Negociacoes: usuario pode ver seus proprios registros"
  ON public.negociacoes FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: gestor ve registros da equipe"
  ON public.negociacoes FOR SELECT
  USING (public.is_gestor_da_equipe(negociacoes.usuario_id));

CREATE POLICY "Negociacoes: admin ve todos"
  ON public.negociacoes FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Negociacoes: usuario pode inserir para si"
  ON public.negociacoes FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: admin pode inserir para terceiro"
  ON public.negociacoes FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = negociacoes.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Negociacoes: usuario pode atualizar seus proprios registros"
  ON public.negociacoes FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: gestor atualiza registros da equipe"
  ON public.negociacoes FOR UPDATE
  USING (public.is_gestor_da_equipe(negociacoes.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(negociacoes.usuario_id));

CREATE POLICY "Negociacoes: admin atualiza qualquer registro"
  ON public.negociacoes FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Negociacoes: usuario pode excluir seus proprios registros"
  ON public.negociacoes FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Negociacoes: gestor exclui registros da equipe"
  ON public.negociacoes FOR DELETE
  USING (public.is_gestor_da_equipe(negociacoes.usuario_id));

CREATE POLICY "Negociacoes: admin exclui qualquer registro"
  ON public.negociacoes FOR DELETE
  USING (public.is_admin_safe());

-- ===== COBRANCAS =====
DROP POLICY IF EXISTS "Authenticated users can view their cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Authenticated users can insert their cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Authenticated users can update their cobrancas" ON public.cobrancas;
DROP POLICY IF EXISTS "Authenticated users can delete their cobrancas" ON public.cobrancas;

CREATE POLICY "Cobrancas: usuario pode ver seus proprios registros"
  ON public.cobrancas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: gestor ve registros da equipe"
  ON public.cobrancas FOR SELECT
  USING (public.is_gestor_da_equipe(cobrancas.usuario_id));

CREATE POLICY "Cobrancas: admin ve todos"
  ON public.cobrancas FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Cobrancas: usuario pode inserir para si"
  ON public.cobrancas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: admin pode inserir para terceiro"
  ON public.cobrancas FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = cobrancas.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Cobrancas: usuario pode atualizar seus proprios registros"
  ON public.cobrancas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: gestor atualiza registros da equipe"
  ON public.cobrancas FOR UPDATE
  USING (public.is_gestor_da_equipe(cobrancas.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(cobrancas.usuario_id));

CREATE POLICY "Cobrancas: admin atualiza qualquer registro"
  ON public.cobrancas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Cobrancas: usuario pode excluir seus proprios registros"
  ON public.cobrancas FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Cobrancas: gestor exclui registros da equipe"
  ON public.cobrancas FOR DELETE
  USING (public.is_gestor_da_equipe(cobrancas.usuario_id));

CREATE POLICY "Cobrancas: admin exclui qualquer registro"
  ON public.cobrancas FOR DELETE
  USING (public.is_admin_safe());

-- ===== POS_VENDA =====
DROP POLICY IF EXISTS "Authenticated users can view their pos-venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Authenticated users can insert their pos-venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Authenticated users can update their pos-venda" ON public.pos_venda;
DROP POLICY IF EXISTS "Authenticated users can delete their pos-venda" ON public.pos_venda;

CREATE POLICY "PosVenda: usuario pode ver seus proprios registros"
  ON public.pos_venda FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: gestor ve registros da equipe"
  ON public.pos_venda FOR SELECT
  USING (public.is_gestor_da_equipe(pos_venda.usuario_id));

CREATE POLICY "PosVenda: admin ve todos"
  ON public.pos_venda FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "PosVenda: usuario pode inserir para si"
  ON public.pos_venda FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: admin pode inserir para terceiro"
  ON public.pos_venda FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = pos_venda.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "PosVenda: usuario pode atualizar seus proprios registros"
  ON public.pos_venda FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: gestor atualiza registros da equipe"
  ON public.pos_venda FOR UPDATE
  USING (public.is_gestor_da_equipe(pos_venda.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(pos_venda.usuario_id));

CREATE POLICY "PosVenda: admin atualiza qualquer registro"
  ON public.pos_venda FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "PosVenda: usuario pode excluir seus proprios registros"
  ON public.pos_venda FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "PosVenda: gestor exclui registros da equipe"
  ON public.pos_venda FOR DELETE
  USING (public.is_gestor_da_equipe(pos_venda.usuario_id));

CREATE POLICY "PosVenda: admin exclui qualquer registro"
  ON public.pos_venda FOR DELETE
  USING (public.is_admin_safe());

-- ===== RECRUTAMENTO =====
DROP POLICY IF EXISTS "Authenticated users can view own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can insert own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can update own recrutamento" ON public.recrutamento;
DROP POLICY IF EXISTS "Authenticated users can delete own recrutamento" ON public.recrutamento;

CREATE POLICY "Recrutamento: usuario pode ver seus proprios registros"
  ON public.recrutamento FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: gestor ve registros da equipe"
  ON public.recrutamento FOR SELECT
  USING (public.is_gestor_da_equipe(recrutamento.usuario_id));

CREATE POLICY "Recrutamento: admin ve todos"
  ON public.recrutamento FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Recrutamento: usuario pode inserir para si"
  ON public.recrutamento FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: admin pode inserir para terceiro"
  ON public.recrutamento FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = recrutamento.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Recrutamento: usuario pode atualizar seus proprios registros"
  ON public.recrutamento FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: gestor atualiza registros da equipe"
  ON public.recrutamento FOR UPDATE
  USING (public.is_gestor_da_equipe(recrutamento.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(recrutamento.usuario_id));

CREATE POLICY "Recrutamento: admin atualiza qualquer registro"
  ON public.recrutamento FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Recrutamento: usuario pode excluir seus proprios registros"
  ON public.recrutamento FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Recrutamento: gestor exclui registros da equipe"
  ON public.recrutamento FOR DELETE
  USING (public.is_gestor_da_equipe(recrutamento.usuario_id));

CREATE POLICY "Recrutamento: admin exclui qualquer registro"
  ON public.recrutamento FOR DELETE
  USING (public.is_admin_safe());

-- ===== PARCEIROS =====
DROP POLICY IF EXISTS "Authenticated users can view own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can insert own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can update own parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Authenticated users can delete own parceiros" ON public.parceiros;

CREATE POLICY "Parceiros: usuario pode ver seus proprios registros"
  ON public.parceiros FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: gestor ve registros da equipe"
  ON public.parceiros FOR SELECT
  USING (public.is_gestor_da_equipe(parceiros.usuario_id));

CREATE POLICY "Parceiros: admin ve todos"
  ON public.parceiros FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Parceiros: usuario pode inserir para si"
  ON public.parceiros FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: admin pode inserir para terceiro"
  ON public.parceiros FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = parceiros.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Parceiros: usuario pode atualizar seus proprios registros"
  ON public.parceiros FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: gestor atualiza registros da equipe"
  ON public.parceiros FOR UPDATE
  USING (public.is_gestor_da_equipe(parceiros.usuario_id))
  WITH CHECK (public.is_gestor_da_equipe(parceiros.usuario_id));

CREATE POLICY "Parceiros: admin atualiza qualquer registro"
  ON public.parceiros FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Parceiros: usuario pode excluir seus proprios registros"
  ON public.parceiros FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Parceiros: gestor exclui registros da equipe"
  ON public.parceiros FOR DELETE
  USING (public.is_gestor_da_equipe(parceiros.usuario_id));

CREATE POLICY "Parceiros: admin exclui qualquer registro"
  ON public.parceiros FOR DELETE
  USING (public.is_admin_safe());

-- ===== COMISSOES_INDICADORES =====
DROP POLICY IF EXISTS "Authenticated users can view their indicator commissions" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Authenticated users can insert their indicator commissions" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Authenticated users can update their indicator commissions" ON public.comissoes_indicadores;
DROP POLICY IF EXISTS "Authenticated users can delete their indicator commissions" ON public.comissoes_indicadores;

CREATE POLICY "Comissoes: usuario pode ver seus proprios registros"
  ON public.comissoes_indicadores FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin ve todos"
  ON public.comissoes_indicadores FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Comissoes: usuario pode inserir para si"
  ON public.comissoes_indicadores FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin pode inserir para terceiro"
  ON public.comissoes_indicadores FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = comissoes_indicadores.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Comissoes: usuario pode atualizar seus proprios registros"
  ON public.comissoes_indicadores FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin atualiza qualquer registro"
  ON public.comissoes_indicadores FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Comissoes: usuario pode excluir seus proprios registros"
  ON public.comissoes_indicadores FOR DELETE
  USING (auth.uid() = usuario_id);

CREATE POLICY "Comissoes: admin exclui qualquer registro"
  ON public.comissoes_indicadores FOR DELETE
  USING (public.is_admin_safe());

-- ===== METAS =====
DROP POLICY IF EXISTS "Authenticated users can view relevant metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can update metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can delete metas" ON public.metas;

CREATE POLICY "Metas: usuario pode ver suas proprias metas"
  ON public.metas FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Metas: gestor ve metas da equipe"
  ON public.metas FOR SELECT
  USING (public.is_gestor_da_equipe(metas.usuario_id));

CREATE POLICY "Metas: admin ve todas"
  ON public.metas FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Metas: admin pode inserir"
  ON public.metas FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = metas.usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Metas: admin pode atualizar"
  ON public.metas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Metas: admin pode excluir"
  ON public.metas FOR DELETE
  USING (public.is_admin_safe());

-- ===== USER_PERMISSION_GRANTS =====
DROP POLICY IF EXISTS "Users can view their own permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can insert permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can update permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can delete permission grants" ON public.user_permission_grants;

CREATE POLICY "Grants: usuario pode ver suas proprias permissoes"
  ON public.user_permission_grants FOR SELECT
  USING (auth.uid() = usuario_id OR public.is_admin_safe());

CREATE POLICY "Grants: gestor ve permissoes da equipe"
  ON public.user_permission_grants FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

CREATE POLICY "Grants: admin pode inserir"
  ON public.user_permission_grants FOR INSERT
  WITH CHECK (
    public.is_admin_safe()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = usuario_id AND p.ativo = TRUE)
  );

CREATE POLICY "Grants: admin pode atualizar"
  ON public.user_permission_grants FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Grants: admin pode excluir"
  ON public.user_permission_grants FOR DELETE
  USING (public.is_admin_safe());

-- ===== USER_EVOLUTION_HISTORY =====
-- Tabela user_evolution_history pode não existir em instalações sem a migration criadora.
-- Protegemos toda a operação com verificação de existência.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_evolution_history') THEN
    DROP POLICY IF EXISTS "Evolution: usuario pode ver seu proprio historico" ON public.user_evolution_history;
    DROP POLICY IF EXISTS "Evolution: gestor ve historico da equipe" ON public.user_evolution_history;
    DROP POLICY IF EXISTS "Evolution: admin pode inserir" ON public.user_evolution_history;

    CREATE POLICY "Evolution: usuario pode ver seu proprio historico"
      ON public.user_evolution_history FOR SELECT
      USING (auth.uid() = usuario_id OR public.is_admin_safe());

    CREATE POLICY "Evolution: gestor ve historico da equipe"
      ON public.user_evolution_history FOR SELECT
      USING (public.is_gestor_da_equipe(user_evolution_history.usuario_id));

    CREATE POLICY "Evolution: admin pode inserir"
      ON public.user_evolution_history FOR INSERT
      WITH CHECK (
        public.is_admin_safe()
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = usuario_id AND p.ativo = TRUE)
      );
  END IF;
END $$;

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can update team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own personal fields" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can update profile administrative fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Profiles: usuario pode ver o proprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin_safe());

CREATE POLICY "Profiles: gestor ve perfis da equipe"
  ON public.profiles FOR SELECT
  USING (
    public.is_gestor_da_equipe(id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.ativo = TRUE AND p.perfil IN ('Gestor', 'Gestor Pleno')
    )
  );

CREATE POLICY "Profiles: admin ve todos os perfis"
  ON public.profiles FOR SELECT
  USING (public.is_admin_safe());

CREATE POLICY "Profiles: usuario atualiza campos pessoais"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin atualiza campos administrativos"
  ON public.profiles FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Profiles: usuario pode inserir o proprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Profiles: admin exclui qualquer perfil"
  ON public.profiles FOR DELETE
  USING (public.is_admin_safe());

COMMIT;

-- ============================================================
-- 20261111000000  (20261111000000_correcao_rls_tabelas_restantes.sql)
-- ============================================================
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

-- ============================================================
-- 20261118000001  (20261118000001_create_pessoas_identidade.sql)
-- ============================================================
-- Migration: 20261118000001_create_pessoas_identidade.sql
-- Objetivo: Criar estrutura central de identidade (pessoas) e vinculos (pessoa_vinculos).
-- Principio: UUID central, integridade referencial, prevencao de duplicatas, RLS por cargo.
--           Nao alterar migrations historicas. Nao DROP CASCADE. Preservar dados existentes.
-- Compatibilidade: 10 perfis oficiais. Nao mesclar pessoas automaticamente.

BEGIN;

-- ============================================================
-- 1. TABELA pessoas — identidade central da pessoa
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pessoas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  cpf_cnpj TEXT,
  cidade TEXT,
  estado TEXT,
  observacoes TEXT,
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pessoas_usuario_id ON public.pessoas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pessoas_email ON public.pessoas(email);

-- ============================================================
-- 2. TABELA pessoa_vinculos — vinculos com entidades existentes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pessoa_vinculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('cliente', 'lead', 'indicador', 'recrutamento')),
  entidade_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pessoa_id, tipo_entidade, entidade_id)
);

CREATE INDEX IF NOT EXISTS idx_pessoa_vinculos_pessoa_id ON public.pessoa_vinculos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_pessoa_vinculos_entidade ON public.pessoa_vinculos(tipo_entidade, entidade_id);

-- ============================================================
-- 3. RLS — pessoas
-- ============================================================

ALTER TABLE public.pessoas ENABLE ROW LEVEL SECURITY;

-- SELECT: usuario ve proprias pessoas ou admin/gestor ve equipe
CREATE POLICY "Pessoas: usuario ve proprias" ON public.pessoas FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_admin_safe());

CREATE POLICY "Pessoas: gestor ve equipe" ON public.pessoas FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

-- INSERT: usuario cria para si, admin para terceiro
CREATE POLICY "Pessoas: usuario insere para si" ON public.pessoas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Pessoas: admin insere para terceiro" ON public.pessoas FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- UPDATE: usuario atualiza proprias, admin atualiza qualquer
CREATE POLICY "Pessoas: usuario atualiza proprias" ON public.pessoas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Pessoas: admin atualiza qualquer" ON public.pessoas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

-- DELETE: admin exclui
CREATE POLICY "Pessoas: admin exclui" ON public.pessoas FOR DELETE
  USING (public.is_admin_safe());

-- ============================================================
-- 4. RLS — pessoa_vinculos
-- ============================================================

ALTER TABLE public.pessoa_vinculos ENABLE ROW LEVEL SECURITY;

-- SELECT: via pessoa (usuario da pessoa ou admin/gestor)
CREATE POLICY "Vinculos: usuario ve proprios" ON public.pessoa_vinculos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND p.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "Vinculos: gestor ve equipe" ON public.pessoa_vinculos FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND public.is_gestor_da_equipe(p.usuario_id))
  );

-- INSERT: usuario cria vinculo para pessoa propria, admin para terceiro
CREATE POLICY "Vinculos: usuario insere" ON public.pessoa_vinculos FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pessoas p WHERE p.id = pessoa_vinculos.pessoa_id AND p.usuario_id = auth.uid())
  );

CREATE POLICY "Vinculos: admin insere" ON public.pessoa_vinculos FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- DELETE: admin exclui
CREATE POLICY "Vinculos: admin exclui" ON public.pessoa_vinculos FOR DELETE
  USING (public.is_admin_safe());

COMMIT;

-- ============================================================
-- 20261118000002  (20261118000002_create_jornadas.sql)
-- ============================================================
-- Migration: 20261118000002_create_jornadas.sql
-- Objetivo: Criar tabelas para as tres jornadas independentes (comercial, indicador, recrutamento).
-- Principio: FK para pessoas (identidade central) e vínculos. RLS por cargo. Historico e reunioes.
-- Compatibilidade: 10 perfis oficiais. Nao alterar migrations historicas.

BEGIN;

-- ============================================================
-- 1. TABELA jornadas
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id UUID REFERENCES public.pessoas(id) ON DELETE SET NULL,
  contato_id TEXT NOT NULL,
  contato_tipo TEXT NOT NULL CHECK (contato_tipo IN ('cliente', 'lead')),
  jornada_tipo TEXT NOT NULL CHECK (jornada_tipo IN ('cliente', 'indicador', 'recrutamento')),
  ativa BOOLEAN NOT NULL DEFAULT FALSE,
  etapa TEXT,
  iniciada_em TIMESTAMPTZ,
  encerrada_em TIMESTAMPTZ,
  responsavel TEXT,
  observacoes TEXT,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pessoa_id, jornada_tipo)
);

CREATE INDEX IF NOT EXISTS idx_jornadas_pessoa_id ON public.jornadas(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_contato ON public.jornadas(contato_tipo, contato_id);
CREATE INDEX IF NOT EXISTS idx_jornadas_usuario_id ON public.jornadas(usuario_id);

-- ============================================================
-- 2. TABELA jornada_historico
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornada_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  etapa TEXT NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responsavel TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jornada_historico_jornada_id ON public.jornada_historico(jornada_id);

-- ============================================================
-- 3. TABELA jornada_reunioes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.jornada_reunioes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  data TIMESTAMPTZ NOT NULL,
  resultado TEXT NOT NULL CHECK (resultado IN ('positivo', 'neutro', 'negativo')),
  oportunidades TEXT[],
  observacoes TEXT,
  responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jornada_reunioes_jornada_id ON public.jornada_reunioes(jornada_id);

-- ============================================================
-- 4. RLS — jornadas
-- ============================================================

ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jornadas: usuario ve proprias" ON public.jornadas FOR SELECT
  USING (usuario_id = auth.uid() OR public.is_admin_safe());

CREATE POLICY "Jornadas: gestor ve equipe" ON public.jornadas FOR SELECT
  USING (public.is_gestor_da_equipe(usuario_id));

CREATE POLICY "Jornadas: usuario insere para si" ON public.jornadas FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Jornadas: admin insere para terceiro" ON public.jornadas FOR INSERT
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Jornadas: usuario atualiza proprias" ON public.jornadas FOR UPDATE
  USING (auth.uid() = usuario_id)
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Jornadas: admin atualiza qualquer" ON public.jornadas FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "Jornadas: admin exclui" ON public.jornadas FOR DELETE
  USING (public.is_admin_safe());

-- ============================================================
-- 5. RLS — jornada_historico
-- ============================================================

ALTER TABLE public.jornada_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "JornadaHistorico: usuario ve proprios" ON public.jornada_historico FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND j.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "JornadaHistorico: gestor ve equipe" ON public.jornada_historico FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND public.is_gestor_da_equipe(j.usuario_id))
  );

CREATE POLICY "JornadaHistorico: usuario insere" ON public.jornada_historico FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_historico.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaHistorico: admin insere" ON public.jornada_historico FOR INSERT
  WITH CHECK (public.is_admin_safe());

-- ============================================================
-- 6. RLS — jornada_reunioes
-- ============================================================

ALTER TABLE public.jornada_reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "JornadaReunioes: usuario ve proprias" ON public.jornada_reunioes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
    OR public.is_admin_safe()
  );

CREATE POLICY "JornadaReunioes: gestor ve equipe" ON public.jornada_reunioes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND public.is_gestor_da_equipe(j.usuario_id))
  );

CREATE POLICY "JornadaReunioes: usuario insere" ON public.jornada_reunioes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaReunioes: admin insere" ON public.jornada_reunioes FOR INSERT
  WITH CHECK (public.is_admin_safe());

CREATE POLICY "JornadaReunioes: usuario atualiza proprias" ON public.jornada_reunioes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.jornadas j WHERE j.id = jornada_reunioes.jornada_id AND j.usuario_id = auth.uid())
  );

CREATE POLICY "JornadaReunioes: admin atualiza qualquer" ON public.jornada_reunioes FOR UPDATE
  USING (public.is_admin_safe())
  WITH CHECK (public.is_admin_safe());

COMMIT;

-- ============================================================
-- 20261121000002  (20261121000002_fix_rls_recursao_policies.sql)
-- ============================================================
-- Migration: 20261121000002_fix_rls_recursao_policies.sql
-- Corrige recursão RLS (42P17) causada por policies duplicadas que consultam
-- profiles diretamente via EXISTS, criando referência circular.
-- Mantém apenas as policies que usam funções SECURITY DEFINER (is_admin_safe,
-- is_gestor_da_equipe) que bypassam RLS e não geram recursão.

BEGIN;

-- === CLIENTES: remover policies antigas com subquery direta em profiles ===
DROP POLICY IF EXISTS "Gestors can delete team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can delete any cliente" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can view team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can view all clientes" ON public.clientes;
DROP POLICY IF EXISTS "Gestors can update team clientes" ON public.clientes;
DROP POLICY IF EXISTS "Admins can update any cliente" ON public.clientes;

-- === LEADS: remover policies antigas com subquery direta em profiles ===
DROP POLICY IF EXISTS "Admins can delete any lead" ON public.leads;
DROP POLICY IF EXISTS "Gestors can delete team leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Gestors can view team leads" ON public.leads;
DROP POLICY IF EXISTS "Admins can update any lead" ON public.leads;
DROP POLICY IF EXISTS "Gestors can update team leads" ON public.leads;

-- === PROFILES: recriar "gestor ve perfis da equipe" sem subquery em profiles ===
-- A policy original fazia is_gestor_da_equipe(id) AND EXISTS(SELECT 1 FROM profiles p ...)
-- que causava recursão. is_gestor_da_equipe já é SECURITY DEFINER e cobre a lógica.
DROP POLICY IF EXISTS "Profiles: gestor ve perfis da equipe" ON public.profiles;
CREATE POLICY "Profiles: gestor ve perfis da equipe" ON public.profiles
  FOR SELECT USING (is_gestor_da_equipe(id));

-- === PROFILES: remover policy antiga "Profiles: usuario pode ver o proprio perfil"
-- que mistura uid() = id com is_admin_safe() (ambos OK, mas redundante com as novas).
-- Mantida pois é necessária para o usuário ver o próprio perfil.

COMMIT;

-- ============================================================
-- 20261121000003  (20261121000003_fix_policies_inline_profiles_funcoes.sql)
-- ============================================================
-- Migration: 20261121000003_fix_policies_inline_profiles_funcoes.sql
-- Objetivo: corrigir a CAUSA ESTRUTURAL das policies que consultam `profiles`
-- diretamente (subquery inline). Essas subqueries, embora hoje não gerem
-- recursão (as policies de profiles usam apenas funções SECURITY DEFINER),
-- representam risco estrutural de recursão 42P17 e avaliam RLS aninhada.
--
-- Esta migration substitui, ONDE A EQUIVALÊNCIA ESTÁ COMPROVADA, as subqueries
-- inline por funções auxiliares SECURITY DEFINER (bypassam RLS):
--   * (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.perfil = 'Administrador'))
--       => public.is_admin_perfil()
--   * (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--             AND profiles.perfil IN ('Administrador','Gestor')))
--       => public.is_gestor_ou_admin_perfil()
--
-- Prova de equivalência: a única linha de `profiles` pertinente/visível ao
-- chamador é a própria linha (profiles.id = auth.uid()), pois a condição do
-- sub-select exige profiles.id = auth.uid(). Logo, o valor booleano é idêntico
-- ao de SELECT ... FROM profiles WHERE id = auth.uid() [AND perfil ...].
-- Nenhuma permissão é ampliada ou reduzida; o comportamento é preservado.
--
-- São preservadas intactas as policies de semântica DIFERENTE:
--   * "X: admin pode inserir para terceiro" (WITH CHECK is_admin_safe() AND
--     EXISTS(SELECT 1 FROM profiles p WHERE p.id = X.usuario_id AND p.ativo))
--   * "Gestors can view team metas" (hierarchy via metas.usuario_id/gestor_id)
--   * Demais policies que já usam is_admin_safe()/is_gestor_da_equipe().

BEGIN;

-- Garante que pg_get_expr qualifique auth.uid() como "auth.uid()" (e não "uid()")
-- durante o deparse, independentemente do search_path do papel executor.
SET LOCAL search_path TO "$user", public;

CREATE OR REPLACE FUNCTION public.is_admin_perfil()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND perfil = 'Administrador'
  );
$fn$;

CREATE OR REPLACE FUNCTION public.is_gestor_ou_admin_perfil()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND perfil IN ('Administrador','Gestor')
  );
$fn$;

REVOKE ALL ON FUNCTION public.is_admin_perfil() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_gestor_ou_admin_perfil() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_perfil() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_gestor_ou_admin_perfil() TO anon, authenticated, service_role;

DO $do$
DECLARE
  pat_a CONSTANT TEXT := '(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = ''Administrador''::text))))';
  pat_b CONSTANT TEXT := '(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.perfil = ANY (ARRAY[''Administrador''::text, ''Gestor''::text])))))';
  r RECORD;
  v_noq TEXT; v_nowc TEXT; v_nq TEXT; v_nwc TEXT;
  v_cmd TEXT; v_using TEXT; v_check TEXT; v_sql TEXT;
  v_changed BOOLEAN;
  n INT := 0;
BEGIN
  FOR r IN
    SELECT p.polrelid, p.polname, p.polcmd,
           nsp.nspname, c.relname,
           pg_get_expr(p.polqual, p.polrelid)      AS oq,
           pg_get_expr(p.polwithcheck, p.polrelid) AS owc
    FROM pg_policy p
    JOIN pg_class c    ON c.oid = p.polrelid
    JOIN pg_namespace nsp ON nsp.oid = c.relnamespace
    WHERE nsp.nspname = 'public'
  LOOP
    v_noq  := CASE WHEN r.oq  IS NULL THEN NULL ELSE regexp_replace(r.oq,  '\s+', ' ', 'g') END;
    v_nowc := CASE WHEN r.owc IS NULL THEN NULL ELSE regexp_replace(r.owc, '\s+', ' ', 'g') END;

    v_changed :=
         (v_noq  IS NOT NULL AND (position(pat_a in v_noq)  > 0 OR position(pat_b in v_noq)  > 0))
      OR (v_nowc IS NOT NULL AND (position(pat_a in v_nowc) > 0 OR position(pat_b in v_nowc) > 0));

    IF NOT v_changed THEN
      CONTINUE;
    END IF;

    v_nq  := CASE WHEN v_noq  IS NULL THEN NULL
                  ELSE replace(replace(v_noq,  pat_a, 'is_admin_perfil()'), pat_b, 'is_gestor_ou_admin_perfil()') END;
    v_nwc := CASE WHEN v_nowc IS NULL THEN NULL
                  ELSE replace(replace(v_nowc, pat_a, 'is_admin_perfil()'), pat_b, 'is_gestor_ou_admin_perfil()') END;

    v_cmd := CASE r.polcmd
               WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
               WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
               WHEN '*' THEN 'ALL' END;
    v_using := CASE WHEN v_nq  IS NULL THEN '' ELSE ' USING (' || v_nq  || ')' END;
    v_check := CASE WHEN v_nwc IS NULL THEN '' ELSE ' WITH CHECK (' || v_nwc || ')' END;

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.polname, r.nspname, r.relname);
    v_sql := format('CREATE POLICY %I ON %I.%I FOR %s%s%s',
                    r.polname, r.nspname, r.relname, v_cmd, v_using, v_check);
    EXECUTE v_sql;
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'Policies reescritas com funcoes auxiliares: %', n;
END
$do$;

COMMIT;

-- ============================================================
-- 20261121000004  (20261121000004_altera_jornada_reunioes_resultado.sql)
-- ============================================================
-- Migration: 20261121000004_altera_jornada_reunioes_resultado.sql
-- Objetivo: permitir que jornada_reunioes.resultado armazene os resultados
-- ricos da Central de Jornadas (ResultadoReuniao) ALÉM dos valores legados.
-- Aditivo: mantém 'positivo','neutro','negativo' e acrescenta os novos valores.
-- Não destrutivo: não remove dados; apenas amplia o CHECK.

BEGIN;

DO $do$
DECLARE
  cname text;
BEGIN
  SELECT conname INTO cname
  FROM pg_constraint
  WHERE conrelid = 'public.jornada_reunioes'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%resultado%'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.jornada_reunioes DROP CONSTRAINT %I', cname);
  END IF;

  ALTER TABLE public.jornada_reunioes
    ADD CONSTRAINT jornada_reunioes_resultado_check
    CHECK (resultado IN (
      'positivo','neutro','negativo',
      'interesse_credito','interesse_indicador','interesse_equipe',
      'multiplas_oportunidades','sem_interesse'
    ));
END
$do$;

COMMIT;
