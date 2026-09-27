CREATE OR REPLACE FUNCTION public.remove_pt100_member(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF p_profile_id = public.current_profile_id() THEN RAISE EXCEPTION 'an admin cannot remove themselves'; END IF;

  UPDATE public.user_profiles
  SET is_removed = true,
      is_approved = false,
      connection_duty_enabled = false,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = p_profile_id;

  UPDATE public.connection_duties d
  SET member1_id = (
    SELECT p.id FROM public.user_profiles p
    WHERE p.is_approved = true AND p.is_removed = false
      AND p.connection_duty_enabled = true
      AND p.id IS DISTINCT FROM d.member2_id
    ORDER BY random() LIMIT 1
  )
  WHERE d.member1_id = p_profile_id;

  UPDATE public.connection_duties d
  SET member2_id = (
    SELECT p.id FROM public.user_profiles p
    WHERE p.is_approved = true AND p.is_removed = false
      AND p.connection_duty_enabled = true
      AND p.id IS DISTINCT FROM d.member1_id
    ORDER BY random() LIMIT 1
  )
  WHERE d.member2_id = p_profile_id;

  UPDATE public.connection_duties
  SET member3_id = NULL
  WHERE member3_id = p_profile_id;

  DELETE FROM public.group_members WHERE user_id = p_profile_id;
END;
$function$;
