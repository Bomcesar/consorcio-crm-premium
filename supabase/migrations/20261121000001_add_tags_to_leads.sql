-- Migration: 20261121000001_add_tags_to_leads.sql
-- Adiciona coluna tags na tabela leads para suportar etiquetas comerciais.

BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags TEXT;

COMMIT;