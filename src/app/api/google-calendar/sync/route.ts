import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type SyncEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  myPlan?: string | null;
};

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret, grant_type: 'refresh_token' }),
    cache: 'no-store',
  });
  if (!response.ok) return null;
  return await response.json() as { access_token?: string; expires_in?: number };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'auth_required' }, { status: 401 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return NextResponse.json({ error: 'missing_credentials' }, { status: 503 });

  const body = await request.json() as { events?: SyncEvent[] };
  const events = (body.events || []).filter((event) => event.date && event.startTime && event.endTime);
  if (!events.length) return NextResponse.json({ error: 'no_events_selected' }, { status: 422 });
  const { data: connection, error: connectionError } = await supabase
    .from('calendar_connections')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();
  if (connectionError || !connection) return NextResponse.json({ error: 'google_not_connected' }, { status: 409 });

  let accessToken = connection.access_token;
  if (connection.expires_at && new Date(connection.expires_at).getTime() < Date.now() + 60_000 && connection.refresh_token) {
    const refreshed = await refreshAccessToken(connection.refresh_token, clientId, clientSecret);
    if (!refreshed?.access_token) return NextResponse.json({ error: 'token_refresh_failed' }, { status: 401 });
    accessToken = refreshed.access_token;
    await supabase.from('calendar_connections').update({
      access_token: accessToken,
      expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id).eq('provider', 'google');
  }

  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  let syncedCount = 0;
  for (const event of events) {
    const googleEventId = event.id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 40) || `asiriya${Date.now()}${syncedCount}`;
    const googleEvent = {
      id: googleEventId,
      summary: event.title,
      description: event.myPlan ? `תכנון הגעה: ${event.myPlan}` : 'נוצר מ-Asiriya',
      start: { dateTime: `${event.date}T${event.startTime}:00`, timeZone: 'Asia/Jerusalem' },
      end: { dateTime: `${event.date}T${event.endTime}:00`, timeZone: 'Asia/Jerusalem' },
      extendedProperties: { private: { asiriyaEventId: event.id } },
    };
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'PUT', headers, body: JSON.stringify(googleEvent), cache: 'no-store',
    });
    if (response.ok) syncedCount += 1;
    else if (response.status === 401) return NextResponse.json({ error: 'google_authorization_expired' }, { status: 401 });
    else {
      const errorBody = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      return NextResponse.json({ error: 'google_api_error', details: errorBody?.error?.message || `HTTP ${response.status}` }, { status: 502 });
    }
  }

  await supabase.from('calendar_connections').update({ updated_at: new Date().toISOString() }).eq('user_id', user.id).eq('provider', 'google');
  return NextResponse.json({ syncedCount });
}
