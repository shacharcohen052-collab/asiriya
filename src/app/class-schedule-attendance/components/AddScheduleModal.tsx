'use client';
import React, { useState } from 'react';
import { CalendarDays, Plus, X, AlertTriangle, Star, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  dayLabel: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  isFixed: boolean;
  source: string;
  allowsAttendancePlan: boolean;
  countsForScore: boolean;
  scoreValue: number;
  planningCount: number;
  myPlan: string | null;
  isPast: boolean;
  myActualAttendance: string | null;
  isSynced: boolean;
}

interface ConflictInfo {
  existing: ScheduleEvent;
  incoming: Partial<ScheduleEvent>;
}

interface AddScheduleModalProps {
  onClose: () => void;
  onAdd?: (events: ScheduleEvent[]) => void;
  existingEvents?: ScheduleEvent[];
}

const FIXED_EVENTS: ScheduleEvent[] = [
  {
    id: 'fixed-zoom-morning',
    title: 'זום PT100',
    date: '',
    dayLabel: '',
    dateLabel: '',
    startTime: '11:45',
    endTime: '12:00',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    scoreValue: 0,
    planningCount: 0,
    myPlan: null,
    isPast: false,
    myActualAttendance: null,
    isSynced: false,
  },
  {
    id: 'fixed-zoom-evening',
    title: 'זום PT100',
    date: '',
    dayLabel: '',
    dateLabel: '',
    startTime: '18:00',
    endTime: '18:30',
    isFixed: true,
    source: 'fixed_schedule',
    allowsAttendancePlan: true,
    countsForScore: false,
    scoreValue: 0,
    planningCount: 0,
    myPlan: null,
    isPast: false,
    myActualAttendance: null,
    isSynced: false,
  },
];

function parseScheduleText(text: string): Partial<ScheduleEvent>[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const events: Partial<ScheduleEvent>[] = [];
  const timeRegex = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;
  const dateRegex = /(\d{1,2})[\/\-\.](\d{1,2})/;

  for (const line of lines) {
    const timeMatch = line.match(timeRegex);
    const dateMatch = line.match(dateRegex);
    if (timeMatch) {
      const title = line.replace(timeRegex, '').replace(dateRegex, '').trim().replace(/^[-–:,\s]+/, '').trim();
      events.push({
        id: `imported-${Date.now()}-${Math.random()}`,
        title: title || 'שיעור',
        startTime: timeMatch[1],
        endTime: timeMatch[2],
        date: dateMatch ? `2026-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}` : '',
        dayLabel: '',
        dateLabel: dateMatch ? `${dateMatch[1]}/${dateMatch[2]}` : '',
        isFixed: false,
        source: 'weekly_paste',
        allowsAttendancePlan: true,
        countsForScore: true,
        scoreValue: 2,
        planningCount: 0,
        myPlan: null,
        isPast: false,
        myActualAttendance: null,
        isSynced: false,
      });
    }
  }
  return events;
}

function detectConflicts(incoming: Partial<ScheduleEvent>[], existing: ScheduleEvent[]): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  for (const inc of incoming) {
    for (const ex of existing) {
      if (inc.date && ex.date && inc.date === ex.date) {
        const incStart = inc.startTime ? timeToMins(inc.startTime) : 0;
        const incEnd = inc.endTime ? timeToMins(inc.endTime) : 0;
        const exStart = timeToMins(ex.startTime);
        const exEnd = timeToMins(ex.endTime);
        if (incStart < exEnd && incEnd > exStart) {
          conflicts.push({ existing: ex, incoming: inc });
        }
      }
    }
  }
  return conflicts;
}

function timeToMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function AddScheduleModal({ onClose, onAdd = () => {}, existingEvents = [] }: AddScheduleModalProps) {
  const [tab, setTab] = useState<'paste' | 'manual'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<Partial<ScheduleEvent>[]>([]);
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');

  // Manual form
  const [manualTitle, setManualTitle] = useState('');
  const [manualDate, setManualDate] = useState('');
  const [manualStart, setManualStart] = useState('');
  const [manualEnd, setManualEnd] = useState('');
  const [manualScore, setManualScore] = useState(false);
  const [manualFixed, setManualFixed] = useState(false);

  const handleParse = () => {
    const events = parseScheduleText(pasteText);
    if (!events.length) {
      toast.error('לא נמצאו אירועים. ודא שיש שעות בפורמט HH:MM - HH:MM');
      return;
    }
    // Fixed events always take priority — add them first
    const allIncoming = [...FIXED_EVENTS.map((f) => ({ ...f, id: `${f.id}-${Date.now()}` })), ...events];
    const detectedConflicts = detectConflicts(events, existingEvents.filter((e) => e.isFixed));
    setParsed(allIncoming);
    setConflicts(detectedConflicts);
    setStep('preview');
  };

  const handleAddManual = () => {
    if (!manualTitle || !manualDate || !manualStart || !manualEnd) {
      toast.error('מלא את כל השדות');
      return;
    }
    const event: ScheduleEvent = {
      id: `manual-${Date.now()}`,
      title: manualTitle,
      date: manualDate,
      dayLabel: '',
      dateLabel: manualDate.split('-').slice(1).reverse().join('/'),
      startTime: manualStart,
      endTime: manualEnd,
      isFixed: manualFixed,
      source: 'manual',
      allowsAttendancePlan: true,
      countsForScore: manualScore,
      scoreValue: manualScore ? 2 : 0,
      planningCount: 0,
      myPlan: null,
      isPast: false,
      myActualAttendance: null,
      isSynced: false,
    };
    onAdd([event]);
    toast.success('אירוע נוסף בהצלחה');
    onClose();
  };

  const handleConfirmPaste = () => {
    const validEvents = parsed.filter((e): e is ScheduleEvent => !!e.id && !!e.title);
    onAdd(validEvents);
    toast.success(`${validEvents.length} אירועים נוספו`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 fade-in">
      <div className="bg-card border border-border rounded-2xl card-shadow-md w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-primary" />
            <h2 className="text-base font-bold text-foreground">הוסף לו&quot;ז</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['paste', 'manual'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStep('input'); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'paste' ? 'הדבק לו"ז שבועי' : 'הוסף ידנית'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'paste' && step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">הדבק לו&quot;ז שבועי</label>
                <textarea
                  className="input-field min-h-[160px] text-sm font-mono resize-y"
                  placeholder={'שלישי 15/09\n06:00 - 07:00 שיעור בוקר\n18:30 - 21:00 לימוד בקהילה'}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground mb-1 flex items-center gap-1">
                  <Star size={12} className="text-primary" /> פגישות קבועות — עדיפות עליונה
                </p>
                <p>זום PT100 (11:45) ופגישות קבועות אחרות יתווספו אוטומטית ויקבלו עדיפות על פני שיעורים מיובאים.</p>
              </div>
              <button onClick={handleParse} className="btn-primary w-full">
                נתח ותצוגה מקדימה
              </button>
            </div>
          )}

          {tab === 'paste' && step === 'preview' && (
            <div className="space-y-4">
              {conflicts.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={15} className="text-amber-600" />
                    <p className="text-sm font-semibold text-amber-800">נמצאו {conflicts.length} חפיפות</p>
                  </div>
                  {conflicts.map((c, i) => (
                    <p key={i} className="text-xs text-amber-700">
                      {c.incoming.title} ({c.incoming.startTime}) חופף עם {c.existing.title} ({c.existing.startTime}) — הפגישה הקבועה תישמר
                    </p>
                  ))}
                </div>
              )}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {parsed.map((e, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${e.isFixed ? 'border-primary/25 bg-primary/5' : 'border-border bg-muted/30'}`}>
                    {e.isFixed && <Star size={13} className="text-primary flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} />
                        {e.startTime}–{e.endTime}
                        {e.dateLabel && ` · ${e.dateLabel}`}
                      </p>
                    </div>
                    {e.countsForScore && (
                      <span className="text-2xs bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">ניקוד</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleConfirmPaste} className="btn-primary flex-1">
                  <Check size={15} /> הוסף {parsed.length} אירועים
                </button>
                <button onClick={() => setStep('input')} className="btn-secondary">חזור</button>
              </div>
            </div>
          )}

          {tab === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">שם האירוע</label>
                <input className="input-field" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} placeholder="שיעור בוקר" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">תאריך</label>
                <input type="date" className="input-field" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">שעת התחלה</label>
                  <input type="time" className="input-field" value={manualStart} onChange={(e) => setManualStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">שעת סיום</label>
                  <input type="time" className="input-field" value={manualEnd} onChange={(e) => setManualEnd(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={manualScore} onChange={(e) => setManualScore(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-foreground">מזכה בניקוד</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={manualFixed} onChange={(e) => setManualFixed(e.target.checked)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-foreground">פגישה קבועה</span>
                </label>
              </div>
              <button onClick={handleAddManual} className="btn-primary w-full">
                <Plus size={15} /> הוסף אירוע
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
