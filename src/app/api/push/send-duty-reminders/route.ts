import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { MEMBERS } from '@/data/members';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

type Member = (typeof MEMBERS)[number];
type SubscriptionRow = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type ProfileRow = { id: string; email: string; display_name: string; profile_id: number | null };

function getTomorrowInIsrael() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T12:00:00+03:00`);
  date.setDate(date.getDate() + 1);
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(date);
  const [year, month, day] = iso.split('-').map(Number);
  return { iso, year, month: month - 1, day, weekday: WEEKDAYS_HE[new Date(year, month - 1, day).getDay()] };
}

function fallbackPair(year: number, month: number, day: number): [Member, Member] {
  const allPairs: [number, number][] = [];
  for (let i = 0; i < MEMBERS.length; i += 1) {
    for (let j = i + 1; j < MEMBERS.length; j += 1) allPairs.push([i, j]);
  }
  const seed = year * 100 + month;
  const shuffled = [...allPairs].sort((a, b) => (((a[0] * 31 + a[1]) * seed) % 997) - (((b[0] * 31 + b[1]) * seed) % 997));
  let previous: [number, number] | null = null;
  let selected: [number, number] = shuffled[0];
  for (let current = 1; current <= day; current += 1) {
    const candidates = shuffled.filter(([a, b]) => !previous || (!previous.includes(a) && !previous.includes(b)));
    const source = candidates.length ? candidates : shuffled;
    selected = source[(current - 1) % source.length];
    previous = selected;
  }
  return [MEMBERS[selected[0]], MEMBERS[selected[1]]];
}

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.PUSH_CRON_SECRET;
  if (!secret) return false;
  return request.headers.get('authorization') === `Bearer ${secret}`;
}

async function sendDutyReminders(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'missing_push_server_configuration' }, { status: 503 });
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const tomorrow = getTomorrowInIsrael();
  const supabase = adminClient();
  const { data: savedDuty } = await supabase
    .from('connection_duties')
    .select('member1_id, member2_id')
    .eq('duty_date', tomorrow.iso)
    .maybeSingle();

  let profileIds: string[] = [];
  let names: string[] = [];
  if (savedDuty?.member1_id && savedDuty?.member2_id) {
    profileIds = [savedDuty.member1_id, savedDuty.member2_id];
    const { data: profiles } = await supabase.from('user_profiles').select('id,display_name').in('id', profileIds);
    names = (profiles || []).map((profile) => profile.display_name);
  } else {
    const [first, second] = fallbackPair(tomorrow.year, tomorrow.month, tomorrow.day);
    names = [first.displayName, second.displayName];
    const emails = [first.email, second.email];
    const { data: profiles } = await supabase.from('user_profiles').select('id,email').in('email', emails);
    profileIds = (profiles || []).map((profile) => profile.id);
  }

  if (!profileIds.length) return NextResponse.json({ date: tomorrow.iso, weekday: tomorrow.weekday, recipients: 0, sent: 0, reason: 'no_duty_profiles_found' });
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id,user_id,endpoint,p256dh,auth')
    .in('user_id', profileIds);
  if (error) return NextResponse.json({ error: 'subscription_lookup_failed' }, { status: 500 });

  let sent = 0;
  let removed = 0;
  for (const subscription of (subscriptions || []) as SubscriptionRow[]) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({
        title: 'מחר תורנות החיבור שלך',
        body: `${names.join(' ו־')} — כדאי ליצור קשר ולהתחבר יחד`,
        url: '/connection-duties',
        tag: `connection-duty-${tomorrow.iso}`,
      }));
      sent += 1;
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', subscription.id);
        removed += 1;
      } else {
        console.error('Web Push delivery failed', { subscriptionId: subscription.id, statusCode });
      }
    }
  }

  return NextResponse.json({ date: tomorrow.iso, weekday: tomorrow.weekday, recipients: subscriptions?.length || 0, sent, removed });
}

export async function GET(request: Request) {
  return sendDutyReminders(request);
}

export async function POST(request: Request) {
  return sendDutyReminders(request);
}
