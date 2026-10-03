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
