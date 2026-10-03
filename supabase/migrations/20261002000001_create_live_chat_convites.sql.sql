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
