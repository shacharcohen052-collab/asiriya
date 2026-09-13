import React from 'react';
import AppLayout from '@/components/AppLayout';
import HomeGreeting from './components/HomeGreeting';
import DailyTaskCard from './components/DailyTaskCard';
import ConnectionDutyCard from './components/ConnectionDutyCard';
import TodaySchedule from './components/TodaySchedule';
import MonthlyLeaderboard from './components/MonthlyLeaderboard';
import PersonalProgressReminder from './components/PersonalProgressReminder';
import MonehHaborehPromo from './components/MonehHaborehPromo';

export default function HomePage() {
  return (
    <AppLayout activeRoute="/">
      {/* Greeting */}
      <HomeGreeting />

      {/* External resource promotion */}
      <div className="mt-4">
        <MonehHaborehPromo />
      </div>

      {/* Desktop two-column layout */}
      <div className="mt-5 grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Left / main column — schedule */}
        <div className="xl:col-span-3 space-y-5">
          <TodaySchedule />
        </div>

        {/* Right column — task, duties, leaderboard, personal */}
        <div className="xl:col-span-2 space-y-5">
          <DailyTaskCard />
          <ConnectionDutyCard />
          <MonthlyLeaderboard />
          <PersonalProgressReminder />
        </div>
      </div>
    </AppLayout>
  );
}
