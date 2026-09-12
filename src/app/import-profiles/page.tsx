'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS } from '@/data/members';
import { Upload, Search, CheckCircle, AlertCircle, User } from 'lucide-react';
import { getInitials, getAvatarColor } from '@/data/members';

interface ImportedProfile {
  profileId: number;
  email: string;
  displayName: string;
  lifeWork: string | null;
  relationshipStatus: string | null;
  hobbies: string | null;
  pathDuration: string | null;
  connectionStrength: string | null;
  desiredQuality: string | null;
  teamDayIdea: string | null;
}

interface MatchResult {
  imported: ImportedProfile;
  matched: typeof MEMBERS[0] | null;
  status: 'matched' | 'new' | 'conflict';
}

function parseProfiles(text: string): ImportedProfile[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed as ImportedProfile[];
  } catch {
    // not JSON
  }
  return [];
}

function matchProfiles(imported: ImportedProfile[]): MatchResult[] {
  return imported.map((imp) => {
    const match = MEMBERS.find(
      (m) => m.email.toLowerCase().trim() === imp.email.toLowerCase().trim()
    );
    return {
      imported: imp,
      matched: match || null,
      status: match ? 'matched' : 'new',
    };
  });
}

export default function ImportProfilesPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [rawText, setRawText] = useState('');
  const [results, setResults] = useState<MatchResult[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleParse = () => {
    setError('');
    if (!rawText.trim()) {
      setError('אנא הדבק JSON של פרופילים');
      return;
    }
    const profiles = parseProfiles(rawText);
    if (!profiles.length) {
      setError('לא נמצאו פרופילים תקינים. ודא שהפורמט הוא JSON array.');
      return;
    }
    const matched = matchProfiles(profiles);
    setResults(matched);
    setSelected(new Set(matched.map((_, i) => i)));
    setStep('preview');
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setStep('done');
  };

  const filtered = results.filter((r) =>
    r.imported.displayName.includes(search) || r.imported.email.includes(search)
  );

  const matchedCount = results.filter((r) => r.status === 'matched').length;
  const newCount = results.filter((r) => r.status === 'new').length;

  return (
    <AppLayout activeRoute="/import-profiles">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ייבוא פרופילים</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-12">התאמה אוטומטית לפי אימייל עם תצוגה מקדימה לפני שמירה</p>
      </div>

      {step === 'upload' && (
        <div className="max-w-2xl space-y-5">
          <div className="bg-card border border-border rounded-xl p-5 card-shadow">
            <h2 className="text-base font-semibold text-foreground mb-3">הדבק JSON של פרופילים</h2>
            <textarea
              className="input-field min-h-[200px] font-mono text-xs resize-y"
              placeholder={'[\n  {\n    "profileId": 1,\n    "email": "user@example.com",\n    "displayName": "שם",\n    ...\n  }\n]'}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              dir="ltr"
            />
            {error && (
              <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}
            <div className="mt-4 flex gap-3">
              <button onClick={handleParse} className="btn-primary">
                <Search size={16} />
                <span>נתח ותצוגה מקדימה</span>
              </button>
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-xl p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">איך זה עובד?</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>הדבק JSON array של פרופילים</li>
              <li>המערכת תתאים אוטומטית לפי כתובת אימייל</li>
              <li>תראה תצוגה מקדימה לפני שמירה</li>
              <li>בחר אילו פרופילים לייבא</li>
            </ul>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 card-shadow text-center">
              <p className="text-2xl font-bold text-foreground">{results.length}</p>
              <p className="text-xs text-muted-foreground mt-1">פרופילים בקובץ</p>
            </div>
            <div className="bg-card border border-green-200 rounded-xl p-4 card-shadow text-center">
              <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">התאמות נמצאו</p>
            </div>
            <div className="bg-card border border-amber-200 rounded-xl p-4 card-shadow text-center">
              <p className="text-2xl font-bold text-amber-600">{newCount}</p>
              <p className="text-xs text-muted-foreground mt-1">פרופילים חדשים</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              className="input-field pr-9"
              placeholder="חיפוש לפי שם או אימייל..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Profile list */}
          <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {selected.size} נבחרו מתוך {results.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(new Set(results.map((_, i) => i)))}
                  className="text-xs text-primary hover:underline"
                >
                  בחר הכל
                </button>
                <span className="text-muted-foreground">·</span>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  בטל הכל
                </button>
              </div>
            </div>
            <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
              {filtered.map((result, idx) => {
                const realIdx = results.indexOf(result);
                const isSelected = selected.has(realIdx);
                const avatarIdx = realIdx % 12;
                return (
                  <div
                    key={`import-${result.imported.profileId}`}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/3' : 'hover:bg-muted/30'
                    }`}
                    onClick={() => toggleSelect(realIdx)}
                  >
                    <div className="mt-0.5">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-primary border-primary' : 'border-border'
                        }`}
                      >
                        {isSelected && <CheckCircle size={12} className="text-white" />}
                      </div>
                    </div>
                    <div className={`w-9 h-9 rounded-full ${getAvatarColor(avatarIdx)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {getInitials(result.imported.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{result.imported.displayName}</span>
                        {result.status === 'matched' ? (
                          <span className="text-2xs bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle size={10} />
                            התאמה נמצאה
                          </span>
                        ) : (
                          <span className="text-2xs bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                            חדש
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{result.imported.email}</p>
                      {result.imported.lifeWork && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{result.imported.lifeWork}</p>
                      )}
                    </div>
                    {result.matched && (
                      <div className="text-xs text-muted-foreground text-left flex-shrink-0">
                        <User size={12} className="inline ml-1" />
                        {result.matched.displayName}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || selected.size === 0}
              className="btn-primary"
            >
              {saving ? 'שומר...' : `ייבא ${selected.size} פרופילים`}
            </button>
            <button
              onClick={() => { setStep('upload'); setResults([]); setRawText(''); }}
              className="btn-secondary"
            >
              חזור
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">הייבוא הושלם!</h2>
          <p className="text-muted-foreground mb-6">{selected.size} פרופילים יובאו בהצלחה</p>
          <div className="flex gap-3 justify-center">
            <a href="/members" className="btn-primary">צפה בחברים</a>
            <button onClick={() => { setStep('upload'); setRawText(''); setResults([]); }} className="btn-secondary">
              ייבא עוד
            </button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
