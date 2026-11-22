-- ============================================================
-- Estagio B3 - Restricao final que valida dados existentes
-- Aplicar SOMENTE apos 00-pre-voo.sql e 01-pacote-aditivo.sql, e apos B1/B2 (para B2/B3).
-- Ordem interna preservada; cada migration em BEGIN/COMMIT proprio.
-- ============================================================

-- 20261121000004  (20261121000004_altera_jornada_reunioes_resultado.sql)
-- ============================================================
-- Migration: 20261121000004_altera_jornada_reunioes_resultado.sql
-- Objetivo: permitir que jornada_reunioes.resultado armazene os resultados
-- ricos da Central de Jornadas (ResultadoReuniao) ALÃ‰M dos valores legados.
-- Aditivo: mantÃ©m 'positivo','neutro','negativo' e acrescenta os novos valores.
-- NÃ£o destrutivo: nÃ£o remove dados; apenas amplia o CHECK.

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

