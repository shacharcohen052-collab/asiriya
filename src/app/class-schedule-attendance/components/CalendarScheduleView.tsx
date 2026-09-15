'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import type { ScheduleEvent } from './AddScheduleModal';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const START_HOUR = 0;
const END_HOUR = 23;
const HOUR_HEIGHT = 64;

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
}: {
  weekOffset: number;
  events: ScheduleEvent[];
  onDeleteEvent?: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, left: 0 });
  }, [weekOffset]);

  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm" dir="rtl">
      <div ref={scrollRef} className="max-h-[72vh] overflow-auto">
        <div className="min-w-[900px]">
          <div className="sticky top-0 z-30 grid grid-cols-[64px_repeat(7,minmax(118px,1fr))] border-b border-border bg-card shadow-sm" dir="rtl">
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

          <div className="grid grid-cols-[64px_repeat(7,minmax(118px,1fr))]" dir="rtl">
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
                  const top = ((start - START_HOUR * 60) / 60) * HOUR_HEIGHT;
                  const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 28);
                  return (
                    <div
                      key={event.id}
                      className={`absolute inset-x-1 z-10 overflow-hidden rounded-lg border text-right shadow-sm ${height < 42 ? 'px-1 py-0.5' : 'px-2 py-1.5'} ${event.isFixed ? 'border-primary/30 bg-primary/10' : 'border-blue-200 bg-blue-50'}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                      dir="rtl"
                      title={`${event.title} ${event.startTime}–${event.endTime}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <p className={`truncate font-bold text-foreground ${height < 42 ? 'text-[10px]' : 'text-xs'}`}>{event.title}</p>
                        {onDeleteEvent && (
                          <button
                            type="button"
                            className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="הסר אירוע"
                            aria-label="הסר אירוע"
                            onClick={() => {
                              if (window.confirm('להסיר את האירוע הזה מהלו״ז?')) onDeleteEvent(event.id);
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      {height >= 42 && <p className="text-[11px] text-muted-foreground">{event.startTime}–{event.endTime}</p>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
