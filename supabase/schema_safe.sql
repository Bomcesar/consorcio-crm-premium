-- ==========================================
-- Migration: 20250630000000_init_profiles.sql
-- ==========================================
-- Profiles table linked to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  perfil TEXT NOT NULL DEFAULT 'Consultor' CHECK (perfil IN ('Administrador', 'Gestor', 'Consultor', 'Trainee', 'Secretaria', 'Indicador')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_perfil TEXT;
  v_avatar_url TEXT;
BEGIN
  v_nome := COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), split_part(NEW.email, '@', 1));
  v_perfil := COALESCE(NULLIF(NEW.raw_user_meta_data->>'perfil', ''), 'Consultor');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  IF v_perfil NOT IN ('Administrador', 'Gestor', 'Consultor', 'Trainee', 'Secretaria', 'Indicador') THEN
    v_perfil := 'Consultor';
  END IF;

  INSERT INTO public.profiles (id, nome, email, perfil, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, v_perfil, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        perfil = EXCLUDED.perfil,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();

CREATE INDEX IF NOT EXISTS profiles_perfil_idx
  ON public.profiles (perfil);

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (email);

-- ==========================================
-- Migration: 20260709000000_create_leads.sql
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Novo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_leads_updated_at();

-- ==========================================
-- Migration: 20260712000000_unify_profiles_schema.sql
-- ==========================================
-- Consolidate profiles into a single auth-compatible schema.
-- This migration repairs the legacy profiles table and removes the role-based model.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  perfil TEXT NOT NULL DEFAULT 'Indicador',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login TIMESTAMPTZ,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS perfil TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ;

UPDATE public.profiles
SET perfil = CASE
  WHEN role = 'admin' THEN 'Administrador'
  WHEN role = 'vendedor' THEN 'Consultor'
  WHEN role = 'backoffice' THEN 'Secretaria'
  ELSE 'Indicador'
END
WHERE perfil IS NULL
  AND role IS NOT NULL;

ALTER TABLE public.profiles
  ALTER COLUMN perfil SET DEFAULT 'Indicador';

ALTER TABLE public.profiles
  ALTER COLUMN perfil TYPE TEXT;

ALTER TABLE public.profiles
  ALTER COLUMN perfil SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles DROP COLUMN role;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_perfil_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_perfil_check
      CHECK (perfil IN (
        'Administrador',
        'Gestor',
        'Consultor',
        'Trainee',
        'Secretaria',
        'Indicador'
      )) NOT VALID;
  END IF;
END $$;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_perfil_check;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.perfil = 'Administrador'
    )
  );

CREATE POLICY "Authenticated users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.perfil = 'Administrador'
    )
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_perfil TEXT;
  v_avatar_url TEXT;
BEGIN
  v_nome := trim(COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), split_part(NEW.email, '@', 1)));
  v_perfil := COALESCE(NULLIF(NEW.raw_user_meta_data->>'perfil', ''), 'Indicador');
  v_avatar_url := NULLIF(NEW.raw_user_meta_data->>'avatar_url', '');

  IF v_perfil NOT IN ('Administrador', 'Gestor', 'Consultor', 'Trainee', 'Secretaria', 'Indicador') THEN
    v_perfil := 'Indicador';
  END IF;

  INSERT INTO public.profiles (id, nome, email, perfil, ativo, ultimo_login, avatar_url)
  VALUES (NEW.id, v_nome, NEW.email, v_perfil, TRUE, NULL, v_avatar_url)
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome,
        email = EXCLUDED.email,
        perfil = EXCLUDED.perfil,
        ativo = EXCLUDED.ativo,
        ultimo_login = EXCLUDED.ultimo_login,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_profiles_updated_at();

CREATE INDEX IF NOT EXISTS profiles_perfil_idx
  ON public.profiles (perfil);

CREATE INDEX IF NOT EXISTS profiles_email_idx
  ON public.profiles (email);

COMMIT;

