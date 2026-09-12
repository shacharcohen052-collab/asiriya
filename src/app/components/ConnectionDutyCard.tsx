'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Backend integration point: fetch today's connection duty from /api/connection-duties?date=today
const TODAY_DUTY = {
  date: '2026-09-12',
  memberOne: { id: 'user-001', name: 'שחר לוי', initials: 'ש' },
  memberTwo: { id: 'user-002', name: 'דניאל כהן', initials: 'ד' },
};

const AVATAR_COLORS = [
  'bg-primary',
  'bg-accent',
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-400',
];

export default function ConnectionDutyCard() {
  const duty = TODAY_DUTY;

  return (
    <div className="bg-card border border-border rounded-xl p-4 card-shadow fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          תורני החיבור היום
        </h2>
      </div>

      {duty ? (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS?.[0]} flex items-center justify-center text-white text-sm font-bold`}>
                {duty?.memberOne?.initials}
              </div>
              <span className="text-sm font-semibold text-foreground">{duty?.memberOne?.name}</span>
            </div>
            <span className="text-muted-foreground text-sm">+</span>
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS?.[1]} flex items-center justify-center text-white text-sm font-bold`}>
                {duty?.memberTwo?.initials}
              </div>
              <span className="text-sm font-semibold text-foreground">{duty?.memberTwo?.name}</span>
            </div>
          </div>
          <Link
            href="/connection-duties"
            className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline"
          >
            <span>לסידור המלא</span>
            <ArrowLeft size={14} />
          </Link>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">טרם נקבעו תורני חיבור.</p>
      )}
    </div>
  );
}