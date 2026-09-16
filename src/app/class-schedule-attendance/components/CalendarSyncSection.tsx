'use client';
import React, { useEffect, useState } from 'react';
import { Calendar, Download, Unlink, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ScheduleEvent } from './AddScheduleModal';

// Backend integration point: fetch user's calendar sync status from /api/calendar-connections?userId=me
const MOCK_SYNC_STATUS = {
  google: {
    connected: false,
    calendarName: '',
    syncedCount: 0,
    lastSynced: '',
  },
  apple: {
    connected: false,
    lastExport: null as string | null,
  },
};

export default function CalendarSyncSection({ events = [], weekOffset = 0 }: { events?: ScheduleEvent[]; weekOffset?: number }) {
  const router = useRouter();
  const [googleStatus, setGoogleStatus] = useState(MOCK_SYNC_STATUS.google);
  const [appleStatus] = useState(MOCK_SYNC_STATUS.apple);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/google-calendar/status', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((status) => { if (active && status) setGoogleStatus(status); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const handleGoogleSync = () => {
    void handleGoogleCalendarSync();
  };

  const handleGoogleDisconnect = () => {
    // Backend integration point: DELETE /api/calendar-connections?provider=google
    toast.success('הסנכרון נותק בהצלחה.');
    setGoogleStatus({ connected: false, calendarName: '', syncedCount: 0, lastSynced: '' });
  };

  const handleGoogleConnect = () => {
    router.push('/settings#google-calendar');
  };

  const handleGoogleCalendarSync = async () => {
    setSyncing(true);
    try {
      const weeklyEvents = getWeeklyExportEvents();
      const response = await fetch('/api/google-calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: weeklyEvents }),
      });
      const result = await response.json() as { syncedCount?: number; error?: string };
      if (!response.ok) {
        const messages: Record<string, string> = {
          missing_credentials: 'חסרים פרטי OAuth ב-Vercel.',
          google_not_connected: 'יש לחבר קודם את Google Calendar בהגדרות.',
          google_authorization_expired: 'הרשאת Google פגה. יש להתחבר מחדש.',
        };
        toast.error(messages[result.error || ''] || 'הסנכרון עם Google Calendar נכשל.');
        return;
      }
      setGoogleStatus((previous) => ({ ...previous, connected: true, syncedCount: result.syncedCount || 0, lastSynced: new Date().toISOString() }));
      toast.success(`סונכרנו ${result.syncedCount || 0} אירועים ל-Google Calendar.`);
    } catch {
      toast.error('לא ניתן להתחבר ל-Google Calendar כרגע.');
    } finally {
      setSyncing(false);
    }
  };

  const getWeeklyExportEvents = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const currentWeekEvents = events.filter((event) => {
      const eventDate = new Date(`${event.date}T12:00:00`);
      return eventDate >= weekStart && eventDate < weekEnd;
    });
    const plannedEvents = currentWeekEvents.filter((event) => event.myPlan && event.myPlan !== 'not_coming');
    return plannedEvents.length ? plannedEvents : currentWeekEvents;
  };

  const handleICSExport = async () => {
    setExporting(true);
    const exportEvents = getWeeklyExportEvents();
    const escapeICS = (value: string) => value.replace(/\\/g, '\\\\').replace(/[,;\n]/g, (match) => match === '\n' ? '\\n' : `\\${match}`);
    const icsDate = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Asiriya//Schedule//HE', 'CALSCALE:GREGORIAN',
      ...exportEvents.flatMap((event) => [
        'BEGIN:VEVENT',
        `UID:${event.id}@asiriya`,
        `DTSTART:${icsDate(event.date, event.startTime)}`,
        `DTEND:${icsDate(event.date, event.endTime)}`,
        `SUMMARY:${escapeICS(event.title)}`,
        `DESCRIPTION:${escapeICS(`תכנון הגעה: ${event.myPlan}`)}`,
        'END:VEVENT',
      ]),
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    setDownloadUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'asiriya-schedule.ics';
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setExporting(false);
    toast.success(`ייבוא שבוע נוכחי מוכן (${exportEvents.length} אירועים).`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 card-shadow-md fade-in">
      <div className="space-y-4">
        {/* One-time Google import */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <Calendar size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ייבוא חד־פעמי ל-Google Calendar</p>
              <p className="text-xs text-muted-foreground">קובץ לשבוע הנוכחי בלבד</p>
            </div>
          </div>
          <button onClick={handleICSExport} disabled={exporting} className="btn-secondary w-full text-sm py-2">
            {exporting ? <><Loader2 size={14} className="animate-spin" /> מכין קובץ...</> : <><Download size={14} /> הורד קובץ ל-Google</>}
          </button>
          {downloadUrl && <a href={downloadUrl} download="asiriya-schedule.ics" className="mt-2 block text-center text-xs font-semibold text-primary hover:underline">פתח קישור ייבוא ל-Google</a>}
        </div>

        {/* One-time Apple import */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar size={18} className="text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ייבוא חד־פעמי ל-Apple Calendar</p>
              <p className="text-xs text-muted-foreground">קובץ ICS לשבוע הנוכחי</p>
            </div>
          </div>
          <button onClick={handleICSExport} disabled={exporting} className="btn-secondary w-full text-sm py-2">
            {exporting ? <><Loader2 size={14} className="animate-spin" /> מכין קובץ...</> : <><Download size={14} /> הורד קובץ ל-Apple</>}
          </button>
          {downloadUrl && <a href={downloadUrl} download="asiriya-schedule.ics" className="mt-2 block text-center text-xs font-semibold text-primary hover:underline">פתח קישור ייבוא ל-Apple</a>}
        </div>

        {/* Automatic Google sync */}
        <div className="border border-primary/20 bg-primary/[0.03] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <RefreshCw size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">סנכרון אוטומטי ל-Google Calendar</p>
                <p className="text-xs text-muted-foreground">עדכון ישיר של אירועי השבוע ביומן שלך</p>
              </div>
            </div>
            <button type="button" onClick={() => { if (!googleStatus.connected) router.push('/settings#google-calendar'); }} className={`text-2xs font-semibold px-2.5 py-1 rounded-full ${googleStatus.connected ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
              {googleStatus.connected ? 'מחובר' : 'לא מחובר'}
            </button>
          </div>
          {googleStatus.connected ? (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-sm font-bold text-foreground font-tabular">{googleStatus.syncedCount}</p>
                  <p className="text-2xs text-muted-foreground">אירועים מסונכרנים</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-xs font-semibold text-foreground font-tabular">{googleStatus.lastSynced}</p>
                  <p className="text-2xs text-muted-foreground">סנכרון אחרון</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGoogleSync}
                  disabled={syncing}
                  className="btn-primary text-xs py-2 flex-1"
                >
                  {syncing ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      מסנכרן...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={13} />
                      סנכרן את השבוע עכשיו
                    </>
                  )}
                </button>
                <button
                  onClick={handleGoogleDisconnect}
                  className="btn-ghost text-xs py-2 px-3 text-destructive hover:bg-red-50"
                >
                  <Unlink size={13} />
                  נתק
                </button>
              </div>
            </>
          ) : (
            <button onClick={handleGoogleConnect} className="btn-secondary w-full text-sm py-2">
              חבר את Google Calendar והפעל סנכרון
            </button>
          )}
        </div>
      </div>

      <p className="text-2xs text-muted-foreground mt-4">
        היומן החיצוני שלך פרטי לחלוטין. האפליקציה לא קוראת אירועים אחרים מהיומן שלך.
      </p>
    </div>
  );
}
