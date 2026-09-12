'use client';
import React, { useState } from 'react';
import { CheckCircle2, Circle, Pencil } from 'lucide-react';
import { toast } from 'sonner';

// Backend integration point: fetch daily task for today from /api/daily-tasks?date=today
const MOCK_TASK = {
  id: 'task-2026-09-12',
  text: 'שלחו לחבר מהעשירייה הודעה טובה לפני השיעור.',
  createdBy: 'דניאל',
};

export default function DailyTaskCard() {
  const [completed, setCompleted] = useState(false);
  const [task] = useState(MOCK_TASK);

  const handleComplete = () => {
    if (completed) return;
    setCompleted(true);
    toast?.success('כל הכבוד! המשימה סומנה כבוצעה.');
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 card-shadow fade-in">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          המשימה היומית
        </h2>
        <button className="btn-ghost p-1.5 rounded-lg" aria-label="ערוך משימה">
          <Pencil size={14} className="text-muted-foreground" />
        </button>
      </div>

      {task ? (
        <>
          <p className="text-foreground text-sm leading-relaxed mb-4">{task?.text}</p>
          <div className="flex items-center justify-between">
            <p className="text-2xs text-muted-foreground">נוצר על ידי {task?.createdBy}</p>
            <button
              onClick={handleComplete}
              className={`flex items-center gap-2 text-sm font-semibold transition-all duration-200 px-3 py-1.5 rounded-lg ${
                completed
                  ? 'text-positive bg-green-50 cursor-default' :'text-primary hover:bg-fixed-meeting-bg'
              }`}
              disabled={completed}
            >
              {completed ? (
                <CheckCircle2 size={16} className="text-positive" />
              ) : (
                <Circle size={16} />
              )}
              {completed ? 'בוצע!' : 'ביצעתי'}
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground mb-3">עדיין לא נקבעה משימה להיום.</p>
          <button className="btn-primary text-sm py-2 px-4">+ קבע משימה</button>
        </div>
      )}
    </div>
  );
}