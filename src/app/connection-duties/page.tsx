'use client';
import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor } from '@/data/members';
import { RotateCcw, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

interface DutyPair {
  day: number;
  date: string;
  weekday: string;
  memberA: typeof MEMBERS[0];
  memberB: typeof MEMBERS[0];
  indexA: number;
  indexB: number;
}

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function generateMonthlyRoster(year: number, month: number): DutyPair[] {
  const days = getDaysInMonth(year, month);
  const members = [...MEMBERS];
  const pairs: DutyPair[] = [];

  // Generate all unique pairs in a round-robin fashion
  const allPairs: [number, number][] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      allPairs.push([i, j]);
    }
  }

  // Shuffle pairs deterministically based on year+month seed
  const seed = year * 100 + month;
  const shuffled = [...allPairs].sort((a, b) => {
    const ha = ((a[0] * 31 + a[1]) * seed) % 997;
    const hb = ((b[0] * 31 + b[1]) * seed) % 997;
    return ha - hb;
  });

  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d);
    const weekday = WEEKDAYS_HE[date.getDay()];
    const pairIndex = (d - 1) % shuffled.length;
    const [iA, iB] = shuffled[pairIndex];
    pairs.push({
      day: d,
      date: `${d}/${month + 1}/${year}`,
      weekday,
      memberA: members[iA],
      memberB: members[iB],
      indexA: iA,
      indexB: iB,
    });
  }

  return pairs;
}

function AvatarBadge({ name, index }: { name: string; index: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
        {getInitials(name)}
      </div>
      <span className="text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}

export default function ConnectionDutiesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const roster = useMemo(() => generateMonthlyRoster(year, month), [year, month]);

  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  const MONTH_NAMES_HE = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  return (
    <AppLayout activeRoute="/connection-duties">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <RotateCcw size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">סידור תורני חיבור</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-12">כל יום שני חברים מתחברים ומחזקים אחד את השני</p>
      </div>

      {/* Month navigator */}
      <div className="bg-card border border-border rounded-xl p-4 card-shadow mb-5 flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight size={20} className="text-muted-foreground" />
        </button>
        <div className="text-center">
          <p className="font-bold text-foreground text-lg">{MONTH_NAMES_HE[month]} {year}</p>
          <p className="text-xs text-muted-foreground">{roster.length} ימים</p>
        </div>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft size={20} className="text-muted-foreground" />
        </button>
      </div>

      {/* Today shortcut */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goToday} className="btn-secondary text-sm flex items-center gap-2 py-2 px-4">
          <Calendar size={15} />
          <span>היום</span>
        </button>
        <p className="text-xs text-muted-foreground">
          {todayDay > 0 ? (
            <>תורני היום: <span className="font-semibold text-foreground">{roster[todayDay - 1]?.memberA?.displayName}</span> + <span className="font-semibold text-foreground">{roster[todayDay - 1]?.memberB?.displayName}</span></>
          ) : 'בחר חודש נוכחי לראות תורני היום'}
        </p>
      </div>

      {/* Roster table */}
      <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr] text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 px-4 py-3 border-b border-border">
          <div className="w-20">תאריך</div>
          <div className="px-4">חבר א׳</div>
          <div className="px-4">חבר ב׳</div>
        </div>
        <div className="divide-y divide-border">
          {roster.map((row) => {
            const isToday = row.day === todayDay;
            return (
              <div
                key={row.day}
                className={`grid grid-cols-[auto_1fr_1fr] items-center px-4 py-3 transition-colors ${
                  isToday ? 'bg-primary/5 border-r-2 border-primary' : 'hover:bg-muted/30'
                }`}
              >
                <div className="w-20">
                  <p className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                    {row.day}/{month + 1}
                  </p>
                  <p className="text-2xs text-muted-foreground">{row.weekday}</p>
                </div>
                <div className="px-4">
                  <AvatarBadge name={row.memberA.displayName} index={row.indexA} />
                </div>
                <div className="px-4">
                  <AvatarBadge name={row.memberB.displayName} index={row.indexB} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-3 h-3 rounded bg-primary/20 border-r-2 border-primary" />
        <span>היום</span>
      </div>
    </AppLayout>
  );
}
