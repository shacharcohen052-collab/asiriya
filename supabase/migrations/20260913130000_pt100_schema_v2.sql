-- =============================================
-- PT100 SCHEMA V2 — Phase 1 corrections
-- =============================================

-- 1. ADD ROLE TYPE
DROP TYPE IF EXISTS public.member_role CASCADE;
CREATE TYPE public.member_role AS ENUM ('member', 'admin');

-- 2. ADD MISSING COLUMNS TO user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS role public.member_role DEFAULT 'member'::public.member_role,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Remove team_day_idea column (spec: no team-building day field)
ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS team_day_idea;

-- 3. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. GROUP_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- 5. DAILY_TASKS TABLE
CREATE TABLE IF NOT EXISTS public.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_date)
);

-- 6. ACTIVITIES TABLE (Zoom, lesson, daily_task — each = 1 point)
DROP TYPE IF EXISTS public.activity_type CASCADE;
CREATE TYPE public.activity_type AS ENUM ('zoom', 'lesson', 'daily_task');

CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  daily_task_id UUID REFERENCES public.daily_tasks(id) ON DELETE SET NULL,
  activity_type public.activity_type NOT NULL,
  activity_date DATE NOT NULL,
  title TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. ACTIVITY_COMPLETIONS TABLE (idempotent: one per user per activity)
CREATE TABLE IF NOT EXISTS public.activity_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, activity_id)
);

-- 8. CONNECTION_DUTIES TABLE
CREATE TABLE IF NOT EXISTS public.connection_duties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_date DATE NOT NULL,
  member1_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  member2_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  is_manual_override BOOLEAN DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(duty_date)
);

-- 9. CALENDAR_EXPORTS TABLE
CREATE TABLE IF NOT EXISTS public.calendar_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  export_type TEXT NOT NULL DEFAULT 'google',
  exported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id, export_type)
);

-- 10. INDEXES
CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_tasks_date ON public.daily_tasks(task_date);
CREATE INDEX IF NOT EXISTS idx_activities_date ON public.activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_activities_type ON public.activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_completions_user ON public.activity_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_completions_activity ON public.activity_completions(activity_id);
CREATE INDEX IF NOT EXISTS idx_connection_duties_date ON public.connection_duties(duty_date);
CREATE INDEX IF NOT EXISTS idx_calendar_exports_user ON public.calendar_exports(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_approved ON public.user_profiles(is_approved);

-- 11. FUNCTIONS

-- Admin check using auth metadata (safe — no recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'::public.member_role
  );
$$;

-- Approved member check
CREATE OR REPLACE FUNCTION public.is_approved_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND is_approved = true
  );
$$;

-- Updated handle_new_user: match email to existing approved profile
-- If email matches an approved profile, link auth user to it
-- If no match, create unapproved profile (access denied until admin approves)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_profile_id UUID;
BEGIN
  -- Check if an approved profile with this email already exists (pre-seeded by admin)
  SELECT id INTO v_existing_profile_id
  FROM public.user_profiles
  WHERE email = NEW.email AND is_approved = true
  LIMIT 1;

  IF v_existing_profile_id IS NOT NULL THEN
    -- Link the auth user to the existing approved profile
    UPDATE public.user_profiles
    SET id = NEW.id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_existing_profile_id;
  ELSE
    -- No approved profile found — create unapproved entry
    INSERT INTO public.user_profiles (id, email, display_name, is_approved, role)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      false,
      'member'::public.member_role
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Idempotent scoring function: count completions, never double-count
CREATE OR REPLACE FUNCTION public.get_user_score(p_user_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(ac.id)::INTEGER
  FROM public.activity_completions ac
  JOIN public.activities a ON a.id = ac.activity_id
  WHERE ac.user_id = p_user_id
    AND EXTRACT(YEAR FROM a.activity_date) = p_year
    AND EXTRACT(MONTH FROM a.activity_date) = p_month;
$$;

-- 12. ENABLE RLS ON NEW TABLES
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_duties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_exports ENABLE ROW LEVEL SECURITY;

-- 13. RLS POLICIES

-- groups: all authenticated can read; only admins can write
DROP POLICY IF EXISTS "members_read_groups" ON public.groups;
CREATE POLICY "members_read_groups" ON public.groups
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_groups" ON public.groups;
CREATE POLICY "admins_manage_groups" ON public.groups
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- group_members: approved members can read; admins can write
DROP POLICY IF EXISTS "members_read_group_members" ON public.group_members;
CREATE POLICY "members_read_group_members" ON public.group_members
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_group_members" ON public.group_members;
CREATE POLICY "admins_manage_group_members" ON public.group_members
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- daily_tasks: all authenticated can read; admins can write
DROP POLICY IF EXISTS "members_read_daily_tasks" ON public.daily_tasks;
CREATE POLICY "members_read_daily_tasks" ON public.daily_tasks
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_daily_tasks" ON public.daily_tasks;
CREATE POLICY "admins_manage_daily_tasks" ON public.daily_tasks
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- activities: all authenticated can read; admins can write
DROP POLICY IF EXISTS "members_read_activities" ON public.activities;
CREATE POLICY "members_read_activities" ON public.activities
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_activities" ON public.activities;
CREATE POLICY "admins_manage_activities" ON public.activities
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- activity_completions: users manage own; all can read (for leaderboard)
DROP POLICY IF EXISTS "users_manage_own_completions" ON public.activity_completions;
CREATE POLICY "users_manage_own_completions" ON public.activity_completions
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "members_read_all_completions" ON public.activity_completions;
CREATE POLICY "members_read_all_completions" ON public.activity_completions
FOR SELECT TO authenticated USING (true);

-- connection_duties: all authenticated can read; admins can write
DROP POLICY IF EXISTS "members_read_connection_duties" ON public.connection_duties;
CREATE POLICY "members_read_connection_duties" ON public.connection_duties
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admins_manage_connection_duties" ON public.connection_duties;
CREATE POLICY "admins_manage_connection_duties" ON public.connection_duties
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- calendar_exports: users manage own
DROP POLICY IF EXISTS "users_manage_own_calendar_exports" ON public.calendar_exports;
CREATE POLICY "users_manage_own_calendar_exports" ON public.calendar_exports
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update user_profiles RLS: add admin override
DROP POLICY IF EXISTS "admins_manage_all_profiles" ON public.user_profiles;
CREATE POLICY "admins_manage_all_profiles" ON public.user_profiles
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 14. RECREATE TRIGGER (updated function)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. SEED PT100 GROUP
DO $$
BEGIN
  INSERT INTO public.groups (id, name, description)
  VALUES (gen_random_uuid(), 'PT100', 'קבוצת PT100 — 30 חברים')
  ON CONFLICT (name) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Group seed skipped: %', SQLERRM;
END $$;
