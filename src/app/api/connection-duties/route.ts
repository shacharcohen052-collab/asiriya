import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
type Profile = { id: string; email: string; display_name: string };
type DutyRow = { duty_date: string; member1_id: string | null; member2_id: string | null; is_manual_override: boolean };

function adminClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function israelDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now);
}

function dateFromIso(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function isoFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function nextTuesdayOnOrAfter(iso: string) {
  const date = dateFromIso(iso);
  const offset = (2 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + offset);
  return isoFromDate(date);
}

function addDays(iso: string, days: number) {
  const date = dateFromIso(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return isoFromDate(date);
}

function daysBetween(start: string, end: string) {
  return Math.round((dateFromIso(end).getTime() - dateFromIso(start).getTime()) / 86400000);
}

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET || process.env.PUSH_CRON_SECRET;
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

function pairForDay(profiles: Profile[], dayIndex: number, seed: number): [number, number] {
  const pairs: [number, number][] = [];
  for (let first = 0; first < profiles.length; first += 1) {
    for (let second = first + 1; second < profiles.length; second += 1) pairs.push([first, second]);
  }
  const sorted = [...pairs].sort((a, b) => {
    const scoreA = ((a[0] * 37 + a[1] * 17 + 1) * seed) % 1009;
    const scoreB = ((b[0] * 37 + b[1] * 17 + 1) * seed) % 1009;
    return scoreA - scoreB;
  });
  const previous: number[] = dayIndex > 0 ? pairForDay(profiles, dayIndex - 1, seed).map((index: number) => index) : [];
  const available = sorted.filter(([first, second]) => !previous.includes(first) && !previous.includes(second));
  return (available.length ? available : sorted)[dayIndex % (available.length || sorted.length)];
}

async function generatePeriod(start: string) {
  const supabase = adminClient();
  const end = addDays(start, 13);
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id,email,display_name')
    .eq('is_approved', true)
    .eq('is_removed', false)
    .order('display_name', { ascending: true })
    .limit(200);
  if (profileError) throw profileError;
  const activeProfiles = (profiles || []) as Profile[];
  if (activeProfiles.length < 2) return { start, end, members: activeProfiles.length, rows: 0, reason: 'not_enough_active_members' };

  const { error: deleteError } = await supabase
    .from('connection_duties')
    .delete()
    .gte('duty_date', start)
    .lte('duty_date', end)
    .eq('is_manual_override', false);
  if (deleteError) throw deleteError;

  const seed = Number(start.replaceAll('-', ''));
  const rows = Array.from({ length: 14 }, (_, dayIndex) => {
    const [first, second] = pairForDay(activeProfiles, dayIndex, seed);
    return {
      duty_date: addDays(start, dayIndex),
      member1_id: activeProfiles[first].id,
      member2_id: activeProfiles[second].id,
      is_manual_override: false,
      note: `סבב דו־שבועי החל מ־${start}`,
    };
  });
  const { error: insertError } = await supabase.from('connection_duties').insert(rows);
  if (insertError) throw insertError;
  return { start, end, members: activeProfiles.length, rows: rows.length };
}

async function getDuties(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const start = url.searchParams.get('start') || addDays(israelDate(), -31);
  const end = url.searchParams.get('end') || addDays(israelDate(), 62);
  const { data, error } = await supabase
    .from('connection_duties')
    .select('duty_date,member1_id,member2_id,is_manual_override')
    .gte('duty_date', start)
    .lte('duty_date', end)
    .order('duty_date', { ascending: true })
    .limit(120);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (data || []) as DutyRow[];
  const ids = [...new Set(rows.flatMap((row) => [row.member1_id, row.member2_id]).filter(Boolean))] as string[];
  const { data: profiles } = ids.length
    ? await supabase.from('user_profiles').select('id,email,display_name').in('id', ids).limit(200)
    : { data: [] as Profile[] };
  const byId = new Map(((profiles || []) as Profile[]).map((profile) => [profile.id, profile]));
  return NextResponse.json({ duties: rows.map((row) => ({ ...row, member1: row.member1_id ? byId.get(row.member1_id) || null : null, member2: row.member2_id ? byId.get(row.member2_id) || null : null })) });
}

export async function GET(request: Request) {
  if (isAuthorized(request)) {
    const today = israelDate();
    const start = nextTuesdayOnOrAfter(today);
    const anchor = '2026-09-29';
    if (daysBetween(anchor, start) % 14 !== 0) {
      return NextResponse.json({ skipped: true, reason: 'not_biweekly_tuesday', today, nextTuesday: start });
    }
    try {
      return NextResponse.json(await generatePeriod(start));
    } catch (error) {
      console.error('Biweekly duty generation failed', error);
      return NextResponse.json({ error: 'duty_generation_failed' }, { status: 500 });
    }
  }
  return getDuties(request);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const today = israelDate();
  const start = nextTuesdayOnOrAfter(today);
  const anchor = '2026-09-29';
  if (daysBetween(anchor, start) % 14 !== 0) {
    return NextResponse.json({ skipped: true, reason: 'not_biweekly_tuesday', today, nextTuesday: start });
  }
  try {
    return NextResponse.json(await generatePeriod(start));
  } catch (error) {
    console.error('Biweekly duty generation failed', error);
    return NextResponse.json({ error: 'duty_generation_failed' }, { status: 500 });
  }
}
