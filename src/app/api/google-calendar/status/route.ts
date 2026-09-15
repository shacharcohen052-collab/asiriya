import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ connected: false }, { status: 401 });

  const { data, error } = await supabase
    .from('calendar_connections')
    .select('provider, updated_at, scope')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle();

  if (error) return NextResponse.json({ connected: false, error: 'status_unavailable' }, { status: 500 });
  return NextResponse.json({
    connected: Boolean(data),
    calendarName: data ? 'Google Calendar' : '',
    syncedCount: 0,
    lastSynced: data?.updated_at || '',
  });
}
