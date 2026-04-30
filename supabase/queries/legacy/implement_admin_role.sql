-- Implementación del rol ADMIN ("Super Coach")
-- Ejecutar en el Editor SQL de Supabase

-- 1. Agregar 'ADMIN' al ENUM role_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'role_type' AND e.enumlabel = 'ADMIN') THEN
    ALTER TYPE role_type ADD VALUE 'ADMIN';
  END IF;
END
$$;

-- 2. Función helper para saber si el usuario es ADMIN sin causar recursión
-- Se usa security definer para acceder a perfiles de forma "root"
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'ADMIN'
  );
END;
$$;

-- 3. Actualización de políticas RLS para que ADMIN vea todo
-- (Agregamos "OR public.is_admin(auth.uid())" a las políticas existentes o creamos nuevas)

-- PROFILES
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin(auth.uid()));

-- GROUPS
DROP POLICY IF EXISTS "Admins can do everything on groups" ON public.groups;
CREATE POLICY "Admins can do everything on groups" ON public.groups FOR ALL USING (public.is_admin(auth.uid()));

-- ATHLETE_GROUPS
DROP POLICY IF EXISTS "Admins can do everything on athlete_groups" ON public.athlete_groups;
CREATE POLICY "Admins can do everything on athlete_groups" ON public.athlete_groups FOR ALL USING (public.is_admin(auth.uid()));

-- TRAININGS
DROP POLICY IF EXISTS "Admins can do everything on trainings" ON public.trainings;
CREATE POLICY "Admins can do everything on trainings" ON public.trainings FOR ALL USING (public.is_admin(auth.uid()));

-- TRAINING_ASSIGNMENTS
DROP POLICY IF EXISTS "Admins can do everything on training_assignments" ON public.training_assignments;
CREATE POLICY "Admins can do everything on training_assignments" ON public.training_assignments FOR ALL USING (public.is_admin(auth.uid()));

-- ACTIVITIES
DROP POLICY IF EXISTS "Admins can read all activities" ON public.activities;
CREATE POLICY "Admins can read all activities" ON public.activities FOR SELECT USING (public.is_admin(auth.uid()));

-- COACH PROFILES
DROP POLICY IF EXISTS "Admins can do everything on coach_profiles" ON public.coach_profiles;
CREATE POLICY "Admins can do everything on coach_profiles" ON public.coach_profiles FOR ALL USING (public.is_admin(auth.uid()));

-- ATHLETE PROFILES
DROP POLICY IF EXISTS "Admins can do everything on athlete_profiles" ON public.athlete_profiles;
CREATE POLICY "Admins can do everything on athlete_profiles" ON public.athlete_profiles FOR ALL USING (public.is_admin(auth.uid()));

-- NOTA: Con FOR ALL, automáticamente tienen permisos SELECT, INSERT, UPDATE, DELETE.
