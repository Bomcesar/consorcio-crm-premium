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
