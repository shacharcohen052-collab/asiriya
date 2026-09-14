'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ScheduleHeader from './components/ScheduleHeader';
import WeekScheduleView from './components/WeekScheduleView';
import CalendarSyncSection from './components/CalendarSyncSection';
import type { ScheduleEvent } from './components/AddScheduleModal';

export default function ClassScheduleAttendancePage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [addedEvents, setAddedEvents] = useState<ScheduleEvent[]>([]);
  const [showDemoEvents, setShowDemoEvents] = useState(true);

  const addEventsWithoutDuplicates = (newEvents: ScheduleEvent[]) => {
    setShowDemoEvents(false);
    setAddedEvents((prev) => {
      const seen = new Set(prev.map((event) => `${event.title}|${event.date}|${event.startTime}|${event.endTime}`));
      return [...prev, ...newEvents.filter((event) => {
        const key = `${event.title}|${event.date}|${event.startTime}|${event.endTime}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })];
    });
  };

  return (
    <AppLayout activeRoute="/class-schedule-attendance">
      <div className="space-y-6">
        <ScheduleHeader weekOffset={weekOffset} onWeekOffsetChange={setWeekOffset} onAddEvents={addEventsWithoutDuplicates} onClearSchedule={() => { setAddedEvents([]); setShowDemoEvents(false); }} />
        <WeekScheduleView weekOffset={weekOffset} addedEvents={addedEvents} showDemoEvents={showDemoEvents} />
        <CalendarSyncSection />
      </div>
    </AppLayout>
  );
}
