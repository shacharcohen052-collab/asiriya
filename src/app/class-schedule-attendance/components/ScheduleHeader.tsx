'use client';
import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import AddScheduleModal from './AddScheduleModal';
import type { ScheduleEvent } from './AddScheduleModal';

interface ScheduleHeaderProps {
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onAddEvents: (events: ScheduleEvent[]) => void;
  onClearSchedule: () => void;
  isAdmin: boolean;
}

export default function ScheduleHeader({ weekOffset, onWeekOffsetChange, onAddEvents, onClearSchedule, isAdmin }: ScheduleHeaderProps) {
  const [showModal, setShowModal] = useState(false);

  const getWeekLabel = (offset: number) => {
    if (offset === 0) return 'השבוע הנוכחי';
    if (offset === 1) return 'השבוע הבא';
    if (offset === -1) return 'השבוע שעבר';
    return offset > 0 ? `בעוד ${offset} שבועות` : `לפני ${Math.abs(offset)} שבועות`;
  };

  const handleClear = () => {
    if (window.confirm('למחוק את כל השיעורים והאירועים מהלו״ז?')) onClearSchedule();
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">לו&quot;ז שיעורים ונוכחות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            שיעורים, פגישות קבועות ותכנון הגעה אישי
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Week navigation */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            <button
              onClick={() => onWeekOffsetChange(weekOffset - 1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="שבוע קודם"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground px-2 min-w-[120px] text-center">
              {getWeekLabel(weekOffset)}
            </span>
            <button
              onClick={() => onWeekOffsetChange(weekOffset + 1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="שבוע הבא"
            >
              <ChevronLeft size={16} className="text-muted-foreground" />
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-sm py-2 px-4"
          >
            <Plus size={16} />
            הוסף לו&quot;ז שבועי
          </button>
          {isAdmin && (
            <button
              onClick={handleClear}
              className="btn-secondary text-sm py-2 px-3 text-destructive hover:bg-destructive/10"
              title="מחק את כל הלו״ז"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">מחק הכול</span>
            </button>
          )}
        </div>
      </div>

      {showModal && <AddScheduleModal onClose={() => setShowModal(false)} onAdd={onAddEvents} />}
    </>
  );
}
