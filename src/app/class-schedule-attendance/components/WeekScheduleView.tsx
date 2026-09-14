'use client';
import React, { useEffect, useState } from 'react';
import { Star, Clock, Users, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ScheduleEvent } from './AddScheduleModal';

// Backend integration point: fetch week events from /api/events?weekOffset=0
const WEEK_EVENTS = [
  // Sunday 13/09
  {
    id: 'event-sun-zoom-1',
    date: '2026-09-13',
    dayLabel: 'ראשון',
    dateLabel: '13/09',
    title: 'זום PT100',
    startTime: '11:45',
    endTime: '12:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    planningCount: 6,
    myPlan: null as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
    isSynced: false,
  },
  {
    id: 'event-sun-zoom-2',
    date: '2026-09-13',
    dayLabel: 'ראשון',
    dateLabel: '13/09',
    title: 'זום PT100',
    startTime: '18:00',
    endTime: '18:30',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    planningCount: 8,
    myPlan: 'physical' as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
    isSynced: true,
  },
  // Monday 14/09
  {
    id: 'event-mon-zoom-1',
    date: '2026-09-14',
    dayLabel: 'שני',
    dateLabel: '14/09',
    title: 'זום PT100',
    startTime: '11:45',
    endTime: '12:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    planningCount: 5,
    myPlan: null as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
    isSynced: false,
  },
  {
    id: 'event-mon-community',
    date: '2026-09-14',
    dayLabel: 'שני',
    dateLabel: '14/09',
    title: 'לימוד בקהילת הצעירים',
    startTime: '18:30',
    endTime: '21:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: true,
    planningCount: 9,
    myPlan: 'virtual' as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
    isSynced: true,
  },
  // Tuesday 15/09
  {
    id: 'event-tue-zoom-1',
    date: '2026-09-15',
    dayLabel: 'שלישי',
    dateLabel: '15/09',
    title: 'זום PT100',
    startTime: '11:45',
    endTime: '12:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    planningCount: 7,
    myPlan: null as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
    isSynced: false,
  },
  {
    id: 'event-tue-class',
    date: '2026-09-15',
    dayLabel: 'שלישי',
    dateLabel: '15/09',
    title: 'שיעור בוקר',
    startTime: '06:00',
    endTime: '07:00',
    isFixed: false,
    source: 'weekly_paste',
    allowsAttendancePlan: true,
    countsForScore: true,
    planningCount: 4,
    myPlan: 'routing' as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
    isSynced: false,
  },
  // Today Saturday 12/09 — past events
  {
    id: 'event-sat-zoom-past',
    date: '2026-09-12',
    dayLabel: 'שבת',
    dateLabel: '12/09',
    title: 'זום PT100',
    startTime: '11:45',
    endTime: '12:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    planningCount: 7,
    myPlan: 'physical' as string | null,
    isPast: true,
    myActualAttendance: 'attended' as string | null,
    isSynced: false,
  },
  {
    id: 'event-thu-gathering',
    date: '2026-09-17',
    dayLabel: 'חמישי',
    dateLabel: '17/09',
    title: 'ערב גיבוש לקהילת הצעירים',
    startTime: '18:30',
    endTime: '21:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: true,
    planningCount: 10,
    myPlan: null as string | null,
    isPast: false,
    myActualAttendance: null as string | null,
    isSynced: false,
  },
];

const PLAN_OPTIONS = [
  { key: 'routing', label: 'מנתב' },
  { key: 'physical', label: 'פיזית' },
  { key: 'virtual', label: 'וירטואלית' },
  { key: 'with_help', label: "בעזרת ה'" },
  { key: 'not_coming', label: 'לא מגיע' },
];

const PLAN_LABELS: Record<string, string> = {
  routing: 'מנתב',
  physical: 'פיזית',
  virtual: 'וירטואלית',
  with_help: "בעזרת ה'",
  not_coming: 'לא מגיע',
};

const PLANNERS_MOCK = [
  { id: 'user-002', name: 'דניאל כהן', plan: 'physical' },
  { id: 'user-003', name: 'נועה ברק', plan: 'virtual' },
  { id: 'user-004', name: 'רועי אדרי', plan: 'routing' },
  { id: 'user-005', name: 'יוסי מזרחי', plan: 'physical' },
  { id: 'user-006', name: 'איתי שפירא', plan: 'with_help' },
];

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekStart(offset: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() - today.getDay() + offset * 7);
  return today;
}

