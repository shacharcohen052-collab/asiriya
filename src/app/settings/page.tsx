'use client';
import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Settings, Bell, Eye, Calendar, Moon, Check, ExternalLink } from 'lucide-react';

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
  const [googleMessage, setGoogleMessage] = useState<string | null>(null);
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

  const [calendar, setCalendar] = useState({
    googleSync: false,
    appleSync: false,
    autoAddFixed: true,
  });

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('google');
    const reason = params.get('reason');
    if (!status) return;
    const messages: Record<string, string> = {
      connected: 'Google Calendar חובר בהצלחה. עכשיו אפשר לחזור ללוז וללחוץ על סנכרן.',
      missing_credentials: 'חסרים GOOGLE_CLIENT_ID או GOOGLE_CLIENT_SECRET ב-Vercel. לאחר הוספה יש לבצע Redeploy.',
      denied: `Google ביטל את ההרשאה${reason ? ` (${reason})` : ''}.`,
      invalid_state: 'האבטחה של חיבור Google פגה. נסה להתחבר מחדש.',
      auth_required: 'צריך להתחבר קודם ל-Asiriya ואז לחבר את Google Calendar.',
      token_exchange_failed: 'Google לא אישר את החלפת ההרשאה. בדוק שה-Redirect URI זהה בדיוק ב-Google Cloud וב-Vercel.',
      save_failed: 'Google אישר את החיבור, אבל שמירת החיבור ב-Supabase נכשלה.',
    };
    setGoogleMessage(messages[status] || `חיבור Google נכשל (${status}${reason ? `: ${reason}` : ''}).`);
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGoogleConnect = () => {
    window.location.assign('/api/google-calendar/connect');
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
        <p className="text-muted-foreground text-sm mr-12">ניהול התראות, פרטיות וסנכרון יומן</p>
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

        {/* Calendar Sync */}
        <div id="google-calendar" className="scroll-mt-4">
        <Section icon={<Calendar size={16} className="text-primary" />} title="סנכרון יומן">
          {googleMessage && (
            <div role="status" className={`mx-0 mt-4 rounded-xl border px-3 py-3 text-xs leading-relaxed ${googleMessage.includes('בהצלחה') ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              {googleMessage}
            </div>
          )}
          <div className="py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Google Calendar</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {calendar.googleSync ? 'מחובר ומסונכרן' : 'לא מחובר'}
                </p>
              </div>
              <button
                onClick={handleGoogleConnect}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                  calendar.googleSync
                    ? 'bg-green-50 text-green-700 border border-green-200' :'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                }`}
              >
                {calendar.googleSync ? (
                  <><Check size={12} /> מחובר</>
                ) : (
                  <><ExternalLink size={12} /> חיבור יומן Google — סנכרון</>
                )}
              </button>
            </div>
          </div>
          <Toggle
            checked={calendar.autoAddFixed}
            onChange={(v) => setCalendar((p) => ({ ...p, autoAddFixed: v }))}
            label="הוסף פגישות קבועות אוטומטית"
            description="פגישות קבועות יתווספו ליומן אוטומטית"
          />
          <div className="py-3">
            <p className="text-sm font-medium text-foreground mb-2">ייצוא Apple Calendar (ICS)</p>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert('קובץ ICS יורד...'); }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink size={12} />
              הורד קובץ ICS לייבוא ידני
            </a>
          </div>
        </Section>
        </div>

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
