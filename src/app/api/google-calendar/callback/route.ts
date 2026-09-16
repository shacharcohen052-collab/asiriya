import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const STATE_COOKIE = 'asiriya_google_oauth_state';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const redirectToSettings = (params: string) =>
    NextResponse.redirect(new URL(`/settings?${params}#google-calendar`, request.url));

  const code = requestUrl.searchParams.get('code');
  const returnedState = requestUrl.searchParams.get('state');
  const oauthError = requestUrl.searchParams.get('error');
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;

  cookieStore.delete(STATE_COOKIE);

  if (oauthError) return redirectToSettings(`google=denied&reason=${encodeURIComponent(oauthError)}`);
  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return redirectToSettings('google=invalid_state');
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirectToSettings('google=auth_required');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL('/api/google-calendar/callback', request.url).toString();
  if (!clientId || !clientSecret) return redirectToSettings('google=missing_credentials');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
    cache: 'no-store',
  });

  if (!tokenResponse.ok) return redirectToSettings('google=token_exchange_failed');
  const token = await tokenResponse.json() as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!token.access_token) return redirectToSettings('google=missing_access_token');

  const { data: existing } = await supabase
    .from('calendar_connections')
    .select('refresh_token')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();

  const { error: saveError } = await supabase.from('calendar_connections').upsert({
    user_id: user.id,
    provider: 'google',
    access_token: token.access_token,
    refresh_token: token.refresh_token || existing?.refresh_token || null,
    expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
    scope: token.scope || 'https://www.googleapis.com/auth/calendar.events',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,provider' });

  if (saveError) return redirectToSettings('google=save_failed');
  return redirectToSettings('google=connected');
}
