-- PT100 Phase 3: open registration, Admin approval, secure profile linking
-- Existing profiles are preserved; historical activity and score records are not deleted.

ALTER TABLE public.user_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS auth_user_id UUID,
  ADD COLUMN IF NOT EXISTS is_removed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_auth_user_id_key;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_auth_user_id_key UNIQUE (auth_user_id);

ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_auth_user_id_fkey;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_auth_user_id_fkey
  FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON public.user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_lower ON public.user_profiles(lower(email));

-- Anyone may register. A matching existing profile becomes linked and remains active.
-- An unknown registrant receives a real pending profile, not a demo profile.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_is_approved BOOLEAN;
  v_group_id UUID;
BEGIN
  UPDATE public.user_profiles
  SET auth_user_id = NEW.id,
      is_approved = CASE WHEN lower(NEW.email) = 'shachar.cohen052@gmail.com' THEN true ELSE is_approved END,
      role = CASE WHEN lower(NEW.email) = 'shachar.cohen052@gmail.com' THEN 'admin'::public.member_role ELSE role END,
      is_removed = false,
      updated_at = CURRENT_TIMESTAMP
  WHERE lower(email) = lower(NEW.email)
    AND auth_user_id IS NULL;

  SELECT id INTO v_profile_id
  FROM public.user_profiles
  WHERE auth_user_id = NEW.id
  LIMIT 1;

  SELECT is_approved INTO v_is_approved
  FROM public.user_profiles
  WHERE id = v_profile_id;

  IF v_profile_id IS NULL THEN
    INSERT INTO public.user_profiles
      (email, display_name, role, is_approved, is_removed, auth_user_id)
    VALUES
      (lower(NEW.email),
       COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
       CASE WHEN lower(NEW.email) = 'shachar.cohen052@gmail.com'
            THEN 'admin'::public.member_role
            ELSE 'member'::public.member_role END,
       CASE WHEN lower(NEW.email) = 'shachar.cohen052@gmail.com' THEN true ELSE false END,
       false,
       NEW.id)
    RETURNING id INTO v_profile_id;

    SELECT is_approved INTO v_is_approved
    FROM public.user_profiles
    WHERE id = v_profile_id;
  END IF;

  IF v_is_approved = true THEN
    SELECT id INTO v_group_id FROM public.groups WHERE name = 'PT100' LIMIT 1;
    IF v_group_id IS NOT NULL THEN
      INSERT INTO public.group_members (group_id, user_id)
      VALUES (v_group_id, v_profile_id)
      ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.user_profiles
  WHERE auth_user_id = auth.uid()
    AND is_approved = true
    AND is_removed = false
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND is_approved = true
      AND is_removed = false
      AND role = 'admin'::public.member_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_approved_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_profile_id() IS NOT NULL;
$$;

-- Profile access: active members see active profiles; Admins also see pending members.
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles" ON public.user_profiles
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid() AND is_removed = false)
WITH CHECK (auth_user_id = auth.uid() AND is_removed = false);

DROP POLICY IF EXISTS "users_read_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_approved_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_read_active_profiles" ON public.user_profiles;
CREATE POLICY "users_read_active_profiles" ON public.user_profiles
FOR SELECT TO authenticated
USING (
  (is_approved = true AND is_removed = false AND public.is_approved_member())
  OR public.is_admin()
);

DROP POLICY IF EXISTS "admins_manage_all_profiles" ON public.user_profiles;
CREATE POLICY "admins_manage_all_profiles" ON public.user_profiles
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Existing tables use profile IDs, so all self-service policies resolve the current profile.
DROP POLICY IF EXISTS "users_manage_own_attendance_plans" ON public.attendance_plans;
CREATE POLICY "users_manage_own_attendance_plans" ON public.attendance_plans
FOR ALL TO authenticated
USING (user_id = public.current_profile_id())
WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "users_read_all_attendance_plans" ON public.attendance_plans;
CREATE POLICY "users_read_visible_attendance_plans" ON public.attendance_plans
FOR SELECT TO authenticated USING (public.is_approved_member());

DROP POLICY IF EXISTS "users_manage_own_actual_attendance" ON public.actual_attendance;
CREATE POLICY "users_manage_own_actual_attendance" ON public.actual_attendance
FOR ALL TO authenticated
USING (user_id = public.current_profile_id())
WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "users_read_all_actual_attendance" ON public.actual_attendance;
CREATE POLICY "users_read_own_actual_attendance" ON public.actual_attendance
FOR SELECT TO authenticated
USING (user_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "users_manage_own_monthly_scores" ON public.monthly_scores;
CREATE POLICY "users_read_own_monthly_scores" ON public.monthly_scores
FOR SELECT TO authenticated
USING (user_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "users_read_all_monthly_scores" ON public.monthly_scores;
CREATE POLICY "members_read_monthly_scores" ON public.monthly_scores
FOR SELECT TO authenticated USING (public.is_approved_member());

DROP POLICY IF EXISTS "users_manage_own_duty_overrides" ON public.connection_duty_overrides;
CREATE POLICY "users_manage_own_duty_overrides" ON public.connection_duty_overrides
FOR ALL TO authenticated
USING (user_id = public.current_profile_id())
WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "users_manage_own_completions" ON public.activity_completions;
CREATE POLICY "users_manage_own_completions" ON public.activity_completions
FOR ALL TO authenticated
USING (user_id = public.current_profile_id())
WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "members_read_all_completions" ON public.activity_completions;
CREATE POLICY "members_read_completions" ON public.activity_completions
FOR SELECT TO authenticated USING (public.is_approved_member());

DROP POLICY IF EXISTS "members_read_group_members" ON public.group_members;
CREATE POLICY "members_read_group_members" ON public.group_members
FOR SELECT TO authenticated USING (public.is_approved_member());

-- Admin approves a pending profile and adds it to PT100.
CREATE OR REPLACE FUNCTION public.approve_pt100_member(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;

  UPDATE public.user_profiles
  SET is_approved = true, is_removed = false, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_profile_id;

  SELECT id INTO v_group_id FROM public.groups WHERE name = 'PT100' LIMIT 1;
  IF v_group_id IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id)
    VALUES (v_group_id, p_profile_id)
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
END;
$$;

-- Admin removes access and membership but preserves all historical records.
CREATE OR REPLACE FUNCTION public.remove_pt100_member(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF p_profile_id = public.current_profile_id() THEN RAISE EXCEPTION 'an admin cannot remove themselves'; END IF;

  UPDATE public.user_profiles
  SET is_removed = true, is_approved = false, updated_at = CURRENT_TIMESTAMP
  WHERE id = p_profile_id;

  DELETE FROM public.group_members WHERE user_id = p_profile_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_pt100_admin(p_profile_id UUID, p_is_admin BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF p_profile_id = public.current_profile_id() AND p_is_admin = false THEN
    RAISE EXCEPTION 'an admin cannot remove their own admin role';
  END IF;
  UPDATE public.user_profiles
  SET role = CASE WHEN p_is_admin THEN 'admin'::public.member_role ELSE 'member'::public.member_role END,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_profile_id AND is_approved = true AND is_removed = false;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_pt100_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_pt100_member(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.remove_pt100_member(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_pt100_member(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.set_pt100_admin(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_pt100_admin(UUID, BOOLEAN) TO authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON COLUMN public.user_profiles.auth_user_id IS
  'The linked auth.users ID. NULL means the profile has not logged in yet.';
COMMENT ON COLUMN public.user_profiles.is_removed IS
  'When true, access to PT100 is revoked while historical activity and score records remain.';
