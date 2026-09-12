'use client';
import React from 'react';

// Backend integration point: fetch monthly scores from /api/monthly-scores?month=2026-09
const MOCK_LEADERBOARD = [
  { rank: 1, id: 'user-002', name: 'דניאל כהן', score: 18, initials: 'ד' },
  { rank: 2, id: 'user-004', name: 'רועי אדרי', score: 17, initials: 'ר' },
  { rank: 3, id: 'user-003', name: 'נועה ברק', score: 16, initials: 'נ' },
];

const MY_SCORE = { id: 'user-001', name: 'שחר לוי', score: 12, initials: 'ש' };

const RANK_COLORS = ['text-amber-500', 'text-slate-400', 'text-amber-700'];
const AVATAR_COLORS = ['bg-accent', 'bg-teal-500', 'bg-rose-400'];

export default function MonthlyLeaderboard() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 card-shadow fade-in">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        מובילי החודש
      </h2>

      <div className="space-y-2">
        {MOCK_LEADERBOARD?.map((member, idx) => (
          <div
            key={`leader-${member?.id}`}
            className="flex items-center gap-3"
          >
            <span className={`text-sm font-bold w-4 text-center font-tabular ${RANK_COLORS?.[idx]}`}>
              {member?.rank}
            </span>
            <div className={`w-7 h-7 rounded-full ${AVATAR_COLORS?.[idx]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {member?.initials}
            </div>
            <span className="text-sm text-foreground flex-1">{member?.name}</span>
            <span className="text-sm font-bold text-foreground font-tabular">{member?.score}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-4 text-center">—</span>
        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {MY_SCORE?.initials}
        </div>
        <span className="text-sm text-foreground flex-1">הניקוד שלי</span>
        <span className="text-sm font-bold text-primary font-tabular">{MY_SCORE?.score}</span>
      </div>

      <p className="text-2xs text-muted-foreground mt-2">
        מבוסס על דיווחים אישיים בלבד · ספטמבר 2026
      </p>
    </div>
  );
}