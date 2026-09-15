-- Add the recurring Friday ten-person meeting at 16:00.
-- The meeting is intentionally placed after the first meal (14:30–15:15).

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
    VALUES ('זום PT100', v_date, '11:45', '12:00', true, 'fixed_schedule', true, true, 1, 0, public.current_profile_id(), true,
      lower('זום PT100') || '|' || v_date::text || '|11:45:00|12:00:00')
    ON CONFLICT (dedupe_key) DO UPDATE
      SET is_active = true, is_fixed = true, counts_for_score = true, score_value = 1;

    IF v_day <> 5 THEN
      INSERT INTO public.schedule_events
        (title, event_date, start_time, end_time, is_fixed, source, allows_attendance_plan,
         counts_for_score, score_value, week_offset, created_by, is_active, dedupe_key)
      VALUES ('זום PT100', v_date, '18:00', '18:30', true, 'fixed_schedule', true, true, 1, 0, public.current_profile_id(), true,
        lower('זום PT100') || '|' || v_date::text || '|18:00:00|18:30:00')
      ON CONFLICT (dedupe_key) DO UPDATE
        SET is_active = true, is_fixed = true, counts_for_score = true, score_value = 1;
    ELSE
      UPDATE public.schedule_events
      SET is_active = false
      WHERE event_date = v_date
        AND start_time = '18:00'
        AND end_time = '18:30'
        AND is_fixed = true
        AND source = 'fixed_schedule';
    END IF;

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
    ELSIF v_day = 5 THEN
      INSERT INTO public.schedule_events
        (title, event_date, start_time, end_time, is_fixed, source, allows_attendance_plan, counts_for_score, score_value, created_by, is_active, dedupe_key)
      VALUES ('ישיבת עשירייה', v_date, '16:00', '17:30', true, 'fixed_schedule', true, true, 1, public.current_profile_id(), true,
        lower('ישיבת עשירייה') || '|' || v_date::text || '|16:00:00|17:30:00')
      ON CONFLICT (dedupe_key) DO UPDATE
        SET is_active = true, is_fixed = true, counts_for_score = true, score_value = 1;
    END IF;

    v_date := v_date + 1;
  END LOOP;
END;
$$;
