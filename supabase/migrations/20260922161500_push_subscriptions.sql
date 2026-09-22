-- Web Push subscriptions for background notifications.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "users_manage_own_push_subscriptions" ON public.push_subscriptions
FOR ALL TO authenticated
USING (user_id = public.current_profile_id())
WITH CHECK (user_id = public.current_profile_id());

DROP POLICY IF EXISTS "admins_read_push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "admins_read_push_subscriptions" ON public.push_subscriptions
FOR SELECT TO authenticated
USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

COMMENT ON TABLE public.push_subscriptions IS
  'Browser Web Push subscriptions. Private to the owning user; server-side sending will use the stored endpoint keys.';
