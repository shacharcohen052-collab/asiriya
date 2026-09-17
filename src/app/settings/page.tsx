'use client';
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Bell, Eye, Moon, Check } from 'lucide-react';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}

function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${
          checked ? 'bg-primary' : 'bg-border'
        }`}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-0.5' : 'translate-x-5'
          }`}
        />
      </button>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="px-5 divide-y divide-border">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    pushEnabled: true,
    progressReminders: true,
    dutyReminders: true,
    scheduleUpdates: false,
  });

  const [privacy, setPrivacy] = useState({
    showAttendance: true,
    showScore: true,
    showDutyStatus: true,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout activeRoute="/settings">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings size={20} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">הגדרות</h1>
        </div>
        <p className="text-muted-foreground text-sm mr-12">ניהול התראות, פרטיות והעדפות אישיות</p>
      </div>

      <div className="max-w-2xl space-y-5">
        {/* Notifications */}
        <Section icon={<Bell size={16} className="text-primary" />} title="התראות">
          <Toggle
            checked={notifications.pushEnabled}
            onChange={(v) => setNotifications((p) => ({ ...p, pushEnabled: v }))}
            label="התראות Push"
            description="קבל התראות על שיעורים ואירועים"
          />
          <Toggle
            checked={notifications.progressReminders}
            onChange={(v) => setNotifications((p) => ({ ...p, progressReminders: v }))}
            label="תזכורות בדיקת התקדמות"
            description="תזכורת לדווח על נוכחות אחרי שיעור"
          />
          <Toggle
            checked={notifications.dutyReminders}
            onChange={(v) => setNotifications((p) => ({ ...p, dutyReminders: v }))}
            label="תזכורות תורני חיבור"
            description="תזכורת ביום שאתה תורן חיבור"
          />
          <Toggle
            checked={notifications.scheduleUpdates}
            onChange={(v) => setNotifications((p) => ({ ...p, scheduleUpdates: v }))}
            label="עדכוני לו&quot;ז"
            description="קבל עדכון כשמתווסף שיעור חדש"
          />
        </Section>

        {/* Privacy */}
        <Section icon={<Eye size={16} className="text-primary" />} title="פרטיות">
          <Toggle
            checked={privacy.showAttendance}
            onChange={(v) => setPrivacy((p) => ({ ...p, showAttendance: v }))}
            label="הצג תכנון נוכחות לחברים"
            description="חברים יוכלו לראות את תכנון ההגעה שלך"
          />
          <Toggle
            checked={privacy.showScore}
            onChange={(v) => setPrivacy((p) => ({ ...p, showScore: v }))}
            label="הצג ניקוד בלוח מובילים"
            description="הניקוד שלך יופיע בלוח המובילים החודשי"
          />
          <Toggle
            checked={privacy.showDutyStatus}
            onChange={(v) => setPrivacy((p) => ({ ...p, showDutyStatus: v }))}
            label="הצג סטטוס תורני חיבור"
            description="חברים יוכלו לראות מתי אתה תורן"
          />
        </Section>

        {/* Appearance */}
        <Section icon={<Moon size={16} className="text-primary" />} title="מראה">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">מצב תצוגה אוטומטי</p>
              <p className="mt-0.5 text-xs text-muted-foreground">בהיר ביום, כהה בערב — מתעדכן אוטומטית בשעה 19:00 ובשעה 07:00</p>
            </div>
            <div className="shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">אוטומטי</div>
          </div>
        </Section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary">
            {saved ? <><Check size={16} /> נשמר!</> : 'שמור הגדרות'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
