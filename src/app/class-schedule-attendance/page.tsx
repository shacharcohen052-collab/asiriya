'use client';

import React, { useCallback, useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ScheduleHeader from './components/ScheduleHeader';
import WeekScheduleView from './components/WeekScheduleView';
import CalendarScheduleView from './components/CalendarScheduleView';
import CalendarSyncSection from './components/CalendarSyncSection';
import type { ScheduleEvent } from './components/AddScheduleModal';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const supabase = createClient();

function formatDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getWeekRange(offset: number) {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay() + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: formatDate(start), end: formatDate(end) };
}

function mapRow(row: any): ScheduleEvent {
  const date = row.event_date as string;
  const dateObject = new Date(`${date}T12:00:00`);
  const endTime = String(row.end_time).slice(0, 5);
  return {
    id: row.id,
    title: row.title,
    date,
    dayLabel: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][dateObject.getDay()],
    dateLabel: `${date.slice(8, 10)}/${date.slice(5, 7)}`,
    startTime: String(row.start_time).slice(0, 5),
    endTime,
    isFixed: Boolean(row.is_fixed),
    source: row.source,
    allowsAttendancePlan: row.allows_attendance_plan !== false,
    countsForScore: true,
    scoreValue: 1,
    planningCount: 0,
    myPlan: null,
    isPast: new Date(`${date}T${endTime}`) <= new Date(),
    myActualAttendance: null,
    isSynced: false,
  };
}

export default function ClassScheduleAttendancePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>(() => {
    if (typeof window === 'undefined') return 'list';
    const saved = window.localStorage.getItem('asiriya.schedule.viewMode.v3');
    return saved === 'calendar' || saved === 'list' ? saved : 'list';
  });
  const { isAdmin, isApproved, profile } = useAuth();

  const loadSchedule = useCallback(async () => {
    if (!isApproved) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const range = getWeekRange(weekOffset);
    const { error: fixedError } = await supabase.rpc('ensure_pt100_fixed_schedule', {
      p_start_date: range.start,
      p_end_date: range.end,
    });
    if (fixedError) console.warn('Could not ensure recurring schedule', fixedError.message);

    const { data, error } = await supabase
      .from('schedule_events')
      .select('id,title,event_date,start_time,end_time,is_fixed,source,allows_attendance_plan')
      .eq('is_active', true)
      .gte('event_date', range.start)
      .lte('event_date', range.end)
      .order('event_date')
      .order('start_time');

    if (error) toast.error('לא ניתן לטעון את הלו״ז כרגע');
    else setEvents((data ?? []).map(mapRow));
    setLoading(false);
  }, [isApproved, weekOffset]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    window.localStorage.setItem('asiriya.schedule.viewMode.v3', viewMode);
  }, [viewMode]);

  const addEvents = async (newEvents: ScheduleEvent[]) => {
    if (!newEvents.length) return;
    if (!profile?.id) {
      const error = new Error('פרופיל המשתמש לא נטען. יש לרענן את הדף ולהתחבר מחדש.');
      toast.error(error.message);
      throw error;
    }
    const rows = newEvents
      .filter((event) => event.date && !event.isFixed)
      .map((event) => ({
        title: event.title.trim(),
        event_date: event.date,
        start_time: event.startTime,
        end_time: event.endTime,
        is_fixed: false,
        source: 'weekly_paste',
        allows_attendance_plan: true,
        counts_for_score: true,
        score_value: 1,
        created_by: profile.id,
        is_active: true,
        dedupe_key: `${event.title.trim().toLocaleLowerCase()}|${event.date}|${event.startTime}:00|${event.endTime}:00`,
      }));
    if (!rows.length) return;
    const { error } = await supabase.from('schedule_events').upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true });
    if (error) {
      const message = `${error.message}${error.details ? ` — ${error.details}` : ''}`;
      toast.error(`שמירת הלו״ז נכשלה: ${message}`);
      throw error;
    }
    toast.success('הלו״ז נשמר ב־Supabase');
    await loadSchedule();
  };

  const clearSchedule = async () => {
    const { error } = await supabase.rpc('clear_pt100_schedule');
    if (error) toast.error('מחיקת הלו״ז נכשלה');
    else {
      toast.success('הלו״ז הוסר');
      setEvents([]);
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.rpc('delete_schedule_event', { p_event_id: id });
    if (error) {
      toast.error(`מחיקת האירוע נכשלה: ${error.message}`);
      await loadSchedule();
      return;
    }
    toast.success('האירוע הוסר מהלו״ז');
    await loadSchedule();
  };

  const updatePlan = (id: string, plan: string | null) => {
    setEvents((previous) => previous.map((event) => (event.id === id ? { ...event, myPlan: plan } : event)));
    toast.success(plan ? 'תכנון ההגעה עודכן' : 'תכנון ההגעה בוטל');
  };

  const updateAttendance = (id: string, status: string) => {
    setEvents((previous) => previous.map((event) => (event.id === id ? { ...event, myActualAttendance: status } : event)));
    toast.success(status === 'attended' ? 'עודכן: הגעת' : 'עודכן: לא הגעת');
  };

  return (
    <AppLayout activeRoute="/class-schedule-attendance">
      <div className="stagger-children space-y-6">
        <ScheduleHeader
          weekOffset={weekOffset}
          onWeekOffsetChange={setWeekOffset}
          onAddEvents={addEvents}
          isAdmin={isAdmin}
          onClearSchedule={clearSchedule}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {loading ? (
          <div className="card-shadow flex min-h-32 items-center justify-center rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground" aria-busy="true">טוען את הלו״ז…</div>
        ) : viewMode === 'calendar' ? (
            <CalendarScheduleView
              weekOffset={weekOffset}
              events={events}
              onDeleteEvent={deleteEvent}
              onPlanChange={updatePlan}
              onAttendanceReport={updateAttendance}
            />
          ) : (
            <WeekScheduleView weekOffset={weekOffset} addedEvents={events} showDemoEvents={false} onDeleteEvent={deleteEvent} />
          )}
        <CalendarSyncSection events={events} weekOffset={weekOffset} />
      </div>
    </AppLayout>
  );
}
