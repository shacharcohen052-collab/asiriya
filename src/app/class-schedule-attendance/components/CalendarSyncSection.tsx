'use client';
import React, { useState } from 'react';
import { Calendar, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ScheduleEvent } from './AddScheduleModal';

type ExportMode = 'all' | 'planned';

export default function CalendarSyncSection({ events = [], weekOffset = 0 }: { events?: ScheduleEvent[]; weekOffset?: number }) {
  const [exporting, setExporting] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

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
        'BEGIN:VEVENT', `UID:${event.id}@asiriya`, `DTSTART:${icsDate(event.date, event.startTime)}`, `DTEND:${icsDate(event.date, event.endTime)}`,
        `SUMMARY:${escapeICS(event.title)}`, `DESCRIPTION:${escapeICS(`תכנון הגעה: ${event.myPlan || 'לא סומן'}`)}`, 'END:VEVENT',
      ]),
      'END:VCALENDAR',
    ].join('\r\n');
    const url = `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
    setDownloadUrl(url);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `asiriya-schedule-${mode}.ics`;
    anchor.target = '_blank';
    anchor.rel = 'noreferrer';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setExporting(false);
    toast.success(`${mode === 'planned' ? 'הלוז שאישרת' : 'הלו״ז המלא'} מוכן לייבוא (${exportEvents.length} אירועים).`);
  };

  return (
    <div className="space-y-4 fade-in">
      <div className="bg-card border border-border rounded-2xl p-5 card-shadow-md">
        <div className="flex items-center gap-3 mb-2"><div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Download size={18} className="text-primary" /></div><div><h2 className="text-base font-bold text-foreground">ייבוא הלוז</h2><p className="text-xs text-muted-foreground">בחר את סוג הלוז לשבוע הנוכחי</p></div></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
          {(['all', 'planned'] as ExportMode[]).map((mode) => <button key={mode} type="button" onClick={() => setExportMode(mode)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${exportMode === mode ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'}`}>{mode === 'all' ? 'לוז מלא' : 'לוז שאישרתי הגעה'}</button>)}
        </div>
        <button onClick={() => void handleICSExport(exportMode)} disabled={exporting} className="btn-primary w-full text-sm py-2 mt-3">{exporting ? <><Loader2 size={14} className="animate-spin" /> מכין קובץ...</> : <><Download size={14} /> הורד את הבחירה ליומן</>}</button>
        {downloadUrl && <a href={downloadUrl} target="_blank" rel="noreferrer" className="mt-3 block text-center text-xs font-semibold text-primary hover:underline">פתח את הקובץ ב-Safari לייבוא ליומן</a>}
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 card-shadow-md">
        <h2 className="text-sm font-bold text-foreground mb-3">ייבוא השבוע הנוכחי ליומנים</h2>
        <div className="divide-y divide-border">
          <button onClick={() => void handleICSExport(exportMode)} disabled={exporting} className="flex w-full items-center justify-between py-3 text-right hover:bg-muted/40 rounded-lg px-2"><span><span className="block text-sm font-semibold text-foreground">ייבוא השבוע הנוכחי ליומן Google</span><span className="block text-xs text-muted-foreground">קובץ ICS לייבוא ידני</span></span><Calendar size={18} className="text-red-500" /></button>
          <button onClick={() => void handleICSExport(exportMode)} disabled={exporting} className="flex w-full items-center justify-between py-3 text-right hover:bg-muted/40 rounded-lg px-2"><span><span className="block text-sm font-semibold text-foreground">ייבוא השבוע ליומן Apple</span><span className="block text-xs text-muted-foreground">קובץ ICS לייבוא ידני</span></span><Calendar size={18} className="text-blue-500" /></button>
        </div>
      </div>
      <p className="text-2xs text-muted-foreground">הייבוא מתבצע ידנית באמצעות קובץ השבוע שבחרת.</p>
    </div>
  );
}
