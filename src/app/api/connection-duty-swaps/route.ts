import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SwapRow = {
  id: string;
  duty_date: string;
  requested_by: string;
  requested_to: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  created_at: string;
  responded_at: string | null;
};

type ProfileRow = { id: string; display_name: string; profile_id: number | null };

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function sendPush(userId: string, payload: { title: string; body: string; url: string; tag: string }) {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const admin = adminClient();
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId);

  for (const subscription of subscriptions || []) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify(payload),
      );
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      } else {
        console.error('Duty swap push failed', { userId, statusCode });
      }
    }
  }
}

async function getCurrentProfileId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data, error } = await supabase.rpc('current_profile_id');
  if (error || !data) return null;
  return data as string;
}

async function enrich(rows: SwapRow[], supabase: Awaited<ReturnType<typeof createClient>>) {
  const ids = [...new Set(rows.flatMap((row) => [row.requested_by, row.requested_to]))];
  if (!ids.length) return rows.map((row) => ({ ...row, requester: null, recipient: null }));
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id,display_name,profile_id')
    .in('id', ids);
  const byId = new Map(((profiles || []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  return rows.map((row) => ({
    ...row,
    requester: byId.get(row.requested_by) || null,
    recipient: byId.get(row.requested_to) || null,
  }));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const currentProfileId = await getCurrentProfileId(supabase);
  if (!currentProfileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  let query = supabase
    .from('connection_duty_swap_requests')
    .select('id,duty_date,requested_by,requested_to,status,created_at,responded_at')
    .order('duty_date', { ascending: true });
  if (start) query = query.gte('duty_date', start);
  if (end) query = query.lte('duty_date', end);
  const { data, error } = await query.limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: await enrich((data || []) as SwapRow[], supabase) });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const currentProfileId = await getCurrentProfileId(supabase);
  if (!currentProfileId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json() as {
    action?: 'create' | 'respond';
    dutyDate?: string;
    requestedTo?: string;
    requestId?: string;
    status?: 'accepted' | 'rejected';
  };

  if (body.action === 'create') {
    if (!body.dutyDate || !body.requestedTo || body.requestedTo === currentProfileId) {
      return NextResponse.json({ error: 'invalid_swap_request' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('connection_duty_swap_requests')
      .insert({ duty_date: body.dutyDate, requested_by: currentProfileId, requested_to: body.requestedTo })
      .select('id,duty_date,requested_by,requested_to,status,created_at,responded_at')
      .single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'pending_request_exists' : error.message }, { status: 400 });

    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id,display_name')
      .in('id', [currentProfileId, body.requestedTo]);
    const byId = new Map((profiles || []).map((profile) => [profile.id, profile.display_name]));
    await sendPush(body.requestedTo, {
      title: 'בקשת החלפה חדשה',
      body: `${byId.get(currentProfileId) || 'חבר'} מבקש להחליף איתך את תורנות החיבור בתאריך ${body.dutyDate}`,
      url: '/connection-duties',
      tag: `duty-swap-${data.id}`,
    });
    return NextResponse.json({ request: data }, { status: 201 });
  }

  if (body.action === 'respond' && body.requestId && body.status) {
    const { data, error } = await supabase
      .from('connection_duty_swap_requests')
      .update({ status: body.status, responded_at: new Date().toISOString() })
      .eq('id', body.requestId)
      .eq('requested_to', currentProfileId)
      .eq('status', 'pending')
      .select('id,duty_date,requested_by,requested_to,status,created_at,responded_at')
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: 'request_not_found_or_already_answered' }, { status: 404 });

    const { data: recipient } = await supabase
      .from('user_profiles')
      .select('display_name')
      .eq('id', currentProfileId)
      .maybeSingle();
    await sendPush(data.requested_by, {
      title: body.status === 'accepted' ? 'בקשת ההחלפה אושרה' : 'בקשת ההחלפה נדחתה',
      body: `${recipient?.display_name || 'החבר'} ${body.status === 'accepted' ? 'אישר/ה' : 'דחה/תה'} את ההחלפה לתאריך ${data.duty_date}`,
      url: '/connection-duties',
      tag: `duty-swap-response-${data.id}`,
    });
    return NextResponse.json({ request: data });
  }

  return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
}
