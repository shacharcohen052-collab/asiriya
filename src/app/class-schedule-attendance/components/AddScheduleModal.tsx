'use client';
import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AddScheduleModalProps {
  onClose: () => void;
}

const MOCK_PARSED = [
  { id: 'parsed-1', day: 'ראשון', time: '06:00', title: 'שיעור בוקר', duration: '60 דקות', conflict: false },
  { id: 'parsed-2', day: 'שני', time: '06:00', title: 'שיעור בוקר', duration: '60 דקות', conflict: false },
  { id: 'parsed-3', day: 'שני', time: '18:30', title: 'שיעור ערב', duration: '90 דקות', conflict: true, conflictWith: 'לימוד בקהילת הצעירים' },
  { id: 'parsed-4', day: 'שלישי', time: '06:00', title: 'שיעור בוקר', duration: '60 דקות', conflict: false },
  { id: 'parsed-5', day: 'חמישי', time: '06:00', title: 'שיעור בוקר', duration: '60 דקות', conflict: false },
];

export default function AddScheduleModal({ onClose }: AddScheduleModalProps) {
  const [text, setText] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'saving'>('input');
  const [parsed, setParsed] = useState<typeof MOCK_PARSED>([]);

  const handleParse = () => {
    if (!text.trim()) return;
    // Backend integration point: POST /api/schedule/parse { text }
    setStep('preview');
    setParsed(MOCK_PARSED);
  };

  const handleSave = async () => {
    setStep('saving');
    // Backend integration point: POST /api/schedule/import { events: parsed.filter(p => !p.conflict) }
    await new Promise((r) => setTimeout(r, 1000));
    const conflicts = parsed.filter((p) => p.conflict);
    const saved = parsed.filter((p) => !p.conflict);
    toast.success(`${saved.length} אירועים נשמרו בהצלחה.`);
    if (conflicts.length > 0) {
      toast.warning(`${conflicts.length} אירועים לא נוספו עקב חפיפה עם פגישות קבועות.`);
    }
    onClose();
  };

  const conflictCount = parsed.filter((p) => p.conflict).length;
  const validCount = parsed.filter((p) => !p.conflict).length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 fade-in" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border card-shadow-md w-full max-w-lg max-h-[90vh] flex flex-col slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">הוסף לו&quot;ז שבועי</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  הדבק לו&quot;ז שבועי
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  הדבק טקסט של לו&quot;ז שבועי. המערכת תזהה ימים, שעות ושמות שיעורים אוטומטית.
                </p>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  placeholder={`ראשון\n06:00 שיעור בוקר\n20:00 שיעור ערב\n\nשני\n06:00 שיעור בוקר`}
                  className="input-field resize-none text-sm leading-relaxed"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-muted rounded-lg p-3">
                פגישות קבועות (זום עשירייה, לימוד בקהילת הצעירים, ערבי גיבוש) יוצגו תמיד ואינן תלויות בלו&quot;ז המיובא.
              </p>
            </div>
          )}

          {(step === 'preview' || step === 'saving') && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 bg-muted rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-positive font-tabular">{validCount}</p>
                  <p className="text-xs text-muted-foreground">אירועים חדשים</p>
                </div>
                <div className={`flex-1 rounded-xl p-3 text-center ${conflictCount > 0 ? 'bg-amber-50' : 'bg-muted'}`}>
                  <p className={`text-xl font-bold font-tabular ${conflictCount > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                    {conflictCount}
                  </p>
                  <p className="text-xs text-muted-foreground">חפיפות</p>
                </div>
              </div>

              {conflictCount > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-warning mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    {conflictCount} אירועים לא יתווספו כי הם חופפים לפגישות קבועות. הפגישות הקבועות תמיד מקבלות עדיפות.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {parsed.map((item) => (
                  <div
                    key={`preview-${item.id}`}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                      item.conflict
                        ? 'border-amber-200 bg-amber-50 opacity-60' :'border-border bg-background'
                    }`}
                  >
                    <div>
                      <span className="font-semibold text-foreground">{item.title}</span>
                      <span className="text-muted-foreground mx-2">·</span>
                      <span className="text-muted-foreground">יום {item.day} {item.time}</span>
                      {item.conflict && (
                        <p className="text-2xs text-amber-700 mt-0.5">
                          חפיפה עם: {item.conflictWith}
                        </p>
                      )}
                    </div>
                    {item.conflict ? (
                      <span className="text-2xs text-amber-700 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                        לא יתווסף
                      </span>
                    ) : (
                      <span className="text-2xs text-positive font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                        יתווסף
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border">
          {step === 'input' && (
            <>
              <button onClick={onClose} className="btn-secondary flex-1">
                ביטול
              </button>
              <button
                onClick={handleParse}
                disabled={!text.trim()}
                className="btn-primary flex-1"
              >
                עיבוד ותצוגה מקדימה
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('input')} className="btn-secondary flex-1">
                חזור
              </button>
              <button onClick={handleSave} className="btn-primary flex-1">
                שמור {validCount} אירועים
              </button>
            </>
          )}
          {step === 'saving' && (
            <button disabled className="btn-primary flex-1">
              <Loader2 size={16} className="animate-spin" />
              שומר...
            </button>
          )}
        </div>
      </div>
    </div>
  );
}