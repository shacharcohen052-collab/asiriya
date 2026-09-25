import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Slot = 'member1' | 'member2';
function adminClient() { return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } }); }

async function sendPush(userId: string, payload: { title: string; body: string; url: string; tag: string }) {
  const admin = adminClient();
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) return { sent: 0, reason: 'missing_server_configuration' };
  const { data: subscriptions } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId).limit(20);
  if (!subscriptions?.length) return { sent: 0, reason: 'recipient_has_no_subscription' };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  let sent = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload));
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      else console.error('Duty claim push failed', { userId, statusCode, error: String(error) });
    }
  }
  return { sent, reason: sent ? 'sent' : 'delivery_failed' };
}

export async function POST(request: Request) {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await request.json() as { dutyDate?: string; slot?: Slot };
  if (!body.dutyDate || (body.slot !== 'member1' && body.slot !== 'member2')) return NextResponse.json({ error: 'invalid_slot' }, { status: 400 });

  const admin = adminClient();
  const { data: claimant } = await admin.from('user_profiles').select('id,display_name,is_approved,is_removed,connection_duty_enabled').eq('id', user.id).maybeSingle();
  if (!claimant?.is_approved || claimant.is_removed) return NextResponse.json({ error: 'member_not_eligible' }, { status: 403 });
  const { data: duty, error: dutyError } = await admin.from('connection_duties').select('duty_date,member1_id,member2_id').eq('duty_date', body.dutyDate).maybeSingle();
  if (dutyError || !duty) return NextResponse.json({ error: 'duty_not_found' }, { status: 404 });

  const column = body.slot === 'member1' ? 'member1_id' : 'member2_id';
  const otherId = body.slot === 'member1' ? duty.member2_id : duty.member1_id;
  const existingId = body.slot === 'member1' ? duty.member1_id : duty.member2_id;
  if (existingId === user.id) return NextResponse.json({ error: 'already_joined' }, { status: 409 });
  if (existingId) {
    const { data: existing } = await admin.from('user_profiles').select('is_approved,is_removed,connection_duty_enabled').eq('id', existingId).maybeSingle();
    if (existing && existing.is_approved && !existing.is_removed && existing.connection_duty_enabled !== false) return NextResponse.json({ error: 'slot_taken' }, { status: 409 });
  }

  await admin.from('user_profiles').update({ connection_duty_enabled: true }).eq('id', user.id);
  let updateQuery = admin.from('connection_duties').update({ [column]: user.id, note: 'הצטרפות ידנית למשבצת תורנות' }).eq('duty_date', body.dutyDate);
  updateQuery = existingId ? updateQuery.eq(column, existingId) : updateQuery.is(column, null);
  const { data: updated, error: updateError } = await updateQuery.select('duty_date,member1_id,member2_id').maybeSingle();
  if (updateError || !updated) return NextResponse.json({ error: 'slot_taken' }, { status: 409 });

  let push: { sent: number; reason: string } = { sent: 0, reason: 'no_partner' };
  if (otherId && otherId !== user.id) {
    push = await sendPush(otherId, { title: 'חבר הצטרף לתורנות', body: `${claimant.display_name || 'חבר'} הצטרף לתורנות החיבור בתאריך ${body.dutyDate}`, url: '/connection-duties', tag: `duty-joined-${body.dutyDate}` });
  }
  return NextResponse.json({ duty: updated, push });
}
