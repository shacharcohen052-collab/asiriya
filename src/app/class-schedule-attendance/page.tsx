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

  return (
    <AppLayout activeRoute="/class-schedule-attendance">
      <div className="space-y-6">
        <ScheduleHeader weekOffset={weekOffset} onWeekOffsetChange={setWeekOffset} onAddEvents={(newEvents) => setAddedEvents((prev) => [...prev, ...newEvents])} />
        <WeekScheduleView weekOffset={weekOffset} addedEvents={addedEvents} />
        <CalendarSyncSection />
      </div>
    </AppLayout>
  );
}