function getRelativeWeekEvents(offset: number) {
  const baseSunday = new Date(2026, 8, 13);
  const targetSunday = getCurrentWeekStart(offset);
  const today = new Date();
  const todayKey = dateKey(today);

  return WEEK_EVENTS.map((event) => {
    const baseDate = new Date(`${event.date}T12:00:00`);
    const dayOffset = Math.round((baseDate.getTime() - baseSunday.getTime()) / 86400000);
    const nextDate = new Date(targetSunday);
    nextDate.setDate(targetSunday.getDate() + dayOffset);
    const key = dateKey(nextDate);
    const endMinutes = Number(event.endTime.split(':')[0]) * 60 + Number(event.endTime.split(':')[1]);
    const nowMinutes = today.getHours() * 60 + today.getMinutes();
    const isPast = key < todayKey || (key === todayKey && endMinutes <= nowMinutes);

    return {
      ...event,
      date: key,
      dayLabel: HEBREW_DAYS[nextDate.getDay()],
      dateLabel: `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}`,
      isPast,
    };
  });
}

interface EventCardProps {
  event: (typeof WEEK_EVENTS)[0];
  onPlanChange: (id: string, plan: string | null) => void;
  onAttendanceReport: (id: string, status: string) => void;
}

function EventCard({ event, onPlanChange, onAttendanceReport }: EventCardProps) {
  const [showPlanners, setShowPlanners] = useState(false);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);

  const handlePlanClick = (key: string) => {
    // Backend integration point: POST /api/attendance-plans { eventId, status }
    if (event.myPlan === key) {
      onPlanChange(event.id, null);
    } else {
      onPlanChange(event.id, key);
      if (key !== 'not_coming') {
        toast.success(`תכנון עודכן: ${PLAN_LABELS[key]}`);
      }
    }
  };

  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-200 ${
        event.isPast
          ? 'border-border bg-muted/30 opacity-75'
          : event.isFixed
          ? 'border-primary/25 bg-fixed-meeting-bg/50' :'border-border bg-card'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold text-foreground">{event.title}</span>
            {event.isFixed && (
              <span className="fixed-meeting-badge text-2xs font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Star size={9} />
                קבוע
              </span>
            )}
            {!event.isFixed && (
              <span className="imported-badge text-2xs font-semibold px-1.5 py-0.5 rounded-full">
                מיובא
              </span>
            )}
            {event.countsForScore && (
              <span className="text-2xs bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                ניקוד
              </span>
            )}
            {event.isSynced && (
              <span className="text-2xs bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">
                ✓ מסונכרן
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock size={11} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-tabular">
              {event.startTime}–{event.endTime}
            </span>
          </div>
        </div>

        {/* Actual attendance badge for past events */}
        {event.isPast && event.myActualAttendance && (
          <span
            className={`text-2xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${
              event.myActualAttendance === 'attended' ?'bg-green-50 text-green-700' :'bg-muted text-muted-foreground'
            }`}
          >
            {event.myActualAttendance === 'attended' ? '✓ השתתפתי' : 'לא דיווחתי'}
          </span>
        )}
      </div>

      {/* Attendance plan chips — only for future events */}
      {event.allowsAttendancePlan && !event.isPast && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PLAN_OPTIONS.map((option) => (
            <button
              key={`chip-${event.id}-${option.key}`}
              onClick={() => handlePlanClick(option.key)}
              className={`attendance-chip text-xs ${event.myPlan === option.key ? 'selected' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Currently planned */}
      {event.myPlan && !event.isPast && event.myPlan !== 'not_coming' && (
        <p className="text-xs text-primary font-medium mb-2">
          התכנון שלי: {PLAN_LABELS[event.myPlan]}
        </p>
      )}

      {/* Who's planning popover */}
      {event.allowsAttendancePlan && event.planningCount > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowPlanners(!showPlanners)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Users size={12} />
            <span>מי מתכנן להגיע? {event.planningCount}</span>
            {showPlanners ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {showPlanners && (
            <div className="absolute top-full mt-1.5 right-0 bg-card border border-border rounded-xl card-shadow-md z-20 w-56 p-3 slide-up">
              <p className="text-xs font-semibold text-muted-foreground mb-2">מי מתכנן להגיע</p>
              <div className="space-y-1.5">
                {PLANNERS_MOCK.slice(0, event.planningCount).map((p) => (
                  <div key={`pop-planner-${event.id}-${p.id}`} className="flex items-center justify-between">
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
      )}

      {/* Personal progress for past events */}
      {event.isPast && event.myActualAttendance === null && (
        <div className="mt-2 pt-2 border-t border-border">
          {!showAttendanceForm ? (
            <button
              onClick={() => setShowAttendanceForm(true)}
              className="text-xs text-primary font-medium hover:underline"
            >
              בדיקת התקדמות אישית: עדכן השתתפות
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-semibold">האם השתתפת?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    onAttendanceReport(event.id, 'attended');
                    setShowAttendanceForm(false);
                    toast.success('עודכן: השתתפת!');
                  }}
                  className="flex items-center gap-1 text-xs bg-green-50 text-green-700 font-semibold px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Check size={12} />
                  השתתפתי
                </button>
                <button
                  onClick={() => {
                    onAttendanceReport(event.id, 'not_attended');
                    setShowAttendanceForm(false);
                  }}
                  className="flex items-center gap-1 text-xs bg-muted text-muted-foreground font-semibold px-3 py-1.5 rounded-lg hover:bg-border transition-colors"
                >
                  <X size={12} />
                  לא השתתפתי
                </button>
                <button
                  onClick={() => setShowAttendanceForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
                >
                  אחר כך
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Group events by day
function groupByDay(events: typeof WEEK_EVENTS) {
  const groups: Record<string, typeof WEEK_EVENTS> = {};
  events.forEach((e) => {
    const key = e.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
}

export default function WeekScheduleView({ weekOffset = 0, addedEvents = [], showDemoEvents = true }: { weekOffset?: number; addedEvents?: ScheduleEvent[]; showDemoEvents?: boolean }) {
  const [events, setEvents] = useState(() => [...(showDemoEvents ? getRelativeWeekEvents(weekOffset) : []), ...addedEvents]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'fixed' | 'imported' | 'score'>('all');

  useEffect(() => {
    setEvents([...(showDemoEvents ? getRelativeWeekEvents(weekOffset) : []), ...addedEvents]);
  }, [weekOffset, addedEvents, showDemoEvents]);

  const filtered = events.filter((e) => {
    if (activeFilter === 'fixed') return e.isFixed;
    if (activeFilter === 'imported') return !e.isFixed;
    if (activeFilter === 'score') return e.countsForScore;
    return true;
  });

  const grouped = groupByDay(filtered);

  const handlePlanChange = (id: string, plan: string | null) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, myPlan: plan } : e)));
  };

  const handleAttendanceReport = (id: string, status: string) => {
    // Backend integration point: POST /api/actual-attendance { eventId, status }
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, myActualAttendance: status } : e)));
  };

  const FILTERS = [
    { key: 'all', label: 'הכל' },
    { key: 'fixed', label: 'קבועים' },
    { key: 'imported', label: 'מיובאים' },
    { key: 'score', label: 'מזכים בניקוד' },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={`filter-${f.key}`}
            onClick={() => setActiveFilter(f.key)}
            className={`text-sm px-4 py-1.5 rounded-full font-semibold transition-all duration-150 border ${
              activeFilter === f.key
                ? 'bg-primary text-white border-primary' :'bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Day groups */}
      {Object.keys(grouped).length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground text-sm">לא נמצאו אירועים עם הסינון הנוכחי.</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, dayEvents]) => {
            const first = dayEvents[0];
            const isToday = date === dateKey(new Date());
            return (
              <div key={`day-group-${date}`}>
                <div className={`flex items-center gap-3 mb-2 ${isToday ? '' : ''}`}>
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      isToday
                        ? 'bg-primary text-white' :'bg-muted text-muted-foreground'
                    }`}
                  >
                    <span>יום {first.dayLabel}</span>
                    <span className="font-tabular">{first.dateLabel}</span>
                    {isToday && <span className="text-xs opacity-80">היום</span>}
                  </div>
                </div>

                <div className="space-y-2 mr-2 border-r-2 border-border pr-4">
                  {dayEvents
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .map((event) => (
                      <EventCard
                        key={`week-event-${event.id}`}
                        event={event}
                        onPlanChange={handlePlanChange}
                        onAttendanceReport={handleAttendanceReport}
                      />
                    ))}
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}
