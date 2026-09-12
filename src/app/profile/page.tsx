'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { User, Edit3, Save, X, CheckCircle } from 'lucide-react';
import { MEMBERS, getInitials, getAvatarColor } from '@/data/members';

// In production: fetch from user_profiles table using auth.uid()
const MY_PROFILE = MEMBERS[0]; // shachar cohen

interface ProfileField {
  key: keyof typeof MY_PROFILE;
  label: string;
  multiline?: boolean;
}

const FIELDS: ProfileField[] = [
  { key: 'lifeWork', label: 'עבודה ועיסוק', multiline: true },
  { key: 'relationshipStatus', label: 'מצב משפחתי' },
  { key: 'hobbies', label: 'תחביבים ועניינים', multiline: true },
  { key: 'pathDuration', label: 'כמה זמן בדרך', multiline: true },
  { key: 'connectionStrength', label: 'מה מחזק אותי בחברים', multiline: true },
  { key: 'desiredQuality', label: 'מה הייתי רוצה להביא יותר', multiline: true },
  { key: 'teamDayIdea', label: 'רעיון ליום גיבוש', multiline: true },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState({ ...MY_PROFILE });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  const startEdit = (key: string) => {
    setEditing(key);
    setDraft((profile as Record<string, string | null>)[key] ?? '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
  };

  const saveEdit = (key: string) => {
    setProfile((p) => ({ ...p, [key]: draft || null }));
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const avatarIdx = 0;

  return (
    <AppLayout activeRoute="/profile">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <User size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">פרופיל אישי</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-12">הפרטים שלך בעשירייה</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Avatar + name */}
        <div className="bg-card border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className={`w-16 h-16 rounded-full ${getAvatarColor(avatarIdx)} flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}>
            {getInitials(profile.displayName)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{profile.displayName}</h2>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {saved && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle size={12} /> נשמר בהצלחה
              </p>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">פרטי פרופיל</p>
          </div>
          <div className="divide-y divide-border">
            {FIELDS.map((field) => {
              const value = (profile as Record<string, string | null>)[field.key];
              const isEditing = editing === field.key;
              return (
                <div key={`field-${field.key}`} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">{field.label}</p>
                      {isEditing ? (
                        <div className="space-y-2">
                          {field.multiline ? (
                            <textarea
                              className="input-field min-h-[80px] resize-y text-sm"
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <input
                              className="input-field text-sm"
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              autoFocus
                            />
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveEdit(field.key)}
                              className="btn-primary text-xs py-1.5 px-3"
                            >
                              <Save size={13} /> שמור
                            </button>
                            <button onClick={cancelEdit} className="btn-ghost text-xs py-1.5 px-3">
                              <X size={13} /> ביטול
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {value || <span className="text-muted-foreground italic">לא מולא</span>}
                        </p>
                      )}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(field.key)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0 mt-0.5"
                        aria-label={`ערוך ${field.label}`}
                      >
                        <Edit3 size={14} className="text-muted-foreground" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
