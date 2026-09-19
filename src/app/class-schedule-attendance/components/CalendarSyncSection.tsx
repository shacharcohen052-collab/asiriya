'use client';
import React, { useEffect, useState } from 'react';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ScheduleEvent } from './AddScheduleModal';

type ExportMode = 'all' | 'planned';
type CalendarTarget = 'google' | 'apple';

export default function CalendarSyncSection({ events = [], weekOffset = 0 }: { events?: ScheduleEvent[]; weekOffset?: number }) {
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [exporting, setExporting] = useState<CalendarTarget | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (downloadUrl?.startsWith('blob:')) URL.revokeObjectURL(downloadUrl);
  }, [downloadUrl]);

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

  const buildICS = (mode: ExportMode) => {
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
    return { body, count: exportEvents.length };
  };

  const handleCalendarImport = (target: CalendarTarget) => {
    setExporting(target);
    const { body, count } = buildICS(exportMode);
    if (!count) {
      toast.error(exportMode === 'planned' ? 'לא סימנת שיעורים שתגיע אליהם בשבוע הנוכחי.' : 'אין אירועים בשבוע הנוכחי לייבוא.');
      setExporting(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    setDownloadUrl((previous) => {
      if (previous?.startsWith('blob:')) URL.revokeObjectURL(previous);
      return url;
    });
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `asiriya-${exportMode}-schedule.ics`;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setExporting(null);
    toast.success(`${target === 'google' ? 'Google Calendar' : 'Apple Calendar'}: קובץ הייבוא מוכן (${count} אירועים).`);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 card-shadow-md fade-in">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Download size={18} className="text-primary" /></div>
        <div><h2 className="text-base font-bold text-foreground">ייבוא הלוז ליומן</h2><p className="text-xs text-muted-foreground">בחר איזה לוז לייבא לשבוע הנוכחי</p></div>
      </div>

      <div className="grid grid-cols-1 gap-2 mt-4" role="radiogroup" aria-label="בחירת סוג לוז לייבוא">
        <button type="button" role="radio" aria-checked={exportMode === 'all'} onClick={() => setExportMode('all')} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-right transition-colors ${exportMode === 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/20 text-foreground hover:bg-muted/50'}`}>
          <span><span className="block text-sm font-bold">לוז מלא</span><span className="block text-xs opacity-75">כל האירועים של השבוע</span></span><span className={`h-5 w-5 rounded-full border-2 ${exportMode === 'all' ? 'border-primary bg-primary ring-4 ring-primary/15' : 'border-muted-foreground/40'}`} />
        </button>
        <button type="button" role="radio" aria-checked={exportMode === 'planned'} onClick={() => setExportMode('planned')} className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-right transition-colors ${exportMode === 'planned' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/20 text-foreground hover:bg-muted/50'}`}>
          <span><span className="block text-sm font-bold">לוז חלקי — אישרתי הגעה</span><span className="block text-xs opacity-75">רק שיעורים שסימנת שתגיע אליהם</span></span><span className={`h-5 w-5 rounded-full border-2 ${exportMode === 'planned' ? 'border-primary bg-primary ring-4 ring-primary/15' : 'border-muted-foreground/40'}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
        <button type="button" onClick={() => handleCalendarImport('google')} disabled={Boolean(exporting)} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60">
          {exporting === 'google' ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />} ייבוא ל-Google
        </button>
        <button type="button" onClick={() => handleCalendarImport('apple')} disabled={Boolean(exporting)} className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-60">
          {exporting === 'apple' ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />} ייבוא ל-Apple
        </button>
      </div>

      {downloadUrl && <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-xs font-semibold text-primary hover:underline">אם ההורדה לא נפתחה, לחץ כאן לפתיחת קובץ ה־ICS</a>}
      <p className="mt-4 text-2xs text-muted-foreground">הייבוא הוא ידני ומתבצע באמצעות קובץ ICS של הבחירה שלך.</p>
    </div>
  );
}
