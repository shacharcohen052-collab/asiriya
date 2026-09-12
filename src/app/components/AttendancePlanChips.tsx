'use client';
import React from 'react';

const PLAN_OPTIONS = [
  { key: 'routing', label: 'מנתב' },
  { key: 'physical', label: 'פיזית' },
  { key: 'virtual', label: 'וירטואלית' },
  { key: 'with_help', label: "בעזרת ה'" },
  { key: 'not_coming', label: 'לא מגיע' },
];

interface AttendancePlanChipsProps {
  eventId: string;
  currentPlan: string | null;
  onChange: (eventId: string, plan: string | null) => void;
}

export default function AttendancePlanChips({
  eventId,
  currentPlan,
  onChange,
}: AttendancePlanChipsProps) {
  const handleClick = (key: string) => {
    // Backend integration point: POST /api/attendance-plans { eventId, status: key }
    if (currentPlan === key) {
      onChange(eventId, null);
    } else {
      onChange(eventId, key);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {PLAN_OPTIONS.map((option) => (
        <button
          key={`chip-${eventId}-${option.key}`}
          onClick={() => handleClick(option.key)}
          className={`attendance-chip ${currentPlan === option.key ? 'selected' : ''}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}