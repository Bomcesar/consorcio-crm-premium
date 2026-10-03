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
