'use client';
import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronLeft, Trash2, CalendarDays, List } from 'lucide-react';
import AddScheduleModal from './AddScheduleModal';
import type { ScheduleEvent } from './AddScheduleModal';

interface ScheduleHeaderProps {
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
  onAddEvents: (events: ScheduleEvent[]) => void;
  onClearSchedule: () => void;
  isAdmin: boolean;
  viewMode: 'calendar' | 'list';
  onViewModeChange: (mode: 'calendar' | 'list') => void;
}

export default function ScheduleHeader({ weekOffset, onWeekOffsetChange, onAddEvents, onClearSchedule, isAdmin, viewMode, onViewModeChange }: ScheduleHeaderProps) {
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
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">לו&quot;ז שיעורים ונוכחות</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            שיעורים, פגישות קבועות ותכנון הגעה אישי
          </p>
        </div>

        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1">
            <button type="button" onClick={() => onViewModeChange('list')} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}>
              <List size={14} /> רשימה
            </button>
            <button type="button" onClick={() => onViewModeChange('calendar')} className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}>
              <CalendarDays size={14} /> קלנדר
            </button>
          </div>
          {/* Week navigation */}
          <div className="flex min-w-0 shrink items-center gap-1 bg-card border border-border rounded-xl p-1">
            <button
              onClick={() => onWeekOffsetChange(weekOffset - 1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="שבוע קודם"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <span className="min-w-0 px-2 text-center text-sm font-semibold text-foreground">
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
            className="btn-primary shrink-0 text-sm py-2 px-3"
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
