'use client';
import React, { useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor } from '@/data/members';
import { RotateCcw, ChevronRight, ChevronLeft, Calendar, AlertCircle, Edit3, X, Check } from 'lucide-react';

interface DutyPair {
  day: number;
  date: string;
  weekday: string;
  memberA: typeof MEMBERS[0];
  memberB: typeof MEMBERS[0];
  indexA: number;
  indexB: number;
}

interface Override {
  day: number;
  unavailable?: boolean;
  swapWithIdx?: number;
  note?: string;
}

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function generateMonthlyRoster(year: number, month: number): DutyPair[] {
  const days = getDaysInMonth(year, month);
  const members = [...MEMBERS];
  const pairs: DutyPair[] = [];
  const allPairs: [number, number][] = [];
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      allPairs.push([i, j]);
    }
  }
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

interface EditRowProps {
  row: DutyPair;
  override: Override | undefined;
  onSave: (day: number, override: Override) => void;
  onClose: () => void;
}

function EditRow({ row, override, onSave, onClose }: EditRowProps) {
  const [unavailable, setUnavailable] = useState(override?.unavailable ?? false);
  const [swapWith, setSwapWith] = useState<number | undefined>(override?.swapWithIdx);
  const [note, setNote] = useState(override?.note ?? '');

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">עריכת תורנות — {row.day}/{row.date.split('/')[1]}</p>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={unavailable}
          onChange={(e) => setUnavailable(e.target.checked)}
          className="w-4 h-4 rounded"
        />
        <span className="text-sm text-foreground">לא זמין ביום זה</span>
      </label>
      {!unavailable && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">החלף עם חבר</label>
          <select
            className="input-field text-sm"
            value={swapWith ?? ''}
            onChange={(e) => setSwapWith(e.target.value ? Number(e.target.value) : undefined)}
          >
            <option value="">ללא החלפה</option>
            {MEMBERS.map((m, idx) => (
              <option key={m.profileId} value={idx}>{m.displayName}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="text-xs text-muted-foreground block mb-1">הערה</label>
        <input
          className="input-field text-sm"
          placeholder="הערה אופציונלית..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(row.day, { day: row.day, unavailable, swapWithIdx: swapWith, note })}
          className="btn-primary text-xs py-1.5 px-3"
        >
          <Check size={13} /> שמור
        </button>
        <button onClick={onClose} className="btn-ghost text-xs py-1.5 px-3">
          <X size={13} /> ביטול
        </button>
      </div>
    </div>
  );
}

export default function ConnectionDutiesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const roster = useMemo(() => generateMonthlyRoster(year, month), [year, month]);
  const todayDay = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }
  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  const handleSaveOverride = (day: number, override: Override) => {
    setOverrides((prev) => ({ ...prev, [day]: override }));
    setEditingDay(null);
  };

  return (
    <AppLayout activeRoute="/connection-duties">
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
        <div className="grid grid-cols-[auto_1fr_1fr_auto] text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50 px-4 py-3 border-b border-border">
          <div className="w-20">תאריך</div>
          <div className="px-4">חבר א׳</div>
          <div className="px-4">חבר ב׳</div>
          <div className="w-8"></div>
        </div>
        <div className="divide-y divide-border">
          {roster.map((row) => {
            const isToday = row.day === todayDay;
            const override = overrides[row.day];
            const isEditing = editingDay === row.day;

            let memberA = row.memberA;
            let memberB = row.memberB;
            let idxA = row.indexA;
            let idxB = row.indexB;

            if (override?.swapWithIdx !== undefined) {
              memberB = MEMBERS[override.swapWithIdx];
              idxB = override.swapWithIdx;
            }

            return (
              <div key={row.day}>
                <div
                  className={`grid grid-cols-[auto_1fr_1fr_auto] items-center px-4 py-3 transition-colors ${
                    isToday ? 'bg-primary/5 border-r-2 border-primary' : 'hover:bg-muted/30'
                  } ${override?.unavailable ? 'opacity-50' : ''}`}
                >
                  <div className="w-20">
                    <p className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                      {row.day}/{month + 1}
                    </p>
                    <p className="text-2xs text-muted-foreground">{row.weekday}</p>
                  </div>
                  <div className="px-4">
                    {override?.unavailable ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertCircle size={12} /> לא זמין
                      </span>
                    ) : (
                      <AvatarBadge name={memberA.displayName} index={idxA} />
                    )}
                  </div>
                  <div className="px-4">
                    {!override?.unavailable && <AvatarBadge name={memberB.displayName} index={idxB} />}
                    {override?.note && (
                      <p className="text-2xs text-muted-foreground mt-0.5">{override.note}</p>
                    )}
                  </div>
                  <div className="w-8 flex justify-center">
                    <button
                      onClick={() => setEditingDay(isEditing ? null : row.day)}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      aria-label="ערוך תורנות"
                    >
                      <Edit3 size={13} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <div className="px-4 pb-3">
                    <EditRow
                      row={row}
                      override={override}
                      onSave={handleSaveOverride}
                      onClose={() => setEditingDay(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/20 border-r-2 border-primary" />
          <span>היום</span>
        </div>
        <div className="flex items-center gap-2">
          <Edit3 size={12} />
          <span>לחץ על עיפרון לעריכה ידנית</span>
        </div>
      </div>
    </AppLayout>
  );
}
