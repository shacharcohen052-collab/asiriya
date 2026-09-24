-- Persistent connection-duty swap requests with explicit approval.
CREATE TABLE IF NOT EXISTS public.connection_duty_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  duty_date DATE NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  requested_to UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMPTZ,
  CONSTRAINT connection_duty_swap_requests_different_users CHECK (requested_by <> requested_to)
);

CREATE INDEX IF NOT EXISTS idx_duty_swap_requests_requested_by
  ON public.connection_duty_swap_requests(requested_by, duty_date);
CREATE INDEX IF NOT EXISTS idx_duty_swap_requests_requested_to
  ON public.connection_duty_swap_requests(requested_to, duty_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_pending_duty_swap_per_requester
  ON public.connection_duty_swap_requests(requested_by, duty_date)
  WHERE status = 'pending';

ALTER TABLE public.connection_duty_swap_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_read_own_duty_swap_requests" ON public.connection_duty_swap_requests;
CREATE POLICY "members_read_own_duty_swap_requests"
ON public.connection_duty_swap_requests
FOR SELECT TO authenticated
USING (
  requested_by = public.current_profile_id()
  OR requested_to = public.current_profile_id()
);

DROP POLICY IF EXISTS "members_create_own_duty_swap_requests" ON public.connection_duty_swap_requests;
CREATE POLICY "members_create_own_duty_swap_requests"
ON public.connection_duty_swap_requests
FOR INSERT TO authenticated
WITH CHECK (requested_by = public.current_profile_id());

DROP POLICY IF EXISTS "members_answer_received_duty_swap_requests" ON public.connection_duty_swap_requests;
CREATE POLICY "members_answer_received_duty_swap_requests"
ON public.connection_duty_swap_requests
FOR UPDATE TO authenticated
USING (requested_to = public.current_profile_id() AND status = 'pending')
WITH CHECK (requested_to = public.current_profile_id());

GRANT SELECT, INSERT, UPDATE ON public.connection_duty_swap_requests TO authenticated;
COMMENT ON TABLE public.connection_duty_swap_requests IS
  'Member-to-member requests to exchange a connection duty, requiring recipient approval.';
