'use client';
import React, { useEffect, useState } from 'react';
import { Calendar, Download, Unlink, RefreshCw, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { ScheduleEvent } from './AddScheduleModal';

const INITIAL_GOOGLE_STATUS = {
  connected: false,
  calendarName: '',
  syncedCount: 0,
  lastSynced: '',
};

type ExportMode = 'all' | 'planned';

export default function CalendarSyncSection({ events = [], weekOffset = 0 }: { events?: ScheduleEvent[]; weekOffset?: number }) {
  const router = useRouter();
  const [googleStatus, setGoogleStatus] = useState(INITIAL_GOOGLE_STATUS);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [syncPlannedOnly, setSyncPlannedOnly] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/google-calendar/status', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((status) => { if (active && status) setGoogleStatus(status); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const getWeeklyEvents = (mode: ExportMode): ScheduleEvent[] => {
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
    return mode === 'planned'
      ? currentWeekEvents.filter((event) => Boolean(event.myPlan) && event.myPlan !== 'not_coming')
      : currentWeekEvents;
  };

  const handleICSExport = async (mode: ExportMode) => {
    setExporting(true);
    setExportMode(mode);
    const exportEvents = getWeeklyEvents(mode);
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
        `DESCRIPTION:${escapeICS(`תכנון הגעה: ${event.myPlan || 'לא סומן'}`)}`,
        'END:VEVENT',
      ]),
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    setDownloadUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `asiriya-schedule-${mode}.ics`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setExporting(false);
    toast.success(`${mode === 'planned' ? 'הלוז שאישרת' : 'הלו״ז המלא'} יוצא ליומן (${exportEvents.length} אירועים).`);
  };

  const handleGoogleCalendarSync = async () => {
    setSyncing(true);
    try {
      const weeklyEvents = getWeeklyEvents(syncPlannedOnly ? 'planned' : 'all');
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

  const disconnectGoogle = () => {
    toast.success('הסנכרון נותק בהצלחה.');
    setGoogleStatus(INITIAL_GOOGLE_STATUS);
  };

  return (
    <div className="space-y-4 fade-in">
      <div className="bg-card border border-border rounded-2xl p-5 card-shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Download size={18} className="text-primary" /></div>
          <div>
            <h2 className="text-base font-bold text-foreground">ייבוא הלוז</h2>
            <p className="text-xs text-muted-foreground">בחר איזה תוכן להוריד ליומן לשבוע הנוכחי</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {(['all', 'planned'] as ExportMode[]).map((mode) => (
            <button key={mode} type="button" onClick={() => setExportMode(mode)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${exportMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'}`}>
              {mode === 'all' ? 'לוז מלא' : 'לוז שאישרתי הגעה'}
            </button>
          ))}
        </div>
        <button onClick={() => void handleICSExport(exportMode)} disabled={exporting} className="btn-primary w-full text-sm py-2 mt-3">
          {exporting ? <><Loader2 size={14} className="animate-spin" /> מכין קובץ...</> : <><Download size={14} /> הורד את הבחירה ליומן</>}
        </button>
        {downloadUrl && <p className="mt-3 text-center text-xs text-muted-foreground">הקובץ האחרון מוכן לייבוא ב-Google או Apple Calendar</p>}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 card-shadow-md">
        <h2 className="text-sm font-bold text-foreground mb-3">ייבוא השבוע הנוכחי ליומנים</h2>
        <div className="divide-y divide-border">
          <button onClick={() => void handleICSExport('all')} disabled={exporting} className="flex w-full items-center justify-between py-3 text-right hover:bg-muted/40 rounded-lg px-2">
            <span><span className="block text-sm font-semibold text-foreground">ייבוא השבוע הנוכחי ליומן Google</span><span className="block text-xs text-muted-foreground">קובץ ICS לייבוא ידני</span></span><Calendar size={18} className="text-red-500" />
          </button>
          <button onClick={() => void handleICSExport('all')} disabled={exporting} className="flex w-full items-center justify-between py-3 text-right hover:bg-muted/40 rounded-lg px-2">
            <span><span className="block text-sm font-semibold text-foreground">ייבוא השבוע ליומן Apple</span><span className="block text-xs text-muted-foreground">קובץ ICS לייבוא ידני</span></span><Calendar size={18} className="text-blue-500" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-primary/20 rounded-2xl p-5 card-shadow-md">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center"><RefreshCw size={18} className="text-red-500" /></div><div><h2 className="text-sm font-bold text-foreground">סנכרון יומן Google</h2><p className="text-xs text-muted-foreground">סנכרון האירועים שאישרת הגעה אליהם</p></div></div>
          <button type="button" onClick={() => { if (!googleStatus.connected) router.push('/settings#google-calendar'); }} className={`text-2xs font-semibold px-2.5 py-1 rounded-full ${googleStatus.connected ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>{googleStatus.connected ? 'מחובר' : 'לא מחובר'}</button>
        </div>
        <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground">
          <input type="checkbox" checked={syncPlannedOnly} onChange={(event) => setSyncPlannedOnly(event.target.checked)} className="h-4 w-4 accent-primary" />
          <span>סנכרן רק שיעורים שאישרתי הגעה אליהם</span>
        </label>
        {googleStatus.connected ? <div className="flex gap-2"><button onClick={() => void handleGoogleCalendarSync()} disabled={syncing} className="btn-primary text-xs py-2 flex-1">{syncing ? <><Loader2 size={13} className="animate-spin" /> מסנכרן...</> : <><RefreshCw size={13} /> סנכרן את הבחירה</>}</button><button onClick={disconnectGoogle} className="btn-ghost text-xs py-2 px-3 text-destructive"><Unlink size={13} /> נתק</button></div> : <button onClick={() => router.push('/settings#google-calendar')} className="btn-secondary w-full text-sm py-2">חבר את Google Calendar</button>}
      </div>

      <p className="text-2xs text-muted-foreground">היומן החיצוני שלך פרטי לחלוטין. האפליקציה לא קוראת אירועים אחרים מהיומן שלך.</p>
    </div>
  );
}
