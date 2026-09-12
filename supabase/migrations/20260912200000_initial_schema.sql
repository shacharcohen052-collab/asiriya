-- =============================================
-- INITIAL SCHEMA: מרחב העשירייה
-- =============================================

-- 1. TYPES
DROP TYPE IF EXISTS public.attendance_plan_type CASCADE;
CREATE TYPE public.attendance_plan_type AS ENUM ('routing', 'physical', 'virtual', 'with_help', 'not_coming');

DROP TYPE IF EXISTS public.actual_attendance_type CASCADE;
CREATE TYPE public.actual_attendance_type AS ENUM ('attended', 'not_attended', 'declined');

DROP TYPE IF EXISTS public.event_source_type CASCADE;
CREATE TYPE public.event_source_type AS ENUM ('fixed_schedule', 'weekly_paste', 'manual');

-- 2. CORE TABLES

-- User profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  profile_id INTEGER,
  life_work TEXT,
  relationship_status TEXT,
  hobbies TEXT,
  path_duration TEXT,
  connection_strength TEXT,
  desired_quality TEXT,
  team_day_idea TEXT,
  notifications_enabled BOOLEAN DEFAULT true,
  push_reminders_enabled BOOLEAN DEFAULT true,
  calendar_sync_enabled BOOLEAN DEFAULT false,
  google_calendar_token TEXT,
  privacy_show_attendance BOOLEAN DEFAULT true,
  privacy_show_score BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Schedule events
CREATE TABLE IF NOT EXISTS public.schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_fixed BOOLEAN DEFAULT false,
  source public.event_source_type DEFAULT 'manual',
  allows_attendance_plan BOOLEAN DEFAULT true,
  counts_for_score BOOLEAN DEFAULT false,
  score_value INTEGER DEFAULT 1,
  week_offset INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Attendance plans (pre-event planning)
CREATE TABLE IF NOT EXISTS public.attendance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  plan public.attendance_plan_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id)
);

-- Actual attendance (post-event reporting)
CREATE TABLE IF NOT EXISTS public.actual_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.schedule_events(id) ON DELETE CASCADE,
  status public.actual_attendance_type NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, event_id)
);

-- Monthly scores
CREATE TABLE IF NOT EXISTS public.monthly_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  events_attended INTEGER DEFAULT 0,
  events_total INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, year, month)
);

-- Connection duty overrides (availability/manual edits)
CREATE TABLE IF NOT EXISTS public.connection_duty_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  duty_date DATE NOT NULL,
  is_unavailable BOOLEAN DEFAULT false,
  swap_with_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, duty_date)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_schedule_events_date ON public.schedule_events(event_date);
CREATE INDEX IF NOT EXISTS idx_schedule_events_fixed ON public.schedule_events(is_fixed);
CREATE INDEX IF NOT EXISTS idx_attendance_plans_user ON public.attendance_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_plans_event ON public.attendance_plans(event_id);
CREATE INDEX IF NOT EXISTS idx_actual_attendance_user ON public.actual_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_actual_attendance_event ON public.actual_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_monthly_scores_user ON public.monthly_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_scores_period ON public.monthly_scores(year, month);

-- 4. FUNCTIONS

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_monthly_score(p_user_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER;
  v_attended INTEGER;
  v_total INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(se.score_value), 0),
    COUNT(aa.id),
    COUNT(se.id)
  INTO v_score, v_attended, v_total
  FROM public.schedule_events se
  LEFT JOIN public.actual_attendance aa ON aa.event_id = se.id AND aa.user_id = p_user_id AND aa.status = 'attended'
  WHERE se.counts_for_score = true
    AND EXTRACT(YEAR FROM se.event_date) = p_year
    AND EXTRACT(MONTH FROM se.event_date) = p_month;

  INSERT INTO public.monthly_scores (user_id, year, month, score, events_attended, events_total)
  VALUES (p_user_id, p_year, p_month, v_score, v_attended, v_total)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    score = EXCLUDED.score,
    events_attended = EXCLUDED.events_attended,
    events_total = EXCLUDED.events_total,
    updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actual_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_duty_overrides ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles" ON public.user_profiles
FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_read_all_profiles" ON public.user_profiles;
CREATE POLICY "users_read_all_profiles" ON public.user_profiles
FOR SELECT TO authenticated USING (true);

-- schedule_events: all authenticated can read, only creator can modify
DROP POLICY IF EXISTS "users_read_schedule_events" ON public.schedule_events;
CREATE POLICY "users_read_schedule_events" ON public.schedule_events
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "users_manage_own_schedule_events" ON public.schedule_events;
CREATE POLICY "users_manage_own_schedule_events" ON public.schedule_events
FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- attendance_plans
DROP POLICY IF EXISTS "users_manage_own_attendance_plans" ON public.attendance_plans;
CREATE POLICY "users_manage_own_attendance_plans" ON public.attendance_plans
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_read_all_attendance_plans" ON public.attendance_plans;
CREATE POLICY "users_read_all_attendance_plans" ON public.attendance_plans
FOR SELECT TO authenticated USING (true);

-- actual_attendance
DROP POLICY IF EXISTS "users_manage_own_actual_attendance" ON public.actual_attendance;
CREATE POLICY "users_manage_own_actual_attendance" ON public.actual_attendance
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_read_all_actual_attendance" ON public.actual_attendance;
CREATE POLICY "users_read_all_actual_attendance" ON public.actual_attendance
FOR SELECT TO authenticated USING (true);

-- monthly_scores
DROP POLICY IF EXISTS "users_manage_own_monthly_scores" ON public.monthly_scores;
CREATE POLICY "users_manage_own_monthly_scores" ON public.monthly_scores
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_read_all_monthly_scores" ON public.monthly_scores;
CREATE POLICY "users_read_all_monthly_scores" ON public.monthly_scores
FOR SELECT TO authenticated USING (true);

-- connection_duty_overrides
DROP POLICY IF EXISTS "users_manage_own_duty_overrides" ON public.connection_duty_overrides;
CREATE POLICY "users_manage_own_duty_overrides" ON public.connection_duty_overrides
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_read_all_duty_overrides" ON public.connection_duty_overrides;
CREATE POLICY "users_read_all_duty_overrides" ON public.connection_duty_overrides
FOR SELECT TO authenticated USING (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. SEED FIXED SCHEDULE EVENTS (current week sample)
DO $$
BEGIN
  INSERT INTO public.schedule_events (id, title, event_date, start_time, end_time, is_fixed, source, allows_attendance_plan, counts_for_score, score_value)
  VALUES
    (gen_random_uuid(), 'זום עשירייה', CURRENT_DATE, '11:45', '12:00', true, 'fixed_schedule', true, false, 0),
    (gen_random_uuid(), 'זום עשירייה', CURRENT_DATE, '18:00', '18:30', true, 'fixed_schedule', true, false, 0),
    (gen_random_uuid(), 'לימוד בקהילת הצעירים', CURRENT_DATE + 1, '18:30', '21:00', true, 'fixed_schedule', true, true, 3),
    (gen_random_uuid(), 'זום עשירייה', CURRENT_DATE + 1, '11:45', '12:00', true, 'fixed_schedule', true, false, 0),
    (gen_random_uuid(), 'שיעור בוקר', CURRENT_DATE + 2, '06:00', '07:00', false, 'weekly_paste', true, true, 2),
    (gen_random_uuid(), 'זום עשירייה', CURRENT_DATE + 2, '11:45', '12:00', true, 'fixed_schedule', true, false, 0),
    (gen_random_uuid(), 'ערב גיבוש לקהילת הצעירים', CURRENT_DATE + 4, '18:30', '21:00', true, 'fixed_schedule', true, true, 3)
  ON CONFLICT DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data insertion skipped: %', SQLERRM;
END $$;
