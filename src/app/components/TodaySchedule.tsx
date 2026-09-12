'use client';
import React, { useState } from 'react';
import { Clock, Users, ChevronDown, ChevronUp, Star } from 'lucide-react';
import AttendancePlanChips from './AttendancePlanChips';

// Backend integration point: fetch today's events from /api/events?date=2026-09-12
const TODAY_EVENTS = [
  {
    id: 'fixed-zoom-morning',
    title: 'זום עשירייה',
    startTime: '11:45',
    endTime: '12:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    planningCount: 7,
    myPlan: null as string | null,
    isPast: true,
    myActualAttendance: null as string | null,
  },
  {
    id: 'imported-class-eve',
    title: 'שיעור ערב',
    startTime: '18:00',
    endTime: '18:30',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    planningCount: 5,
    myPlan: 'physical' as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
  },
  {
    id: 'fixed-community-sheni',
    title: 'לימוד בקהילת הצעירים',
    startTime: '18:30',
    endTime: '21:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: true,
    planningCount: 8,
    myPlan: 'virtual' as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
  },
];

const PLAN_LABELS: Record<string, string> = {
  routing: 'מנתב',
  physical: 'פיזית',
  virtual: 'וירטואלית',
  with_help: "בעזרת ה'",
  not_coming: 'לא מגיע',
};

interface PlanningPopoverProps {
  eventId: string;
  count: number;
}

function PlanningPopover({ count }: PlanningPopoverProps) {
  const [open, setOpen] = useState(false);

  // Backend integration point: fetch planning list from /api/attendance-plans?eventId=
  const planners = [
    { id: 'user-001', name: 'שחר לוי', plan: 'physical' },
    { id: 'user-002', name: 'דניאל כהן', plan: 'virtual' },
    { id: 'user-003', name: 'נועה ברק', plan: 'routing' },
    { id: 'user-004', name: 'רועי אדרי', plan: 'with_help' },
    { id: 'user-005', name: 'יוסי מזרחי', plan: 'physical' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <Users size={13} />
        <span>מי מתכנן להגיע? {count}</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="absolute top-full mt-1.5 right-0 bg-card border border-border rounded-xl card-shadow-md z-10 w-52 p-3 slide-up">
          <p className="text-xs font-semibold text-muted-foreground mb-2">מי מתכנן להגיע</p>
          <div className="space-y-1.5">
            {planners.map((p) => (
              <div key={`planner-${p.id}`} className="flex items-center justify-between">
                <span className="text-xs text-foreground">{p.name}</span>
                <span className="text-2xs text-muted-foreground">{PLAN_LABELS[p.plan]}</span>
              </div>
            ))}
          </div>
          <p className="text-2xs text-muted-foreground mt-2 pt-2 border-t border-border">
            תכנון בלבד, לא התחייבות
          </p>
        </div>
      )}
    </div>
  );
}

export default function TodaySchedule() {
  const [events, setEvents] = useState(TODAY_EVENTS);

  const handlePlanChange = (eventId: string, plan: string | null) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, myPlan: plan } : e))
    );
  };

  const now = new Date('2026-09-12T18:07:28');
  const currentHour = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="bg-card border border-border rounded-xl p-5 card-shadow fade-in">
      <h2 className="text-base font-bold text-foreground mb-4">לו&quot;ז היום</h2>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">לא מתוכננים שיעורים היום.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const [sh, sm] = event.startTime.split(':').map(Number);
            const startMins = sh * 60 + sm;
            const isNow = currentHour >= startMins && currentHour < startMins + 60;
            const isPast = event.isPast || currentHour > startMins + 60;

            return (
              <div
                key={`today-event-${event.id}`}
                className={`rounded-xl border p-3 transition-all ${
                  isNow
                    ? 'border-primary bg-fixed-meeting-bg'
                    : isPast
                    ? 'border-border bg-muted/40 opacity-70' :'border-border bg-background'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{event.title}</span>
                      {event.isFixed && (
                        <span className="fixed-meeting-badge text-2xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star size={10} />
                          קבוע
                        </span>
                      )}
                      {event.countsForScore && (
                        <span className="text-2xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                          מזכה בניקוד
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={12} className="text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-tabular">
                        {event.startTime}–{event.endTime}
                      </span>
                    </div>
                  </div>
                </div>

                {event.allowsAttendancePlan && !isPast && (
                  <div className="mt-3">
                    <AttendancePlanChips
                      eventId={event.id}
                      currentPlan={event.myPlan}
                      onChange={handlePlanChange}
                    />
                  </div>
                )}

                {event.allowsAttendancePlan && (
                  <div className="mt-2">
                    <PlanningPopover eventId={event.id} count={event.planningCount} />
                  </div>
                )}

                {isPast && event.myActualAttendance === null && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      בדיקת התקדמות אישית:{' '}
                      <a href="#progress" className="text-primary hover:underline font-medium">
                        עדכן השתתפות
                      </a>
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Next upcoming */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">בעוד 23 דקות</span> — זום עשירייה (18:30)
        </p>
      </div>
    </div>
  );
}