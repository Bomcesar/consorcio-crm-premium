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