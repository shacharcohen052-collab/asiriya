ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS connection_duty_enabled BOOLEAN NOT NULL DEFAULT false;

UPDATE public.user_profiles
SET connection_duty_enabled = true
WHERE is_approved = true
  AND is_removed = false
  AND connection_duty_enabled = false;

CREATE INDEX IF NOT EXISTS idx_user_profiles_connection_duty_enabled
  ON public.user_profiles(connection_duty_enabled);
