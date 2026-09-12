'use client';
import React, { useState } from 'react';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import AddScheduleModal from './AddScheduleModal';

export default function ScheduleHeader() {
  const [showModal, setShowModal] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const getWeekLabel = (offset: number) => {
    if (offset === 0) return 'השבוע הנוכחי';
    if (offset === 1) return 'השבוע הבא';
    if (offset === -1) return 'השבוע שעבר';
    return offset > 0 ? `בעוד ${offset} שבועות` : `לפני ${Math.abs(offset)} שבועות`;
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
              onClick={() => setWeekOffset((p) => p - 1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="שבוע קודם"
            >
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
            <span className="text-sm font-semibold text-foreground px-2 min-w-[120px] text-center">
              {getWeekLabel(weekOffset)}
            </span>
            <button
              onClick={() => setWeekOffset((p) => p + 1)}
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
        </div>
      </div>

      {showModal && <AddScheduleModal onClose={() => setShowModal(false)} />}
    </>
  );
}