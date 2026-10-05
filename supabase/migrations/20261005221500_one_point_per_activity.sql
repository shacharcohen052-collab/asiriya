-- Every scheduled activity counts equally, including PT100 Zoom.
CREATE OR REPLACE FUNCTION public.update_monthly_score(p_user_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attended INTEGER;
  v_total INTEGER;
BEGIN
  SELECT
    COUNT(aa.id),
    COUNT(se.id)
  INTO v_attended, v_total
  FROM public.schedule_events se
  LEFT JOIN public.actual_attendance aa
    ON aa.event_id = se.id
   AND aa.user_id = p_user_id
   AND aa.status = 'attended'
  WHERE EXTRACT(YEAR FROM se.event_date) = p_year
    AND EXTRACT(MONTH FROM se.event_date) = p_month;

  INSERT INTO public.monthly_scores (user_id, year, month, score, events_attended, events_total)
  VALUES (p_user_id, p_year, p_month, v_attended, v_attended, v_total)
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    score = EXCLUDED.score,
    events_attended = EXCLUDED.events_attended,
    events_total = EXCLUDED.events_total,
    updated_at = CURRENT_TIMESTAMP;
END;
$$;

-- Normalize existing scheduled activities so future imports use the same rule.
ALTER TABLE public.schedule_events ALTER COLUMN counts_for_score SET DEFAULT true;
ALTER TABLE public.schedule_events ALTER COLUMN score_value SET DEFAULT 1;
UPDATE public.schedule_events
SET counts_for_score = true, score_value = 1
WHERE counts_for_score IS DISTINCT FROM true OR score_value IS DISTINCT FROM 1;
