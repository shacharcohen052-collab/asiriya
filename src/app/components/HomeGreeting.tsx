'use client';
import React, { useState, useEffect } from 'react';

const HEBREW_DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HEBREW_MONTHS = [
  'בינואר', 'בפברואר', 'במרץ', 'באפריל', 'במאי', 'ביוני',
  'ביולי', 'באוגוסט', 'בספטמבר', 'באוקטובר', 'בנובמבר', 'בדצמבר',
];

export default function HomeGreeting() {
  const [dateStr, setDateStr] = useState('');
  const [dayStr, setDayStr] = useState('');

  useEffect(() => {
    const now = new Date('2026-09-12T18:07:28');
    const day = HEBREW_DAYS?.[now?.getDay()];
    const date = now?.getDate();
    const month = HEBREW_MONTHS?.[now?.getMonth()];
    setDayStr(`יום ${day}`);
    setDateStr(`${date} ${month}`);
  }, []);

  return (
    <div className="fade-in">
      <h1 className="text-2xl font-bold text-foreground">שלום, שחר</h1>
      <p className="text-muted-foreground text-sm mt-0.5">
        {dayStr}{dateStr ? `, ${dateStr}` : ''}
      </p>
    </div>
  );
}