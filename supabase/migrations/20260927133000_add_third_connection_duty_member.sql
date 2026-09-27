ALTER TABLE public.connection_duties
  ADD COLUMN IF NOT EXISTS member3_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_connection_duties_member3_id
  ON public.connection_duties(member3_id);
