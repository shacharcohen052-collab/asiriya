'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import type { ScheduleEvent } from './AddScheduleModal';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_HEIGHT = 32;
const PLAN_OPTIONS = [
  { key: 'routing', label: 'מנתב' },
  { key: 'physical', label: 'פיזית' },
  { key: 'virtual', label: 'וירטואלית' },
  { key: 'with_help', label: "בעזרת ה'" },
  { key: 'not_coming', label: 'לא מגיע' },
];

function weekStart(offset: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - date.getDay() + offset * 7);
  return date;
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function minutes(time: string) {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

export default function CalendarScheduleView({
  weekOffset,
  events,
  onDeleteEvent,
  onPlanChange,
  onAttendanceReport,
}: {
  weekOffset: number;
  events: ScheduleEvent[];
  onDeleteEvent?: (id: string) => void;
  onPlanChange?: (id: string, plan: string | null) => void;
  onAttendanceReport?: (id: string, status: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const days = useMemo(() => {
    const start = weekStart(weekOffset);
    return DAYS.map((label, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return { label, date, key: dateKey(date) };
    });
  }, [weekOffset]);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => START_HOUR + index);
  const eventsByDay = useMemo(() => {
    const groups: Record<string, ScheduleEvent[]> = {};
    events.forEach((event) => {
      if (!groups[event.date]) groups[event.date] = [];
      groups[event.date].push(event);
    });
    return groups;
  }, [events]);

  const selectedIsZoomOnly = selectedEvent ? /זום|עשירייה/i.test(selectedEvent.title) : false;
  const selectedIsPast = selectedEvent ? new Date(`${selectedEvent.date}T${selectedEvent.endTime}`) <= new Date() : false;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [weekOffset]);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm" dir="rtl">
      <div ref={scrollRef} className="max-h-[68vh] overflow-auto">
        <div className="min-w-[640px]">
          <div className="sticky top-0 z-30 grid grid-cols-[48px_repeat(7,minmax(84px,1fr))] border-b border-border bg-card shadow-sm" dir="rtl">
            <div className="sticky right-0 z-40 border-r border-border bg-card" />
            {days.map((day) => {
              const isToday = day.key === dateKey(new Date());
              return (
                <div key={day.key} className={`min-h-[68px] border-r border-border px-2 py-3 text-center ${isToday ? 'bg-primary/10' : 'bg-card'}`} dir="rtl">
                  <div className="text-xs font-semibold text-muted-foreground">{day.label}</div>
                  <div className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${isToday ? 'bg-primary text-white' : 'text-foreground'}`}>
                    {day.date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[48px_repeat(7,minmax(84px,1fr))]" dir="rtl">
            <div className="sticky right-0 z-20 relative bg-card" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
              {hours.map((hour) => (
                <div key={hour} className="relative border-b border-border" style={{ height: `${HOUR_HEIGHT}px` }}>
                  <span className="absolute -top-2 right-2 bg-card px-1 text-[11px] tabular-nums text-muted-foreground">
                    {String(hour).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {days.map((day) => (
              <div key={day.key} className="relative border-r border-border" style={{ height: `${hours.length * HOUR_HEIGHT}px` }}>
                {hours.map((hour) => (
                  <div key={hour} className="border-b border-border" style={{ height: `${HOUR_HEIGHT}px` }} />
                ))}
                {(eventsByDay[day.key] ?? []).map((event) => {
                  const start = Math.max(minutes(event.startTime), START_HOUR * 60);
                  const end = Math.min(Math.max(minutes(event.endTime), start + 15), END_HOUR * 60);
                  const exactHeight = ((end - start) / 60) * HOUR_HEIGHT;
                  // Give very short meetings enough visual room while anchoring
                  // their bottom edge to the real end time (12:00 for PT100).
                  const height = Math.max(exactHeight, 28);
                  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT - (height - exactHeight);
                  return (
                    <div
                      key={event.id}
                      className={`absolute inset-x-0.5 z-10 overflow-hidden rounded-md border text-right shadow-sm ${height < 28 ? 'px-0.5 py-0' : 'px-1 py-0.5'} ${event.isFixed ? 'border-amber-300 bg-amber-200 text-amber-950' : 'border-blue-200 bg-blue-50'}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      dir="rtl"
                      title={`${event.title} ${event.startTime}–${event.endTime}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedEvent(event)}
                      onKeyDown={(keyboardEvent) => {
                        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') setSelectedEvent(event);
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className={`truncate font-bold text-foreground ${height < 28 ? 'text-[9px]' : 'text-[10px]'}`}>{event.title}</p>
                        {onDeleteEvent && (
                          <button
                            type="button"
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="הסר אירוע"
                            aria-label="הסר אירוע"
                            onClick={(clickEvent) => {
                              clickEvent.stopPropagation();
                              if (window.confirm('להסיר את האירוע הזה מהלו״ז?')) onDeleteEvent(event.id);
                            }}
                          >
                            <Trash2 size={10} />
                          </button>
                        )}
                      </div>
                      {height >= 28 && <p className="text-[9px] text-muted-foreground">{event.startTime}–{event.endTime}</p>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl" dir="rtl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-foreground">{selectedEvent.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{selectedEvent.startTime}–{selectedEvent.endTime}</p>
              </div>
              <button type="button" onClick={() => setSelectedEvent(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted" aria-label="סגור">×</button>
            </div>

            {!selectedIsPast ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">איך אתה מתכנן להגיע?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(selectedIsZoomOnly ? [{ key: 'virtual', label: 'וירטואלית' }] : PLAN_OPTIONS).map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        onPlanChange?.(selectedEvent.id, selectedEvent.myPlan === option.key ? null : option.key);
                        setSelectedEvent(null);
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${selectedEvent.myPlan === option.key ? 'border-primary bg-primary text-white' : 'border-border text-foreground hover:border-primary hover:bg-primary/5'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedEvent.myActualAttendance === null ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">האם הגעת לשיעור?</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { onAttendanceReport?.(selectedEvent.id, 'attended'); setSelectedEvent(null); }} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-100"><Check size={13} />הגעתי</button>
                  <button type="button" onClick={() => { onAttendanceReport?.(selectedEvent.id, 'not_attended'); setSelectedEvent(null); }} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-border"><X size={13} />לא הגעתי</button>
                </div>
              </div>
            ) : (
              <p className="rounded-lg bg-muted p-3 text-center text-sm text-muted-foreground">הדיווח נשמר: {selectedEvent.myActualAttendance === 'attended' ? 'הגעתי' : 'לא הגעתי'}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