-- ==========================================
-- Migration: 20260715000000_create_indicator_central.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.central_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  perfil TEXT NOT NULL DEFAULT 'Indicador',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.central_indicadores ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.central_indicador_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.central_indicadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  etapa TEXT NOT NULL DEFAULT 'Contatos indicados',
  status TEXT NOT NULL DEFAULT 'Em prospecção',
  observacoes TEXT NOT NULL DEFAULT '',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.central_indicador_contatos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.central_indicador_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.central_indicadores(id) ON DELETE CASCADE,
  contato_id UUID REFERENCES public.central_indicador_contatos(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  etapa TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.central_indicador_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view indicator central" ON public.central_indicadores;
DROP POLICY IF EXISTS "Authenticated users can insert indicator central" ON public.central_indicadores;
DROP POLICY IF EXISTS "Authenticated users can update indicator central" ON public.central_indicadores;

CREATE POLICY "Authenticated users can view indicator central"
  ON public.central_indicadores FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indicator central"
  ON public.central_indicadores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indicator central"
  ON public.central_indicadores FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view indicator contacts" ON public.central_indicador_contatos;
DROP POLICY IF EXISTS "Authenticated users can insert indicator contacts" ON public.central_indicador_contatos;
DROP POLICY IF EXISTS "Authenticated users can update indicator contacts" ON public.central_indicador_contatos;

CREATE POLICY "Authenticated users can view indicator contacts"
  ON public.central_indicador_contatos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indicator contacts"
  ON public.central_indicador_contatos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indicator contacts"
  ON public.central_indicador_contatos FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view indicator history" ON public.central_indicador_historico;
DROP POLICY IF EXISTS "Authenticated users can insert indicator history" ON public.central_indicador_historico;
DROP POLICY IF EXISTS "Authenticated users can update indicator history" ON public.central_indicador_historico;

CREATE POLICY "Authenticated users can view indicator history"
  ON public.central_indicador_historico FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert indicator history"
  ON public.central_indicador_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update indicator history"
  ON public.central_indicador_historico FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION public.update_central_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_central_indicador_contatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_central_indicadores_updated_at ON public.central_indicadores;
CREATE TRIGGER update_central_indicadores_updated_at
BEFORE UPDATE ON public.central_indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_central_indicadores_updated_at();

DROP TRIGGER IF EXISTS update_central_indicador_contatos_updated_at ON public.central_indicador_contatos;
CREATE TRIGGER update_central_indicador_contatos_updated_at
BEFORE UPDATE ON public.central_indicador_contatos
FOR EACH ROW
EXECUTE FUNCTION public.update_central_indicador_contatos_updated_at();

CREATE INDEX IF NOT EXISTS central_indicadores_status_idx
  ON public.central_indicadores (status);

CREATE INDEX IF NOT EXISTS central_indicador_contatos_indicator_idx
  ON public.central_indicador_contatos (indicador_id);

CREATE INDEX IF NOT EXISTS central_indicador_historico_indicator_idx
  ON public.central_indicador_historico (indicador_id);

COMMIT;

-- ==========================================
-- Migration: 20260801000000_create_indicadores_table.sql
-- ==========================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  cpf TEXT NOT NULL DEFAULT '',
  pix TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_indicadores_updated_at ON public.indicadores;
CREATE TRIGGER update_indicadores_updated_at
BEFORE UPDATE ON public.indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_indicadores_updated_at();

CREATE INDEX IF NOT EXISTS indicadores_usuario_id_idx
  ON public.indicadores (usuario_id);

CREATE INDEX IF NOT EXISTS indicadores_status_idx
  ON public.indicadores (status);

CREATE INDEX IF NOT EXISTS indicadores_ativo_idx
  ON public.indicadores (ativo);

DROP POLICY IF EXISTS "Authenticated users can view their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can view their indicators"
  ON public.indicadores FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can insert their indicators"
  ON public.indicadores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can update their indicators"
  ON public.indicadores FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their indicators" ON public.indicadores;
CREATE POLICY "Authenticated users can delete their indicators"
  ON public.indicadores FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260801000001_add_whatsapp_group_fields.sql
-- ==========================================
BEGIN;

ALTER TABLE public.indicadores
  ADD COLUMN IF NOT EXISTS grupo_whatsapp BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS link_grupo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS grupo_criado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.update_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_indicadores_updated_at ON public.indicadores;
CREATE TRIGGER update_indicadores_updated_at
BEFORE UPDATE ON public.indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_indicadores_updated_at();

COMMIT;

-- ==========================================
-- Migration: 20260801000002_create_contatos_indicados.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.contatos_indicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Novo',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.contatos_indicados ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_contatos_indicados_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_contatos_indicados_updated_at ON public.contatos_indicados;
CREATE TRIGGER update_contatos_indicados_updated_at
BEFORE UPDATE ON public.contatos_indicados
FOR EACH ROW
EXECUTE FUNCTION public.update_contatos_indicados_updated_at();

CREATE INDEX IF NOT EXISTS contatos_indicados_indicador_id_idx
  ON public.contatos_indicados (indicador_id);

CREATE INDEX IF NOT EXISTS contatos_indicados_usuario_id_idx
  ON public.contatos_indicados (usuario_id);

CREATE INDEX IF NOT EXISTS contatos_indicados_status_idx
  ON public.contatos_indicados (status);

DROP POLICY IF EXISTS "Authenticated users can view their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can view their indicated contacts"
  ON public.contatos_indicados FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can insert their indicated contacts"
  ON public.contatos_indicados FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can update their indicated contacts"
  ON public.contatos_indicados FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their indicated contacts" ON public.contatos_indicados;
CREATE POLICY "Authenticated users can delete their indicated contacts"
  ON public.contatos_indicados FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260801000003_create_comissoes_indicadores.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.comissoes_indicadores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pendente',
  pix TEXT NOT NULL DEFAULT '',
  data_pagamento DATE NULL,
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comissoes_indicadores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_comissoes_indicadores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comissoes_indicadores_updated_at ON public.comissoes_indicadores;
CREATE TRIGGER update_comissoes_indicadores_updated_at
BEFORE UPDATE ON public.comissoes_indicadores
FOR EACH ROW
EXECUTE FUNCTION public.update_comissoes_indicadores_updated_at();

CREATE INDEX IF NOT EXISTS comissoes_indicadores_indicador_id_idx
  ON public.comissoes_indicadores (indicador_id);

CREATE INDEX IF NOT EXISTS comissoes_indicadores_usuario_id_idx
  ON public.comissoes_indicadores (usuario_id);

CREATE INDEX IF NOT EXISTS comissoes_indicadores_status_idx
  ON public.comissoes_indicadores (status);

DROP POLICY IF EXISTS "Authenticated users can view their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can view their indicator commissions"
  ON public.comissoes_indicadores FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can insert their indicator commissions"
  ON public.comissoes_indicadores FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can update their indicator commissions"
  ON public.comissoes_indicadores FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete their indicator commissions" ON public.comissoes_indicadores;
CREATE POLICY "Authenticated users can delete their indicator commissions"
  ON public.comissoes_indicadores FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260812000000_create_clientes.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  cpf_cnpj TEXT NOT NULL DEFAULT '',
  cidade TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  origem TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_clientes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_clientes_updated_at ON public.clientes;
CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_clientes_updated_at();

CREATE POLICY "Authenticated users can view clients"
  ON public.clientes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update clients"
  ON public.clientes FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete clients"
  ON public.clientes FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS clientes_status_idx
  ON public.clientes (status);

CREATE INDEX IF NOT EXISTS clientes_nome_idx
  ON public.clientes (nome);

COMMIT;

-- ==========================================
-- Migration: 20260812000001_create_agenda.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  local TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Reunião',
  status TEXT NOT NULL DEFAULT 'Agendado',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_agenda_eventos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_agenda_eventos_updated_at ON public.agenda_eventos;
CREATE TRIGGER update_agenda_eventos_updated_at
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agenda_eventos_updated_at();

CREATE POLICY "Authenticated users can view their agenda events"
  ON public.agenda_eventos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their agenda events"
  ON public.agenda_eventos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their agenda events"
  ON public.agenda_eventos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their agenda events"
  ON public.agenda_eventos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS agenda_eventos_usuario_id_idx
  ON public.agenda_eventos (usuario_id);

CREATE INDEX IF NOT EXISTS agenda_eventos_data_inicio_idx
  ON public.agenda_eventos (data_inicio);

COMMIT;

-- ==========================================
-- Migration: 20260812000002_create_whatsapp.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL DEFAULT '',
  mensagem TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'texto',
  status TEXT NOT NULL DEFAULT 'pendente',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their whatsapp messages"
  ON public.whatsapp_mensagens FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their whatsapp messages"
  ON public.whatsapp_mensagens FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their whatsapp messages"
  ON public.whatsapp_mensagens FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their whatsapp messages"
  ON public.whatsapp_mensagens FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS whatsapp_mensagens_usuario_id_idx
  ON public.whatsapp_mensagens (usuario_id);

CREATE INDEX IF NOT EXISTS whatsapp_mensagens_status_idx
  ON public.whatsapp_mensagens (status);

COMMIT;

-- ==========================================
-- Migration: 20260812000003_create_negociacoes.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.negociacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  etapa TEXT NOT NULL DEFAULT 'Prospecção',
  probabilidade INTEGER NOT NULL DEFAULT 0 CHECK (probabilidade >= 0 AND probabilidade <= 100),
  data_prevista DATE NOT NULL DEFAULT NOW(),
  observacoes TEXT NOT NULL DEFAULT '',
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.negociacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_negociacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_negociacoes_updated_at ON public.negociacoes;
CREATE TRIGGER update_negociacoes_updated_at
  BEFORE UPDATE ON public.negociacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_negociacoes_updated_at();

CREATE POLICY "Authenticated users can view their negotiations"
  ON public.negociacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their negotiations"
  ON public.negociacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their negotiations"
  ON public.negociacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their negotiations"
  ON public.negociacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS negociacoes_usuario_id_idx
  ON public.negociacoes (usuario_id);

CREATE INDEX IF NOT EXISTS negociacoes_lead_id_idx
  ON public.negociacoes (lead_id);

CREATE INDEX IF NOT EXISTS negociacoes_etapa_idx
  ON public.negociacoes (etapa);

COMMIT;

-- ==========================================
-- Migration: 20260812000004_create_pos_venda.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.pos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'Follow-up',
  descricao TEXT NOT NULL DEFAULT '',
  data_prevista DATE NOT NULL DEFAULT NOW(),
  data_realizada DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pos_venda ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_pos_venda_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_pos_venda_updated_at ON public.pos_venda;
CREATE TRIGGER update_pos_venda_updated_at
  BEFORE UPDATE ON public.pos_venda
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pos_venda_updated_at();

CREATE POLICY "Authenticated users can view their pos-venda"
  ON public.pos_venda FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos-venda"
  ON public.pos_venda FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their pos-venda"
  ON public.pos_venda FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos-venda"
  ON public.pos_venda FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS pos_venda_usuario_id_idx
  ON public.pos_venda (usuario_id);

CREATE INDEX IF NOT EXISTS pos_venda_status_idx
  ON public.pos_venda (status);

COMMIT;

-- ==========================================
-- Migration: 20260812000005_create_cobrancas.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(12,2) NOT NULL DEFAULT 0,
  metodo_pagamento TEXT NOT NULL DEFAULT '',
  data_vencimento DATE NOT NULL DEFAULT NOW(),
  data_pagamento DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  observacoes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_cobrancas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_cobrancas_updated_at ON public.cobrancas;
CREATE TRIGGER update_cobrancas_updated_at
  BEFORE UPDATE ON public.cobrancas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cobrancas_updated_at();

CREATE POLICY "Authenticated users can view their cobrancas"
  ON public.cobrancas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their cobrancas"
  ON public.cobrancas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their cobrancas"
  ON public.cobrancas FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their cobrancas"
  ON public.cobrancas FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cobrancas_usuario_id_idx
  ON public.cobrancas (usuario_id);

CREATE INDEX IF NOT EXISTS cobrancas_status_idx
  ON public.cobrancas (status);

COMMIT;

-- ==========================================
-- Migration: 20260813000000_create_assembleias.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.assembleias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT NOW(),
  numero_assembleia INTEGER NOT NULL DEFAULT 1,
  situacao TEXT NOT NULL DEFAULT 'Pendente',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assembleia_avisos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'aviso',
  descricao TEXT NOT NULL DEFAULT '',
  data_envio TIMESTAMPTZ NULL,
  enviado BOOLEAN NOT NULL DEFAULT false,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assembleia_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assembleia_id UUID NOT NULL REFERENCES public.assembleias(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'envio',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.assembleias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembleia_avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assembleia_historico ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_assembleias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_assembleias_updated_at ON public.assembleias;
CREATE TRIGGER update_assembleias_updated_at
  BEFORE UPDATE ON public.assembleias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_assembleias_updated_at();

CREATE POLICY "Authenticated users can view their assembleias"
  ON public.assembleias FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their assembleias"
  ON public.assembleias FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their assembleias"
  ON public.assembleias FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their assembleias"
  ON public.assembleias FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their assembleia avisos"
  ON public.assembleia_avisos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their assembleia avisos"
  ON public.assembleia_avisos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their assembleia avisos"
  ON public.assembleia_avisos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their assembleia avisos"
  ON public.assembleia_avisos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their assembleia historico"
  ON public.assembleia_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their assembleia historico"
  ON public.assembleia_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their assembleia historico"
  ON public.assembleia_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS assembleias_usuario_id_idx ON public.assembleias (usuario_id);
CREATE INDEX IF NOT EXISTS assembleias_cliente_id_idx ON public.assembleias (cliente_id);
CREATE INDEX IF NOT EXISTS assembleias_data_idx ON public.assembleias (data);
CREATE INDEX IF NOT EXISTS assembleia_avisos_assembleia_id_idx ON public.assembleia_avisos (assembleia_id);
CREATE INDEX IF NOT EXISTS assembleia_historico_assembleia_id_idx ON public.assembleia_historico (assembleia_id);

COMMIT;

-- ==========================================
-- Migration: 20260813000000_drop_orphan_central_tables.sql
-- ==========================================
BEGIN;

DROP TABLE IF EXISTS public.central_indicador_historico;
DROP TABLE IF EXISTS public.central_indicador_contatos;
DROP TABLE IF EXISTS public.central_indicadores;

DROP FUNCTION IF EXISTS public.update_central_indicadores_updated_at();
DROP FUNCTION IF EXISTS public.update_central_indicador_contatos_updated_at();

COMMIT;

-- ==========================================
-- Migration: 20260813000000_expand_agenda_module.sql
-- ==========================================
BEGIN;

ALTER TABLE public.agenda_eventos
  ADD COLUMN IF NOT EXISTS indicador_id UUID REFERENCES public.indicadores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS negociacao_id UUID REFERENCES public.negociacoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_venda_id UUID REFERENCES public.pos_venda(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proxima_acao TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_proxima_acao DATE,
  ADD COLUMN IF NOT EXISTS lembrete_em TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.agenda_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_inicio TIMESTAMPTZ NOT NULL,
  data_fim TIMESTAMPTZ NOT NULL,
  local TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Tarefa',
  status TEXT NOT NULL DEFAULT 'Pendente',
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  indicador_id UUID REFERENCES public.indicadores(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agenda_followups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID REFERENCES public.agenda_eventos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_prevista DATE NOT NULL DEFAULT NOW(),
  data_realizada DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.agenda_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_followups ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_agenda_tarefas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_agenda_tarefas_updated_at ON public.agenda_tarefas;
CREATE TRIGGER update_agenda_tarefas_updated_at
  BEFORE UPDATE ON public.agenda_tarefas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agenda_tarefas_updated_at();

CREATE OR REPLACE FUNCTION public.update_agenda_followups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_agenda_followups_updated_at ON public.agenda_followups;
CREATE TRIGGER update_agenda_followups_updated_at
  BEFORE UPDATE ON public.agenda_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agenda_followups_updated_at();

CREATE POLICY "Authenticated users can view their agenda tarefas"
  ON public.agenda_tarefas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their agenda tarefas"
  ON public.agenda_tarefas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their agenda tarefas"
  ON public.agenda_tarefas FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their agenda tarefas"
  ON public.agenda_tarefas FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their agenda followups"
  ON public.agenda_followups FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their agenda followups"
  ON public.agenda_followups FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their agenda followups"
  ON public.agenda_followups FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their agenda followups"
  ON public.agenda_followups FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS agenda_eventos_indicador_id_idx ON public.agenda_eventos (indicador_id);
CREATE INDEX IF NOT EXISTS agenda_eventos_negociacao_id_idx ON public.agenda_eventos (negociacao_id);
CREATE INDEX IF NOT EXISTS agenda_eventos_pos_venda_id_idx ON public.agenda_eventos (pos_venda_id);
CREATE INDEX IF NOT EXISTS agenda_tarefas_usuario_id_idx ON public.agenda_tarefas (usuario_id);
CREATE INDEX IF NOT EXISTS agenda_followups_evento_id_idx ON public.agenda_followups (evento_id);
CREATE INDEX IF NOT EXISTS agenda_followups_usuario_id_idx ON public.agenda_followups (usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260813000000_expand_pos_venda.sql
-- ==========================================
BEGIN;

ALTER TABLE public.pos_venda
  ADD COLUMN IF NOT EXISTS boleto_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lembrete_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retencao_motivo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS retencao_data TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.pos_venda_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id UUID NOT NULL REFERENCES public.pos_venda(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_venda_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id UUID NOT NULL REFERENCES public.pos_venda(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  data_prevista DATE NOT NULL DEFAULT NOW(),
  data_realizada DATE NULL,
  status TEXT NOT NULL DEFAULT 'Pendente',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pos_venda_comunicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id UUID NOT NULL REFERENCES public.pos_venda(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'whatsapp',
  descricao TEXT NOT NULL DEFAULT '',
  resultado TEXT NOT NULL DEFAULT '',
  data TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pos_venda_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_venda_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_venda_comunicacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their pos_venda_historico"
  ON public.pos_venda_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos_venda_historico"
  ON public.pos_venda_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos_venda_historico"
  ON public.pos_venda_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos_venda_tarefas"
  ON public.pos_venda_tarefas FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their pos_venda_comunicacoes"
  ON public.pos_venda_comunicacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS pos_venda_historico_pos_venda_id_idx ON public.pos_venda_historico (pos_venda_id);
CREATE INDEX IF NOT EXISTS pos_venda_tarefas_pos_venda_id_idx ON public.pos_venda_tarefas (pos_venda_id);
CREATE INDEX IF NOT EXISTS pos_venda_comunicacoes_pos_venda_id_idx ON public.pos_venda_comunicacoes (pos_venda_id);

COMMIT;

-- ==========================================
-- Migration: 20260813000001_create_loteria_lances.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.loteria_federal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_extracao INTEGER NOT NULL,
  data DATE NOT NULL DEFAULT NOW(),
  resultado TEXT NOT NULL DEFAULT '',
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT NOW(),
  assembleia_id UUID NULL REFERENCES public.assembleias(id) ON DELETE SET NULL,
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  resultado TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Aguardando',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loteria_federal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_loteria_federal_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_lances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_loteria_federal_updated_at ON public.loteria_federal;
CREATE TRIGGER update_loteria_federal_updated_at
  BEFORE UPDATE ON public.loteria_federal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_loteria_federal_updated_at();

DROP TRIGGER IF EXISTS update_lances_updated_at ON public.lances;
CREATE TRIGGER update_lances_updated_at
  BEFORE UPDATE ON public.lances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lances_updated_at();

CREATE POLICY "Authenticated users can view their loteria_federal"
  ON public.loteria_federal FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their loteria_federal"
  ON public.loteria_federal FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their loteria_federal"
  ON public.loteria_federal FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their loteria_federal"
  ON public.loteria_federal FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their lances"
  ON public.lances FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their lances"
  ON public.lances FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their lances"
  ON public.lances FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their lances"
  ON public.lances FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS loteria_federal_usuario_id_idx ON public.loteria_federal (usuario_id);
CREATE INDEX IF NOT EXISTS loteria_federal_data_idx ON public.loteria_federal (data);
CREATE INDEX IF NOT EXISTS lances_usuario_id_idx ON public.lances (usuario_id);
CREATE INDEX IF NOT EXISTS lances_assembleia_id_idx ON public.lances (assembleia_id);
CREATE INDEX IF NOT EXISTS lances_status_idx ON public.lances (status);

COMMIT;

-- ==========================================
-- Migration: 20260813000002_create_contemplacoes.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.contemplacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NULL REFERENCES public.clientes(id) ON DELETE SET NULL,
  grupo TEXT NOT NULL DEFAULT '',
  cota INTEGER NOT NULL DEFAULT 0,
  assembleia_id UUID NULL REFERENCES public.assembleias(id) ON DELETE SET NULL,
  data DATE NOT NULL DEFAULT NOW(),
  tipo TEXT NOT NULL DEFAULT 'Lance',
  resultado TEXT NOT NULL DEFAULT '',
  documentos TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contemplacao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contemplacao_id UUID NOT NULL REFERENCES public.contemplacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contemplacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contemplacao_historico ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_contemplacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_contemplacoes_updated_at ON public.contemplacoes;
CREATE TRIGGER update_contemplacoes_updated_at
  BEFORE UPDATE ON public.contemplacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contemplacoes_updated_at();

CREATE POLICY "Authenticated users can view their contemplacoes"
  ON public.contemplacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their contemplacoes"
  ON public.contemplacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their contemplacoes"
  ON public.contemplacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their contemplacoes"
  ON public.contemplacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can view their contemplacao historico"
  ON public.contemplacao_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their contemplacao historico"
  ON public.contemplacao_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their contemplacao historico"
  ON public.contemplacao_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS contemplacoes_usuario_id_idx ON public.contemplacoes (usuario_id);
CREATE INDEX IF NOT EXISTS contemplacoes_cliente_id_idx ON public.contemplacoes (cliente_id);
CREATE INDEX IF NOT EXISTS contemplacoes_assembleia_id_idx ON public.contemplacoes (assembleia_id);
CREATE INDEX IF NOT EXISTS contemplacao_historico_contemplacao_id_idx ON public.contemplacao_historico (contemplacao_id);

COMMIT;

-- ==========================================
-- Migration: 20260813000003_create_materiais_consultores.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.materiais_consultores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  arquivo_url TEXT NOT NULL DEFAULT '',
  arquivo_nome TEXT NOT NULL DEFAULT '',
  arquivo_tamanho INTEGER NOT NULL DEFAULT 0,
  arquivo_mime_type TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Documento',
  status TEXT NOT NULL DEFAULT 'Ativo',
  permite_download BOOLEAN NOT NULL DEFAULT true,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.materiais_consultores ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_materiais_consultores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_materiais_consultores_updated_at ON public.materiais_consultores;
CREATE TRIGGER update_materiais_consultores_updated_at
  BEFORE UPDATE ON public.materiais_consultores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_materiais_consultores_updated_at();

CREATE POLICY "Authenticated users can view active materiais_consultores"
  ON public.materiais_consultores FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'Ativo');

CREATE POLICY "Authenticated users with admin/gestor can insert materiais_consultores"
  ON public.materiais_consultores FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can update their materiais_consultores"
  ON public.materiais_consultores FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can delete their materiais_consultores"
  ON public.materiais_consultores FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS materiais_consultores_usuario_id_idx ON public.materiais_consultores (usuario_id);
CREATE INDEX IF NOT EXISTS materiais_consultores_categoria_idx ON public.materiais_consultores (categoria);
CREATE INDEX IF NOT EXISTS materiais_consultores_tipo_idx ON public.materiais_consultores (tipo);
CREATE INDEX IF NOT EXISTS materiais_consultores_status_idx ON public.materiais_consultores (status);

COMMIT;

-- ==========================================
-- Migration: 20260813000004_create_treinamentos.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.treinamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_treinamentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_treinamentos_updated_at ON public.treinamentos;
CREATE TRIGGER update_treinamentos_updated_at
  BEFORE UPDATE ON public.treinamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_treinamentos_updated_at();

CREATE POLICY "Authenticated users can view active treinamentos"
  ON public.treinamentos FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'Ativo');

CREATE POLICY "Authenticated users with admin/gestor can insert treinamentos"
  ON public.treinamentos FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can update their treinamentos"
  ON public.treinamentos FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can delete their treinamentos"
  ON public.treinamentos FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS treinamentos_usuario_id_idx ON public.treinamentos (usuario_id);
CREATE INDEX IF NOT EXISTS treinamentos_categoria_idx ON public.treinamentos (categoria);
CREATE INDEX IF NOT EXISTS treinamentos_status_idx ON public.treinamentos (status);

COMMIT;

-- ==========================================
-- Migration: 20260813000005_create_links_uteis.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.links_uteis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Ativo',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_links_uteis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_links_uteis_updated_at ON public.links_uteis;
CREATE TRIGGER update_links_uteis_updated_at
  BEFORE UPDATE ON public.links_uteis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_links_uteis_updated_at();

CREATE POLICY "Authenticated users can view active links_uteis"
  ON public.links_uteis FOR SELECT
  USING (auth.role() = 'authenticated' AND status = 'Ativo');

CREATE POLICY "Authenticated users with admin/gestor can insert links_uteis"
  ON public.links_uteis FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can update their links_uteis"
  ON public.links_uteis FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users with admin/gestor can delete their links_uteis"
  ON public.links_uteis FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS links_uteis_usuario_id_idx ON public.links_uteis (usuario_id);
CREATE INDEX IF NOT EXISTS links_uteis_categoria_idx ON public.links_uteis (categoria);
CREATE INDEX IF NOT EXISTS links_uteis_status_idx ON public.links_uteis (status);

COMMIT;

-- ==========================================
-- Migration: 20260814000000_create_comunicacao_module.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.comunicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL DEFAULT 'WhatsApp',
  contato TEXT NOT NULL DEFAULT '',
  observacao TEXT NOT NULL DEFAULT '',
  resultado TEXT NOT NULL DEFAULT '',
  data DATE NOT NULL DEFAULT NOW(),
  horario TIME NOT NULL DEFAULT NOW(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  indicador_id UUID REFERENCES public.indicadores(id) ON DELETE SET NULL,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comunicacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_comunicacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comunicacoes_updated_at ON public.comunicacoes;
CREATE TRIGGER update_comunicacoes_updated_at
  BEFORE UPDATE ON public.comunicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comunicacoes_updated_at();

CREATE POLICY "Authenticated users can view their comunicacoes"
  ON public.comunicacoes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their comunicacoes"
  ON public.comunicacoes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their comunicacoes"
  ON public.comunicacoes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their comunicacoes"
  ON public.comunicacoes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE TABLE IF NOT EXISTS public.comunicacao_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  conteudo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'WhatsApp',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.comunicacao_templates ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_comunicacao_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comunicacao_templates_updated_at ON public.comunicacao_templates;
CREATE TRIGGER update_comunicacao_templates_updated_at
  BEFORE UPDATE ON public.comunicacao_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comunicacao_templates_updated_at();

CREATE POLICY "Authenticated users can view their comunicacao templates"
  ON public.comunicacao_templates FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their comunicacao templates"
  ON public.comunicacao_templates FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their comunicacao templates"
  ON public.comunicacao_templates FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their comunicacao templates"
  ON public.comunicacao_templates FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS comunicacoes_usuario_id_idx ON public.comunicacoes (usuario_id);
CREATE INDEX IF NOT EXISTS comunicacoes_lead_id_idx ON public.comunicacoes (lead_id);
CREATE INDEX IF NOT EXISTS comunicacoes_cliente_id_idx ON public.comunicacoes (cliente_id);
CREATE INDEX IF NOT EXISTS comunicacoes_indicador_id_idx ON public.comunicacoes (indicador_id);
CREATE INDEX IF NOT EXISTS comunicacoes_data_idx ON public.comunicacoes (data);
CREATE INDEX IF NOT EXISTS comunicacao_templates_usuario_id_idx ON public.comunicacao_templates (usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260814000000_expand_leads_module.sql
-- ==========================================
BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS probabilidade INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.lead_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view lead historico"
  ON public.lead_historico FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert lead historico"
  ON public.lead_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.lead_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  tamanho INTEGER NOT NULL DEFAULT 0,
  usuario_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.lead_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to view lead anexos"
  ON public.lead_anexos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert lead anexos"
  ON public.lead_anexos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete lead anexos"
  ON public.lead_anexos FOR DELETE
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS idx_leads_origem ON public.leads(origem);
CREATE INDEX IF NOT EXISTS idx_lead_historico_lead_id ON public.lead_historico(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_anexos_lead_id ON public.lead_anexos(lead_id);

COMMIT;

-- ==========================================
-- Migration: 20260815000000_create_indicador_historico.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.indicador_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id UUID NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.indicador_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view indicator history"
  ON public.indicador_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert indicator history"
  ON public.indicador_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS indicador_historico_indicador_id_idx
  ON public.indicador_historico (indicador_id);

COMMIT;

-- ==========================================
-- Migration: 20260816000000_add_usuario_id_clientes.sql
-- ==========================================
BEGIN;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clientes;
CREATE POLICY "Authenticated users can view their clients"
  ON public.clientes FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clientes;
CREATE POLICY "Authenticated users can insert their clients"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clientes;
CREATE POLICY "Authenticated users can update their clients"
  ON public.clientes FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clientes;
CREATE POLICY "Authenticated users can delete their clients"
  ON public.clientes FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS clientes_usuario_id_idx
  ON public.clientes (usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260816000001_create_cliente_historico.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.cliente_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cliente_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their client history"
  ON public.cliente_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their client history"
  ON public.cliente_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cliente_historico_cliente_id_idx
  ON public.cliente_historico (cliente_id);

COMMIT;

-- ==========================================
-- Migration: 20260816000002_create_cliente_contatos.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.cliente_contatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'principal',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cliente_contatos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_cliente_contatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_cliente_contatos_updated_at ON public.cliente_contatos;
CREATE TRIGGER update_cliente_contatos_updated_at
  BEFORE UPDATE ON public.cliente_contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_cliente_contatos_updated_at();

CREATE POLICY "Authenticated users can view their client contacts"
  ON public.cliente_contatos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their client contacts"
  ON public.cliente_contatos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their client contacts"
  ON public.cliente_contatos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their client contacts"
  ON public.cliente_contatos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cliente_contatos_cliente_id_idx
  ON public.cliente_contatos (cliente_id);

CREATE INDEX IF NOT EXISTS cliente_contatos_usuario_id_idx
  ON public.cliente_contatos (usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260817000000_expand_negociacoes.sql
-- ==========================================
BEGIN;

ALTER TABLE public.negociacoes
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS modalidade TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposta TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS proxima_acao TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS data_proxima_acao DATE;

DROP INDEX IF EXISTS negociacoes_cliente_id_idx;
CREATE INDEX IF NOT EXISTS negociacoes_cliente_id_idx
  ON public.negociacoes (cliente_id);

COMMIT;

-- ==========================================
-- Migration: 20260817000001_create_negociacao_historico.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.negociacao_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id UUID NOT NULL REFERENCES public.negociacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.negociacao_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their negotiation history"
  ON public.negociacao_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their negotiation history"
  ON public.negociacao_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS negociacao_historico_negociacao_id_idx
  ON public.negociacao_historico (negociacao_id);

COMMIT;

-- ==========================================
-- Migration: 20260817000002_create_negociacao_anexos.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.negociacao_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id UUID NOT NULL REFERENCES public.negociacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  tamanho INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.negociacao_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their negotiation attachments"
  ON public.negociacao_anexos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their negotiation attachments"
  ON public.negociacao_anexos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their negotiation attachments"
  ON public.negociacao_anexos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS negociacao_anexos_negociacao_id_idx
  ON public.negociacao_anexos (negociacao_id);

COMMIT;

-- ==========================================
-- Migration: 20260818000000_create_universal_anexos.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL DEFAULT '',
  entity_id UUID NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  caminho TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  tamanho INTEGER NOT NULL DEFAULT 0,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_anexos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_anexos_updated_at ON public.anexos;
CREATE TRIGGER update_anexos_updated_at
  BEFORE UPDATE ON public.anexos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_anexos_updated_at();

CREATE POLICY "Authenticated users can view their anexos"
  ON public.anexos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their anexos"
  ON public.anexos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their anexos"
  ON public.anexos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their anexos"
  ON public.anexos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS anexos_usuario_id_idx ON public.anexos (usuario_id);
CREATE INDEX IF NOT EXISTS anexos_entity_idx ON public.anexos (entity_type, entity_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anexos',
  'anexos',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-rar-compressed',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'text/plain',
    'text/csv',
    'text/markdown'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload anexos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can view anexos"
  ON storage.objects FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can update anexos"
  ON storage.objects FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Authenticated users can delete anexos"
  ON storage.objects FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND bucket_id = 'anexos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

-- ==========================================
-- Migration: 20260819000000_expand_comissoes_indicadores.sql
-- ==========================================
BEGIN;

ALTER TABLE public.comissoes_indicadores
  ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS negociacao_id UUID REFERENCES public.negociacoes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS data_prevista DATE,
  ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'Venda';

DROP INDEX IF EXISTS comissoes_indicadores_cliente_id_idx;
CREATE INDEX IF NOT EXISTS comissoes_indicadores_cliente_id_idx
  ON public.comissoes_indicadores (cliente_id);

DROP INDEX IF EXISTS comissoes_indicadores_negociacao_id_idx;
CREATE INDEX IF NOT EXISTS comissoes_indicadores_negociacao_id_idx
  ON public.comissoes_indicadores (negociacao_id);

DROP INDEX IF EXISTS comissoes_indicadores_data_prevista_idx;
CREATE INDEX IF NOT EXISTS comissoes_indicadores_data_prevista_idx
  ON public.comissoes_indicadores (data_prevista);

COMMIT;

-- ==========================================
-- Migration: 20260820000000_expand_cobrancas.sql
-- ==========================================
BEGIN;

ALTER TABLE public.cobrancas
  ADD COLUMN IF NOT EXISTS numero_parcela INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_parcelas INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS boleto_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lembrete_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cliente_origem_id UUID;

CREATE TABLE IF NOT EXISTS public.cobranca_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cobranca_id UUID NOT NULL REFERENCES public.cobrancas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'observacao',
  descricao TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cobranca_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view their cobranca historico"
  ON public.cobranca_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their cobranca historico"
  ON public.cobranca_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their cobranca historico"
  ON public.cobranca_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE INDEX IF NOT EXISTS cobrancas_cliente_origem_id_idx ON public.cobrancas (cliente_origem_id);
CREATE INDEX IF NOT EXISTS cobranca_historico_cobranca_id_idx ON public.cobranca_historico (cobranca_id);

COMMIT;

-- ==========================================
-- Migration: 20260821000000_fix_leads_rls.sql
-- ==========================================
-- Fix leads RLS: add usuario_id and restrict access to owner
BEGIN;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS usuario_id UUID NOT NULL DEFAULT auth.uid()::uuid
  REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS leads_usuario_id_idx ON public.leads (usuario_id);

DROP POLICY IF EXISTS "Allow authenticated users to view leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to insert leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to update leads" ON public.leads;
DROP POLICY IF EXISTS "Allow authenticated users to delete leads" ON public.leads;

CREATE POLICY "Authenticated users can view their leads"
  ON public.leads FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their leads"
  ON public.leads FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their leads"
  ON public.leads FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260821000001_fix_lead_historico_rls.sql
-- ==========================================
-- Fix lead_historico RLS: align usuario_id type and restrict to owner
BEGIN;

ALTER TABLE public.lead_historico
  ALTER COLUMN usuario_id TYPE UUID USING usuario_id::UUID;

DROP POLICY IF EXISTS "Allow authenticated users to view lead historico" ON public.lead_historico;
DROP POLICY IF EXISTS "Allow authenticated users to insert lead historico" ON public.lead_historico;
DROP POLICY IF EXISTS "Allow authenticated users to delete lead historico" ON public.lead_historico;

CREATE POLICY "Authenticated users can view their lead historico"
  ON public.lead_historico FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their lead historico"
  ON public.lead_historico FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their lead historico"
  ON public.lead_historico FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their lead historico"
  ON public.lead_historico FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260821000002_fix_lead_anexos_rls.sql
-- ==========================================
-- Fix lead_anexos RLS: align usuario_id type and restrict to owner
BEGIN;

ALTER TABLE public.lead_anexos
  ALTER COLUMN usuario_id TYPE UUID USING usuario_id::UUID;

DROP POLICY IF EXISTS "Allow authenticated users to view lead anexos" ON public.lead_anexos;
DROP POLICY IF EXISTS "Allow authenticated users to insert lead anexos" ON public.lead_anexos;
DROP POLICY IF EXISTS "Allow authenticated users to delete lead anexos" ON public.lead_anexos;

CREATE POLICY "Authenticated users can view their lead anexos"
  ON public.lead_anexos FOR SELECT
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert their lead anexos"
  ON public.lead_anexos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can update their lead anexos"
  ON public.lead_anexos FOR UPDATE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can delete their lead anexos"
  ON public.lead_anexos FOR DELETE
  USING (auth.role() = 'authenticated' AND auth.uid() = usuario_id);

COMMIT;

-- ==========================================
-- Migration: 20260821000003_create_recrutamento.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.recrutamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  origem TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Novo',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recrutamento ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_recrutamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_recrutamento_updated_at ON public.recrutamento;
CREATE TRIGGER update_recrutamento_updated_at
  BEFORE UPDATE ON public.recrutamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_recrutamento_updated_at();

CREATE POLICY "Authenticated users can view own recrutamento"
  ON public.recrutamento FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert own recrutamento"
  ON public.recrutamento FOR INSERT
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can update own recrutamento"
  ON public.recrutamento FOR UPDATE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can delete own recrutamento"
  ON public.recrutamento FOR DELETE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS recrutamento_usuario_id_idx ON public.recrutamento (usuario_id);
CREATE INDEX IF NOT EXISTS recrutamento_status_idx ON public.recrutamento (status);

COMMIT;

-- ==========================================
-- Migration: 20260821000004_create_parceiros.sql
-- ==========================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT '',
  cnpj TEXT NOT NULL DEFAULT '',
  contato TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'Administradora',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT NOT NULL DEFAULT '',
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_parceiros_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_parceiros_updated_at ON public.parceiros;
CREATE TRIGGER update_parceiros_updated_at
  BEFORE UPDATE ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_parceiros_updated_at();

CREATE POLICY "Authenticated users can view own parceiros"
  ON public.parceiros FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Authenticated users can insert own parceiros"
  ON public.parceiros FOR INSERT
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can update own parceiros"
  ON public.parceiros FOR UPDATE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Authenticated users can delete own parceiros"
  ON public.parceiros FOR DELETE
  USING (
    auth.uid() = usuario_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE INDEX IF NOT EXISTS parceiros_usuario_id_idx ON public.parceiros (usuario_id);
CREATE INDEX IF NOT EXISTS parceiros_status_idx ON public.parceiros (status);

COMMIT;

-- ==========================================
-- Migration: 20260822000000_create_permissions_system.sql
-- ==========================================
BEGIN;

-- Tabela de permissões padrão do sistema
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL DEFAULT '',
  categoria TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de concessão de permissões por usuário
CREATE TABLE IF NOT EXISTS public.user_permission_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissao_id UUID NOT NULL REFERENCES public.user_permissions(id) ON DELETE CASCADE,
  concedido_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  concedido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(usuario_id, permissao_id)
);

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permission_grants ENABLE ROW LEVEL SECURITY;

-- Permissões padrão do sistema
INSERT INTO public.user_permissions (codigo, nome, categoria, descricao)
VALUES
  ('leads.ver', 'Ver Leads', 'Leads', 'Visualizar leads'),
  ('leads.criar', 'Criar Leads', 'Leads', 'Cadastrar novos leads'),
  ('leads.editar', 'Editar Leads', 'Leads', 'Editar leads existentes'),
  ('leads.excluir', 'Excluir Leads', 'Leads', 'Excluir leads'),
  ('leads.ver_todos', 'Ver Leads de Todos', 'Leads', 'Visualizar leads de toda a equipe'),
  ('clientes.ver', 'Ver Clientes', 'Clientes', 'Visualizar clientes'),
  ('clientes.criar', 'Criar Clientes', 'Clientes', 'Cadastrar novos clientes'),
  ('clientes.editar', 'Editar Clientes', 'Clientes', 'Editar clientes'),
  ('clientes.excluir', 'Excluir Clientes', 'Clientes', 'Excluir clientes'),
  ('clientes.ver_todos', 'Ver Clientes de Todos', 'Clientes', 'Visualizar clientes de toda a equipe'),
  ('indicadores.ver', 'Ver Indicadores', 'Indicadores', 'Visualizar indicadores'),
  ('indicadores.criar', 'Criar Indicadores', 'Indicadores', 'Cadastrar indicadores'),
  ('indicadores.editar', 'Editar Indicadores', 'Indicadores', 'Editar indicadores'),
  ('indicadores.excluir', 'Excluir Indicadores', 'Indicadores', 'Excluir indicadores'),
  ('indicadores.ver_todos', 'Ver Indicadores de Todos', 'Indicadores', 'Visualizar indicadores de toda a equipe'),
  ('agenda.ver', 'Ver Agenda', 'Agenda', 'Visualizar agenda'),
  ('agenda.criar', 'Criar Agenda', 'Agenda', 'Criar eventos na agenda'),
  ('agenda.editar', 'Editar Agenda', 'Agenda', 'Editar eventos da agenda'),
  ('agenda.excluir', 'Excluir Agenda', 'Agenda', 'Excluir eventos da agenda'),
  ('negociacoes.ver', 'Ver Negociações', 'Negociações', 'Visualizar negociações'),
  ('negociacoes.criar', 'Criar Negociações', 'Negociações', 'Criar negociações'),
  ('negociacoes.editar', 'Editar Negociações', 'Negociações', 'Editar negociações'),
  ('negociacoes.excluir', 'Excluir Negociações', 'Negociações', 'Excluir negociações'),
  ('negociacoes.ver_todas', 'Ver Negociações da Equipe', 'Negociações', 'Visualizar negociações de toda a equipe'),
  ('pos_venda.ver', 'Ver Pós-venda', 'Pós-venda', 'Visualizar pós-venda'),
  ('pos_venda.criar', 'Criar Pós-venda', 'Pós-venda', 'Criar pós-venda'),
  ('pos_venda.editar', 'Editar Pós-venda', 'Pós-venda', 'Editar pós-venda'),
  ('comissoes.ver_proprias', 'Ver Próprias Comissões', 'Comissões', 'Visualizar próprias comissões'),
  ('comissoes.ver_todas', 'Ver Comissões da Equipe', 'Comissões', 'Visualizar comissões de toda a equipe'),
  ('relatorios.ver', 'Ver Relatórios', 'Relatórios', 'Visualizar relatórios'),
  ('relatorios.ver_equipe', 'Ver Relatórios da Equipe', 'Relatórios', 'Visualizar relatórios da equipe'),
  ('metas.ver', 'Ver Metas', 'Metas', 'Visualizar metas'),
  ('metas.editar', 'Editar Metas', 'Metas', 'Editar metas'),
  ('materiais.ver', 'Ver Materiais', 'Materiais', 'Visualizar materiais'),
  ('materiais.criar', 'Criar Materiais', 'Materiais', 'Criar materiais'),
  ('materiais.editar', 'Editar Materiais', 'Materiais', 'Editar materiais'),
  ('materiais.excluir', 'Excluir Materiais', 'Materiais', 'Excluir materiais'),
  ('treinamentos.ver', 'Ver Treinamentos', 'Treinamentos', 'Visualizar treinamentos'),
  ('treinamentos.criar', 'Criar Treinamentos', 'Treinamentos', 'Criar treinamentos'),
  ('treinamentos.editar', 'Editar Treinamentos', 'Treinamentos', 'Editar treinamentos'),
  ('treinamentos.excluir', 'Excluir Treinamentos', 'Treinamentos', 'Excluir treinamentos'),
  ('usuarios.ver', 'Ver Usuários', 'Usuários', 'Visualizar usuários'),
  ('usuarios.criar', 'Criar Usuários', 'Usuários', 'Criar usuários'),
  ('usuarios.editar', 'Editar Usuários', 'Usuários', 'Editar usuários'),
  ('usuarios.excluir', 'Excluir Usuários', 'Usuários', 'Excluir/desativar usuários'),
  ('usuarios.permissoes', 'Gerenciar Permissões', 'Usuários', 'Gerenciar permissões de usuários'),
  ('configuracoes.ver', 'Ver Configurações', 'Configurações', 'Visualizar configurações'),
  ('configuracoes.editar', 'Editar Configurações', 'Configurações', 'Editar configurações do sistema')
ON CONFLICT (codigo) DO NOTHING;

-- Policies para user_permissions
CREATE POLICY "Authenticated users can view permissions"
  ON public.user_permissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert permissions"
  ON public.user_permissions FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can update permissions"
  ON public.user_permissions FOR UPDATE
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

CREATE POLICY "Only admins can delete permissions"
  ON public.user_permissions FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

-- Policies para user_permission_grants
CREATE POLICY "Users can view their own permission grants"
  ON public.user_permission_grants FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Only admins can insert permission grants"
  ON public.user_permission_grants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can update permission grants"
  ON public.user_permission_grants FOR UPDATE
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

CREATE POLICY "Only admins can delete permission grants"
  ON public.user_permission_grants FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE INDEX IF NOT EXISTS user_permission_grants_usuario_id_idx ON public.user_permission_grants (usuario_id);
CREATE INDEX IF NOT EXISTS user_permission_grants_permissao_id_idx ON public.user_permission_grants (permissao_id);

COMMIT;

-- ==========================================
-- Migration: 20260822000001_create_metas_system.sql
-- ==========================================
BEGIN;

-- Tabela de metas individuais e de equipe
CREATE TABLE IF NOT EXISTS public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL DEFAULT '',
  descricao TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'individual',
  valor_alvo NUMERIC NOT NULL DEFAULT 0,
  valor_realizado NUMERIC NOT NULL DEFAULT 0,
  periodo_inicio DATE NOT NULL DEFAULT NOW(),
  periodo_fim DATE NOT NULL DEFAULT NOW(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_aplicavel TEXT NOT NULL DEFAULT 'Consultor',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_metas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_metas_updated_at ON public.metas;
CREATE TRIGGER update_metas_updated_at
  BEFORE UPDATE ON public.metas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_metas_updated_at();

CREATE POLICY "Authenticated users can view relevant metas"
  ON public.metas FOR SELECT
  USING (
    (
      perfil_aplicavel IN ('Consultor', 'Assistente')
      AND (
        auth.uid() = usuario_id
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
            AND profiles.perfil IN ('Administrador', 'Gestor')
        )
      )
    )
    OR perfil_aplicavel = 'Equipe'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Only admins can insert metas"
  ON public.metas FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can update metas"
  ON public.metas FOR UPDATE
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

CREATE POLICY "Only admins can delete metas"
  ON public.metas FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE INDEX IF NOT EXISTS metas_usuario_id_idx ON public.metas (usuario_id);
CREATE INDEX IF NOT EXISTS metas_perfil_aplicavel_idx ON public.metas (perfil_aplicavel);
CREATE INDEX IF NOT EXISTS metas_periodo_idx ON public.metas (periodo_inicio, periodo_fim);

COMMIT;

-- ==========================================
-- Migration: 20260822000002_update_rls_for_roles.sql
-- ==========================================
BEGIN;

-- ============================================================
-- ADICIONA POLICIES PARA ADMIN/GESTOR VISUALIZAREM DADOS DA EQUIPE
-- Mantém policies existentes. NÃO remove policies antigas.
-- ============================================================

-- POLICIES DE PROFILES: tratadas na Migration 4 (funções SECURITY DEFINER)
-- para evitar recursão RLS.

-- LEADS: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all leads"
  ON public.leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team leads"
  ON public.leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any lead"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team leads"
  ON public.leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any lead"
  ON public.leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team leads"
  ON public.leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- CLIENTES: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all clientes"
  ON public.clientes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team clientes"
  ON public.clientes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any cliente"
  ON public.clientes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team clientes"
  ON public.clientes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any cliente"
  ON public.clientes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team clientes"
  ON public.clientes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- INDICADORES: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all indicadores"
  ON public.indicadores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team indicadores"
  ON public.indicadores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any indicador"
  ON public.indicadores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team indicadores"
  ON public.indicadores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any indicador"
  ON public.indicadores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team indicadores"
  ON public.indicadores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- AGENDA_EVENTOS: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all agenda_eventos"
  ON public.agenda_eventos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team agenda_eventos"
  ON public.agenda_eventos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any agenda_evento"
  ON public.agenda_eventos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team agenda_eventos"
  ON public.agenda_eventos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any agenda_evento"
  ON public.agenda_eventos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team agenda_eventos"
  ON public.agenda_eventos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- NEGOCIACOES: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all negociacoes"
  ON public.negociacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team negociacoes"
  ON public.negociacoes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any negociacao"
  ON public.negociacoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team negociacoes"
  ON public.negociacoes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any negociacao"
  ON public.negociacoes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team negociacoes"
  ON public.negociacoes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- COMISSOES_INDICADORES: Admin/Gestor veem todos, Consultor vê próprios
CREATE POLICY "Admins can view all comissoes"
  ON public.comissoes_indicadores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team comissoes"
  ON public.comissoes_indicadores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Only admins can insert comissoes"
  ON public.comissoes_indicadores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can update comissoes"
  ON public.comissoes_indicadores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Only admins can delete comissoes"
  ON public.comissoes_indicadores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

-- COBRANCAS: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all cobrancas"
  ON public.cobrancas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team cobrancas"
  ON public.cobrancas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any cobranca"
  ON public.cobrancas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team cobrancas"
  ON public.cobrancas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any cobranca"
  ON public.cobrancas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team cobrancas"
  ON public.cobrancas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- POS_VENDA: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all pos_venda"
  ON public.pos_venda FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team pos_venda"
  ON public.pos_venda FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any pos_venda"
  ON public.pos_venda FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team pos_venda"
  ON public.pos_venda FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any pos_venda"
  ON public.pos_venda FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team pos_venda"
  ON public.pos_venda FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- RECRUTAMENTO: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all recrutamento"
  ON public.recrutamento FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team recrutamento"
  ON public.recrutamento FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any recrutamento"
  ON public.recrutamento FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team recrutamento"
  ON public.recrutamento FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any recrutamento"
  ON public.recrutamento FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team recrutamento"
  ON public.recrutamento FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

-- PARCEIROS: Admin/Gestor veem todos, Consultor/Assistente veem próprios
CREATE POLICY "Admins can view all parceiros"
  ON public.parceiros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can view team parceiros"
  ON public.parceiros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can update any parceiro"
  ON public.parceiros FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can update team parceiros"
  ON public.parceiros FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

CREATE POLICY "Admins can delete any parceiro"
  ON public.parceiros FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil = 'Administrador'
    )
  );

CREATE POLICY "Gestors can delete team parceiros"
  ON public.parceiros FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.perfil IN ('Administrador', 'Gestor')
    )
  );

COMMIT;

-- ==========================================
-- Migration: 20260822000003_create_hierarchy_system.sql
-- ==========================================
BEGIN;

-- ============================================================
-- MIGRATION 4 — HIERARQUIA DE EQUIPES, EVOLUÇÃO E PRESETS
-- Incremental. Não altera Migrations 1, 2 ou 3.
-- ============================================================

-- ============================================================
-- FUNÇÕES AUXILIARES (SECURITY DEFINER)
-- Evitam recursão RLS nas policies.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS TEXT AS $$
DECLARE
  v_perfil TEXT;
BEGIN
  SELECT perfil INTO v_perfil FROM public.profiles WHERE id = auth.uid();
  RETURN v_perfil;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_profile() = 'Administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_current_user_profile() = 'Gestor';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_gestor_of(p_target_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND perfil = 'Gestor'
      AND p_target_user_id IN (
        SELECT id FROM public.profiles WHERE gestor_id = auth.uid()
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_user_evolution()
RETURNS TRIGGER AS $$
DECLARE
  v_perfil_mudou BOOLEAN := (OLD.perfil IS DISTINCT FROM NEW.perfil);
  v_gestor_mudou BOOLEAN := (OLD.gestor_id IS DISTINCT FROM NEW.gestor_id);
  v_alterado_por UUID := auth.uid();
BEGIN
  IF v_perfil_mudou OR v_gestor_mudou THEN
    INSERT INTO public.user_evolution_history (
      usuario_id,
      perfil_anterior,
      perfil_novo,
      gestor_anterior,
      gestor_novo,
      motivo,
      alterado_por,
      created_at
    )
    VALUES (
      NEW.id,
      OLD.perfil,
      NEW.perfil,
      OLD.gestor_id,
      NEW.gestor_id,
      '',
      v_alterado_por,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 1. PROFILES — VÍNCULO HIERÁRQUICO
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gestor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_gestor_id_idx ON public.profiles (gestor_id);

-- ============================================================
-- 2. EVOLUÇÃO DO USUÁRIO
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_evolution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  perfil_anterior TEXT,
  perfil_novo TEXT NOT NULL,
  gestor_anterior UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  gestor_novo UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL DEFAULT '',
  alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_evolution_history_usuario_id_idx ON public.user_evolution_history (usuario_id);
CREATE INDEX IF NOT EXISTS user_evolution_history_created_at_idx ON public.user_evolution_history (created_at);

DROP TRIGGER IF EXISTS trg_record_user_evolution ON public.profiles;
CREATE TRIGGER trg_record_user_evolution
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.record_user_evolution();

-- ============================================================
-- 3. PRESETS DE PERMISSÕES
-- ============================================================

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

CREATE INDEX IF NOT EXISTS permission_preset_items_preset_id_idx ON public.permission_preset_items (preset_id);
CREATE INDEX IF NOT EXISTS permission_preset_items_permissao_id_idx ON public.permission_preset_items (permissao_id);

-- ============================================================
-- 4. METAS — CONSTRAINTS (compatível com PostgreSQL)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'metas' AND constraint_name = 'metas_tipo_check'
  ) THEN
    ALTER TABLE public.metas ADD CONSTRAINT metas_tipo_check CHECK (tipo IN ('individual', 'equipe'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'metas' AND constraint_name = 'metas_perfil_aplicavel_check'
  ) THEN
    ALTER TABLE public.metas ADD CONSTRAINT metas_perfil_aplicavel_check CHECK (perfil_aplicavel IN ('Consultor', 'Assistente', 'Equipe'));
  END IF;
END $$;

-- ============================================================
-- 5. RLS — NOVAS TABELAS
-- ============================================================

ALTER TABLE public.user_evolution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_preset_items ENABLE ROW LEVEL SECURITY;

-- Policies para user_evolution_history
CREATE POLICY "Users can view own evolution history"
  ON public.user_evolution_history FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR public.is_admin()
  );

CREATE POLICY "Admins and gestors can insert evolution history"
  ON public.user_evolution_history FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (public.is_admin() OR public.is_gestor())
  );

-- Policies para permission_presets
CREATE POLICY "Authenticated users can view permission presets"
  ON public.permission_presets FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert permission presets"
  ON public.permission_presets FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update permission presets"
  ON public.permission_presets FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete permission presets"
  ON public.permission_presets FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- Policies para permission_preset_items
CREATE POLICY "Authenticated users can view permission preset items"
  ON public.permission_preset_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert permission preset items"
  ON public.permission_preset_items FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update permission preset items"
  ON public.permission_preset_items FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete permission preset items"
  ON public.permission_preset_items FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- ============================================================
-- 6. AJUSTE DE POLICIES — PROFILES, METAS E USER_PERMISSION_GRANTS
-- Substitui policies antigas pela lógica hierárquica.
-- ============================================================

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Gestors can update team profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Gestors can view team profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_gestor()
    AND profiles.gestor_id = auth.uid()
  );

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Gestors can update team profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.is_gestor()
    AND profiles.gestor_id = auth.uid()
  )
  WITH CHECK (
    public.is_gestor()
    AND profiles.gestor_id = auth.uid()
    AND NEW.perfil <> 'Administrador'
    AND NEW.gestor_id = OLD.gestor_id
  );

-- METAS
DROP POLICY IF EXISTS "Authenticated users can view relevant metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can insert metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can update metas" ON public.metas;
DROP POLICY IF EXISTS "Only admins can delete metas" ON public.metas;

CREATE POLICY "Admins can view all metas"
  ON public.metas FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Gestors can view team metas"
  ON public.metas FOR SELECT
  USING (
    public.is_gestor()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = metas.usuario_id
        AND profiles.gestor_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own metas"
  ON public.metas FOR SELECT
  USING (
    auth.uid() = usuario_id
    AND perfil_aplicavel IN ('Consultor', 'Assistente')
  );

CREATE POLICY "Only admins can insert metas"
  ON public.metas FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update metas"
  ON public.metas FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete metas"
  ON public.metas FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- USER_PERMISSION_GRANTS
DROP POLICY IF EXISTS "Users can view their own permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can insert permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can update permission grants" ON public.user_permission_grants;
DROP POLICY IF EXISTS "Only admins can delete permission grants" ON public.user_permission_grants;

CREATE POLICY "Users can view own permission grants"
  ON public.user_permission_grants FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR public.is_admin()
    OR (
      public.is_gestor()
      AND public.is_gestor_of(usuario_id)
    )
  );

CREATE POLICY "Only admins can insert permission grants"
  ON public.user_permission_grants FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can update permission grants"
  ON public.user_permission_grants FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

CREATE POLICY "Only admins can delete permission grants"
  ON public.user_permission_grants FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND public.is_admin()
  );

-- ============================================================
-- 7. PRESETS INICIAIS
-- ============================================================

INSERT INTO public.permission_presets (nome, descricao, categoria)
VALUES
  ('Administrador', 'Acesso total ao sistema', 'Administração'),
  ('Gestor', 'Gerenciamento de equipe e indicadores', 'Gerência'),
  ('Líder em treinamento', 'Acesso parcial para treinamento', 'Gerência'),
  ('Consultor', 'Operações de vendas e atendimento', 'Comercial'),
  ('Indicador', 'Acesso limitado a módulos específicos', 'Comercial'),
  ('Assistente', 'Apoio operacional', 'Administrativo')
ON CONFLICT (nome) DO NOTHING;

COMMIT;


