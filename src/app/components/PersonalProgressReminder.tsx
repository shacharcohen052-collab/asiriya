'use client';
import React, { useState } from 'react';
import { toast } from 'sonner';

// Backend integration point: fetch unreported past events from /api/attendance/unreported?userId=me
const UNREPORTED_EVENTS = [
  { id: 'fixed-zoom-morning', title: 'זום PT100', time: '11:45', date: '2026-09-12' },
];

export default function PersonalProgressReminder() {
  const [events, setEvents] = useState(UNREPORTED_EVENTS);
  const [reporting, setReporting] = useState<string | null>(null);

  const handleAttended = (eventId: string, title: string) => {
    // Backend integration point: POST /api/actual-attendance { eventId, status: 'attended' }
    setReporting(null);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    toast.success(`עודכן: השתתפת ב${title}`);
  };

  const handleNotAttended = (eventId: string) => {
    setReporting(null);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleDecline = (eventId: string) => {
    setReporting(null);
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  if (events.length === 0) return null;

  return (
    <div className="bg-muted/60 border border-border rounded-xl p-4 fade-in">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        בדיקת התקדמות אישית
      </h2>

      <div className="space-y-3">
        {events.map((event) => (
          <div key={`progress-${event.id}`} className="bg-card rounded-lg p-3 border border-border">
            <p className="text-sm text-foreground mb-1">
              האם השתתפת ב<span className="font-semibold">{event.title}</span>?
            </p>
            <p className="text-2xs text-muted-foreground mb-3">{event.time} · {event.date}</p>

            {reporting === event.id ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleAttended(event.id, event.title)}
                  className="btn-primary text-sm py-2"
                >
                  השתתפתי
                </button>
                <button
                  onClick={() => handleNotAttended(event.id)}
                  className="btn-secondary text-sm py-2"
                >
                  לא השתתפתי
                </button>
                <button
                  onClick={() => handleDecline(event.id)}
                  className="btn-ghost text-xs py-1.5"
                >
                  לא לדווח כרגע
                </button>
              </div>
            ) : (
              <button
                onClick={() => setReporting(event.id)}
                className="text-xs text-primary font-medium hover:underline"
              >
                עדכן השתתפות
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}