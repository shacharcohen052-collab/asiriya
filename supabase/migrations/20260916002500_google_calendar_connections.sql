-- Store Google OAuth tokens separately from user_profiles.
-- Tokens are only accessible to the owning authenticated user.
CREATE TABLE IF NOT EXISTS public.calendar_connections (
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'google'),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_calendar_connections" ON public.calendar_connections;
CREATE POLICY "users_manage_own_calendar_connections" ON public.calendar_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

REVOKE ALL ON public.calendar_connections FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_connections TO authenticated;
