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