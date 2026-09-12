import React from 'react';
import AppLayout from '@/components/AppLayout';
import ScheduleHeader from './components/ScheduleHeader';
import WeekScheduleView from './components/WeekScheduleView';
import CalendarSyncSection from './components/CalendarSyncSection';

export default function ClassScheduleAttendancePage() {
  return (
    <AppLayout activeRoute="/class-schedule-attendance">
      <div className="space-y-6">
        <ScheduleHeader />
        <WeekScheduleView />
        <CalendarSyncSection />
      </div>
    </AppLayout>
  );
}