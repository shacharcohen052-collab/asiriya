-- Schedule foundation: durable events, idempotent imports, soft deletion and one point per event.

ALTER TABLE public.schedule_events
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
  ADD COLUMN IF NOT EXISTS overlap_event_id UUID REFERENCES public.schedule_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE public.schedule_events
SET is_active = COALESCE(is_active, true),
    counts_for_score = true,
    score_value = 1,
    dedupe_key = lower(trim(title)) || '|' || event_date::text || '|' || start_time::text || '|' || end_time::text
WHERE dedupe_key IS NULL;

ALTER TABLE public.schedule_events
  ALTER COLUMN counts_for_score SET DEFAULT true,
  ALTER COLUMN score_value SET DEFAULT 1;

ALTER TABLE public.schedule_events
  ALTER COLUMN dedupe_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS schedule_events_dedupe_key_uidx
  ON public.schedule_events(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_schedule_events_active_date
  ON public.schedule_events(event_date, is_active);

-- Every active event is worth exactly one point; historical rows are normalized too.
UPDATE public.schedule_events
SET counts_for_score = true, score_value = 1
WHERE is_active = true;

-- Ensure the four recurring meetings exist exactly once for each requested date.
CREATE OR REPLACE FUNCTION public.ensure_pt100_fixed_schedule(p_start_date DATE, p_end_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE;
  v_day INTEGER;
BEGIN
  IF NOT public.is_approved_member() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_end_date < p_start_date OR p_end_date - p_start_date > 366 THEN
    RAISE EXCEPTION 'invalid date range';
  END IF;

  v_date := p_start_date;
  WHILE v_date <= p_end_date LOOP
    v_day := EXTRACT(DOW FROM v_date)::INTEGER;
    INSERT INTO public.schedule_events
      (title, event_date, start_time, end_time, is_fixed, source, allows_attendance_plan,
       counts_for_score, score_value, week_offset, created_by, is_active, dedupe_key)
    VALUES
      ('זום PT100', v_date, '11:45', '12:00', true, 'fixed_schedule', true, true, 1, 0, public.current_profile_id(), true,
       lower('זום PT100') || '|' || v_date::text || '|11:45:00|12:00:00'),
      ('זום PT100', v_date, '18:00', '18:30', true, 'fixed_schedule', true, true, 1, 0, public.current_profile_id(), true,
       lower('זום PT100') || '|' || v_date::text || '|18:00:00|18:30:00')
    ON CONFLICT (dedupe_key) DO UPDATE
      SET is_active = true, is_fixed = true, counts_for_score = true, score_value = 1;

    IF v_day = 1 THEN
      INSERT INTO public.schedule_events
        (title, event_date, start_time, end_time, is_fixed, source, allows_attendance_plan, counts_for_score, score_value, created_by, is_active, dedupe_key)
      VALUES ('לימוד בקהילת הצעירים', v_date, '18:30', '21:00', true, 'fixed_schedule', true, true, 1, public.current_profile_id(), true,
        lower('לימוד בקהילת הצעירים') || '|' || v_date::text || '|18:30:00|21:00:00')
      ON CONFLICT (dedupe_key) DO UPDATE
        SET is_active = true, is_fixed = true, counts_for_score = true, score_value = 1;
    ELSIF v_day = 4 THEN
      INSERT INTO public.schedule_events
        (title, event_date, start_time, end_time, is_fixed, source, allows_attendance_plan, counts_for_score, score_value, created_by, is_active, dedupe_key)
      VALUES ('ערב גיבוש קהילת הצעירים', v_date, '18:30', '21:00', true, 'fixed_schedule', true, true, 1, public.current_profile_id(), true,
        lower('ערב גיבוש קהילת הצעירים') || '|' || v_date::text || '|18:30:00|21:00:00')
      ON CONFLICT (dedupe_key) DO UPDATE
        SET is_active = true, is_fixed = true, counts_for_score = true, score_value = 1;
    END IF;
    v_date := v_date + 1;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_pt100_schedule()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.schedule_events
  SET is_active = false
  WHERE is_active = true;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Replace permissive legacy schedule policies with approved-member reads and admin writes.
DROP POLICY IF EXISTS "users_read_schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "users_manage_own_schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "members_read_active_schedule_events" ON public.schedule_events;
DROP POLICY IF EXISTS "admins_manage_schedule_events" ON public.schedule_events;

CREATE POLICY "members_read_active_schedule_events" ON public.schedule_events
FOR SELECT TO authenticated
USING (is_active = true AND public.is_approved_member());

CREATE POLICY "members_insert_schedule_events" ON public.schedule_events
FOR INSERT TO authenticated
WITH CHECK (public.is_approved_member() AND created_by = public.current_profile_id());

CREATE POLICY "admins_manage_schedule_events" ON public.schedule_events
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- No direct DELETE policy: deletion is only the protected soft-delete RPC above.
REVOKE DELETE ON public.schedule_events FROM authenticated;

-- Future score calculation counts completed active events at one point each.
CREATE OR REPLACE FUNCTION public.update_monthly_score(p_user_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attended INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) FILTER (WHERE aa.status = 'attended'), COUNT(*)
  INTO v_attended, v_total
  FROM public.schedule_events se
  LEFT JOIN public.actual_attendance aa ON aa.event_id = se.id AND aa.user_id = p_user_id
  WHERE se.is_active = true
    AND EXTRACT(YEAR FROM se.event_date) = p_year
    AND EXTRACT(MONTH FROM se.event_date) = p_month;

  INSERT INTO public.monthly_scores (user_id, year, month, score, events_attended, events_total)
  VALUES (p_user_id, p_year, p_month, COALESCE(v_attended, 0), COALESCE(v_attended, 0), COALESCE(v_total, 0))
  ON CONFLICT (user_id, year, month) DO UPDATE SET
    score = EXCLUDED.score,
    events_attended = EXCLUDED.events_attended,
    events_total = EXCLUDED.events_total,
    updated_at = CURRENT_TIMESTAMP;
END;
$$;
