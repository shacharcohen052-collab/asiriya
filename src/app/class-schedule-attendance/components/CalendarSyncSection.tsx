'use client';
import React, { useState } from 'react';
import { Calendar, Download, Unlink, RefreshCw, Loader2 } from 'lucide-react';
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

export default function CalendarSyncSection({ events = [] }: { events?: ScheduleEvent[] }) {
  const [googleStatus, setGoogleStatus] = useState(MOCK_SYNC_STATUS.google);
  const [appleStatus] = useState(MOCK_SYNC_STATUS.apple);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleGoogleSync = () => {
    void handleICSExport();
  };

  const handleGoogleDisconnect = () => {
    // Backend integration point: DELETE /api/calendar-connections?provider=google
    toast.success('הסנכרון נותק בהצלחה.');
    setGoogleStatus({ connected: false, calendarName: '', syncedCount: 0, lastSynced: '' });
  };

  const handleGoogleConnect = () => {
    void handleICSExport();
  };

  const handleICSExport = async () => {
    setExporting(true);
    const plannedEvents = events.filter((event) => event.myPlan && event.myPlan !== 'not_coming');
    const escapeICS = (value: string) => value.replace(/\\/g, '\\\\').replace(/[,;\n]/g, (match) => match === '\n' ? '\\n' : `\\${match}`);
    const icsDate = (date: string, time: string) => `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Asiriya//Schedule//HE', 'CALSCALE:GREGORIAN',
      ...plannedEvents.flatMap((event) => [
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
    toast.success(plannedEvents.length ? `קובץ ICS מוכן (${plannedEvents.length} אירועים).` : 'אין עדיין אירועים שסומנו להגעה.');
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 card-shadow fade-in">
      <h2 className="text-base font-bold text-foreground mb-4">סנכרון יומן אישי</h2>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        רק אירועים שסימנת שאתה מתכנן להגיע אליהם יתווספו ליומן האישי שלך.
      </p>

      <div className="space-y-4">
        {/* Google Calendar */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <Calendar size={18} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Google Calendar</p>
                {googleStatus.connected && (
                  <p className="text-xs text-muted-foreground">{googleStatus.calendarName}</p>
                )}
              </div>
            </div>
            <span
              className={`text-2xs font-semibold px-2.5 py-1 rounded-full ${
                googleStatus.connected
                  ? 'bg-green-50 text-green-700' :'bg-muted text-muted-foreground'
              }`}
            >
              {googleStatus.connected ? 'מחובר' : 'לא מחובר'}
            </span>
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
                      סנכרן עכשיו
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
              ייצא ל-Google Calendar
            </button>
          )}
        </div>

        {/* Apple Calendar / ICS */}
        <div className="border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <Calendar size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Apple Calendar</p>
                <p className="text-xs text-muted-foreground">ייצוא קובץ ICS אישי</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            הורד קובץ ICS הכולל רק את האירועים שסימנת שאתה מתכנן להגיע אליהם. פתח אותו ביישום היומן שלך.
          </p>

          {appleStatus.lastExport && (
            <p className="text-2xs text-muted-foreground mb-2">
              ייצוא אחרון: {appleStatus.lastExport}
            </p>
          )}

          <button
            onClick={handleICSExport}
            disabled={exporting}
            className="btn-secondary w-full text-sm py-2"
          >
            {exporting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                מכין קובץ...
              </>
            ) : (
              <>
                <Download size={14} />
                ייצא ל-Apple Calendar
              </>
            )}
          </button>
          {downloadUrl && (
            <a href={downloadUrl} download="asiriya-schedule.ics" target="_blank" rel="noreferrer" className="mt-2 block text-center text-xs font-semibold text-primary hover:underline">
              אם ההורדה לא התחילה: לחץ כאן לפתיחת קובץ ה־ICS
            </a>
          )}
        </div>
      </div>

      <p className="text-2xs text-muted-foreground mt-4">
        היומן החיצוני שלך פרטי לחלוטין. האפליקציה לא קוראת אירועים אחרים מהיומן שלך.
      </p>
    </div>
  );
}
