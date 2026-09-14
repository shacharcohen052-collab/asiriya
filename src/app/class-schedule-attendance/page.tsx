'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ScheduleHeader from './components/ScheduleHeader';
import WeekScheduleView from './components/WeekScheduleView';
import CalendarSyncSection from './components/CalendarSyncSection';
import type { ScheduleEvent } from './components/AddScheduleModal';
import { useAuth } from '@/contexts/AuthContext';

export default function ClassScheduleAttendancePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [addedEvents, setAddedEvents] = useState<ScheduleEvent[]>([]);
  const [showDemoEvents, setShowDemoEvents] = useState(true);
  const [storageLoaded, setStorageLoaded] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('pt100-schedule-v2');
      if (saved) {
        const data = JSON.parse(saved) as { events?: ScheduleEvent[]; showDemoEvents?: boolean };
        setAddedEvents(Array.isArray(data.events) ? data.events : []);
        setShowDemoEvents(data.showDemoEvents !== false);
      }
    } catch {
      // Ignore malformed local data and start with a clean schedule.
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!storageLoaded) return;
    window.localStorage.setItem('pt100-schedule-v2', JSON.stringify({ events: addedEvents, showDemoEvents }));
  }, [addedEvents, showDemoEvents, storageLoaded]);

  const addEventsWithoutDuplicates = (newEvents: ScheduleEvent[]) => {
    setShowDemoEvents(false);
    setAddedEvents((prev) => {
      const seen = new Set(prev.map((event) => `${event.title}|${event.date}|${event.startTime}|${event.endTime}`));
      const combined = [...prev, ...newEvents.filter((event) => {
        const key = `${event.title}|${event.date}|${event.startTime}|${event.endTime}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })];
      const fixed = combined.filter((event) => event.isFixed);
      return combined.filter((event) => {
        if (event.isFixed || !event.date) return true;
        const start = event.startTime.split(':').map(Number);
        const end = event.endTime.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        return !fixed.some((other) => {
          if (other.date !== event.date) return false;
          const otherStart = other.startTime.split(':').map(Number);
          const otherEnd = other.endTime.split(':').map(Number);
          return startMinutes < otherEnd[0] * 60 + otherEnd[1] && endMinutes > otherStart[0] * 60 + otherStart[1];
        });
      });
    });
  };

  return (
    <AppLayout activeRoute="/class-schedule-attendance">
      <div className="space-y-6">
        <ScheduleHeader weekOffset={weekOffset} onWeekOffsetChange={setWeekOffset} onAddEvents={addEventsWithoutDuplicates} isAdmin={isAdmin} onClearSchedule={() => { if (!isAdmin) return; setAddedEvents([]); setShowDemoEvents(false); }} />
        <WeekScheduleView weekOffset={weekOffset} addedEvents={addedEvents} showDemoEvents={showDemoEvents} />
        <CalendarSyncSection />
      </div>
    </AppLayout>
  );
}
