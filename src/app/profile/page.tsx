'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { User, Edit3, Save, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Profile fields — no team_day_idea per PT100 spec
interface ProfileField {
  key: string;
  label: string;
  multiline?: boolean;
}

const FIELDS: ProfileField[] = [
  { key: 'life_work', label: 'עבודה ועיסוק', multiline: true },
  { key: 'relationship_status', label: 'מצב משפחתי' },
  { key: 'hobbies', label: 'תחביבים ועניינים', multiline: true },
  { key: 'path_duration', label: 'כמה זמן בדרך', multiline: true },
  { key: 'connection_strength', label: 'מה מחזק אותי בחברים', multiline: true },
  { key: 'desired_quality', label: 'מה הייתי רוצה להביא יותר', multiline: true },
];

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);
  const [localProfile, setLocalProfile] = useState<Record<string, string | null>>({});

  // Merge auth profile with local edits
  const merged: Record<string, string | null> = {
    life_work: profile?.life_work ?? null,
    relationship_status: profile?.relationship_status ?? null,
    hobbies: profile?.hobbies ?? null,
    path_duration: profile?.path_duration ?? null,
    connection_strength: profile?.connection_strength ?? null,
    desired_quality: profile?.desired_quality ?? null,
    ...localProfile,
  };

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'חבר PT100';
  const email = profile?.email || user?.email || '';
  const initials = displayName.charAt(0).toUpperCase();

  const startEdit = (key: string) => {
    setEditing(key);
    setDraft(merged[key] ?? '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
  };

  const saveEdit = (key: string) => {
    setLocalProfile((p) => ({ ...p, [key]: draft || null }));
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout activeRoute="/profile">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <User size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">פרופיל אישי</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-12">הפרטים שלך ב-PT100</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Avatar + name */}
        <div className="bg-card border border-border rounded-xl p-5 card-shadow flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{email}</p>
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
              const value = merged[field.key];
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
