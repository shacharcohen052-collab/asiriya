import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Profile = { id: string; email: string; display_name: string };

function adminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } });
}
function dateFromIso(iso: string) { const [year, month, day] = iso.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day)); }
function isoFromDate(date: Date) { return date.toISOString().slice(0, 10); }
function addDays(iso: string, days: number) { const date = dateFromIso(iso); date.setUTCDate(date.getUTCDate() + days); return isoFromDate(date); }
function israelDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date()); }

function makePairs(profiles: Profile[], dates: string[]) {
  const pairs: Array<{ duty_date: string; member1_id: string; member2_id: string; is_manual_override: boolean; note: string }> = [];
  const allPairs: [number, number][] = [];
  for (let first = 0; first < profiles.length; first += 1) for (let second = first + 1; second < profiles.length; second += 1) allPairs.push([first, second]);
  let previous: [number, number] | null = null;
  const sorted = [...allPairs].sort((a, b) => (a[0] * 37 + a[1] * 17) - (b[0] * 37 + b[1] * 17));
  dates.forEach((dutyDate, index) => {
    const available = sorted.filter(([first, second]) => !previous || (!previous.includes(first) && !previous.includes(second)));
    const [first, second] = (available.length ? available : sorted)[index % (available.length || sorted.length)];
    previous = [first, second];
    pairs.push({ duty_date: dutyDate, member1_id: profiles[first].id, member2_id: profiles[second].id, is_manual_override: false, note: 'עודכן לאחר הצטרפות לסידור תורני החיבור' });
  });
  return pairs;
}

export async function POST() {
  const sessionClient = await createClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = adminClient();
  const { data: current, error: currentError } = await admin.from('user_profiles').select('id,is_approved,is_removed').eq('id', user.id).maybeSingle();
  if (currentError || !current?.is_approved || current.is_removed) return NextResponse.json({ error: 'member_not_eligible' }, { status: 403 });
  const { error: enableError } = await admin.from('user_profiles').update({ connection_duty_enabled: true }).eq('id', user.id);
  if (enableError) return NextResponse.json({ error: 'join_failed' }, { status: 500 });

  const cutoff = addDays(israelDate(), 14);
  const { data: futureDuties, error: dutiesError } = await admin.from('connection_duties').select('duty_date,is_manual_override').gte('duty_date', cutoff).eq('is_manual_override', false).order('duty_date', { ascending: true }).limit(120);
  if (dutiesError) return NextResponse.json({ joined: true, refreshed: 0 });
  const dates = [...new Set((futureDuties || []).map((row) => row.duty_date as string))];
  const { data: profiles, error: profileError } = await admin.from('user_profiles').select('id,email,display_name').eq('is_approved', true).eq('is_removed', false).eq('connection_duty_enabled', true).order('display_name', { ascending: true }).limit(200);
  if (profileError || !profiles || profiles.length < 2 || !dates.length) return NextResponse.json({ joined: true, refreshed: 0 });
  await admin.from('connection_duties').delete().in('duty_date', dates).eq('is_manual_override', false);
  const { error: insertError } = await admin.from('connection_duties').insert(makePairs(profiles as Profile[], dates));
  if (insertError) return NextResponse.json({ joined: true, refreshed: 0 });
  return NextResponse.json({ joined: true, refreshed: dates.length, from: cutoff });
}
