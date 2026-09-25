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
  DELETE FROM public.group_members WHERE user_id = p_profile_id;
END;
$function$;
