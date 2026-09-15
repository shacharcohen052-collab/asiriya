-- Remove non-events that may already have been imported.
UPDATE public.schedule_events
SET is_active = false
WHERE is_active = true
  AND title ~* '(תפילה|הפסקה|לא[[:space:]]+משודר|הכנה[[:space:]]+לשיעור)';

-- Any approved member may soft-delete one event. Data is retained for history.
CREATE OR REPLACE FUNCTION public.delete_schedule_event(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_approved_member() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.schedule_events
  SET is_active = false
  WHERE id = p_event_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'event not found or already deleted';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_schedule_event(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_schedule_event(UUID) TO authenticated;
