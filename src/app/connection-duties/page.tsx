'use client';
import React, { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor } from '@/data/members';
import { RotateCcw, ChevronRight, ChevronLeft, Calendar, AlertCircle, Edit3, X, Check, Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const supabase = createClient();

function urlBase64ToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0))).buffer;
}

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
  let previousPair: [number, number] | null = null;
  for (let d = 1; d <= days; d++) {
    const date = new Date(year, month, d);
    const weekday = WEEKDAYS_HE[date.getDay()];
    const candidates = shuffled.filter(([iA, iB]) => !previousPair || !previousPair.includes(iA) && !previousPair.includes(iB));
    const source = candidates.length ? candidates : shuffled;
    const pair = source[(d - 1) % source.length];
    const [iA, iB] = pair;
    previousPair = pair;
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
  const { profile } = useAuth();
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadPushState = async () => {
      if (!profile?.id || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription || cancelled) return;
        const { data } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', profile.id)
          .eq('endpoint', subscription.endpoint)
          .limit(1);
        if (!cancelled) setRemindersEnabled(Boolean(data?.length));
      } catch {
        // Permission and browser support errors are surfaced when the user enables the toggle.
      }
    };
    void loadPushState();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const toggleDutyReminder = async () => {
    const next = !remindersEnabled;
    if (!profile?.id) return toast.error('יש להתחבר כדי להפעיל התראות');
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || typeof Notification === 'undefined') {
      return toast.error('הדפדפן הזה אינו תומך בהתראות Push');
    }

    setReminderBusy(true);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      if (!next) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await supabase.from('push_subscriptions').delete().eq('user_id', profile.id).eq('endpoint', subscription.endpoint);
          await subscription.unsubscribe();
        }
        await supabase.from('user_profiles').update({ push_reminders_enabled: false }).eq('id', profile.id);
        setRemindersEnabled(false);
        toast.success('התראת התורנות בוטלה');
        return;
      }

      const permission = Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
      if (permission !== 'granted') return toast.error('כדי לקבל התראה יש לאפשר התראות בדפדפן');

      const configResponse = await fetch('/api/push/config', { cache: 'no-store' });
      const config = await configResponse.json() as { publicKey?: string; error?: string };
      if (!configResponse.ok || !config.publicKey) {
        return toast.error('חיבור ההתראות עדיין לא הוגדר במערכת. יש להוסיף VAPID public key ב-Vercel.');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(config.publicKey),
      });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        return toast.error('הדפדפן לא החזיר פרטי מנוי תקינים');
      }

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: profile.id,
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,endpoint' });
      if (error) throw error;
      await supabase.from('user_profiles').update({ push_reminders_enabled: true }).eq('id', profile.id);
      setRemindersEnabled(true);
      toast.success('התראה יום לפני התורנות הופעלה');
    } catch (error) {
      console.error('Push subscription error', error);
      toast.error('שמירת מנוי ההתראות נכשלה. נסה שוב.');
    } finally {
      setReminderBusy(false);
    }
  };

  useEffect(() => {
    if (!remindersEnabled || typeof Notification === 'undefined' || Notification.permission !== 'granted' || !profile?.id) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowRoster = generateMonthlyRoster(tomorrow.getFullYear(), tomorrow.getMonth())[tomorrow.getDate() - 1];
    if (!tomorrowRoster) return;
    const isMine = tomorrowRoster.memberA.email.toLowerCase() === profile.email.toLowerCase() || tomorrowRoster.memberB.email.toLowerCase() === profile.email.toLowerCase();
    const key = `asiriya.connection-duty.notified.${tomorrow.toISOString().slice(0, 10)}`;
    if (isMine && window.localStorage.getItem(key) !== 'true') {
      void navigator.serviceWorker.ready.then((registration) => registration.showNotification('מחר תורנות החיבור שלך', { body: `${tomorrowRoster.memberA.displayName} ו־${tomorrowRoster.memberB.displayName}`, dir: 'rtl', lang: 'he', data: { url: '/connection-duties' } }));
      window.localStorage.setItem(key, 'true');
    }
  }, [profile?.id, remindersEnabled]);

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

      <div className="bg-card border border-border rounded-xl p-4 card-shadow mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${remindersEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {remindersEnabled ? <Bell size={18} /> : <BellOff size={18} />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">התראה יום לפני תורנות החיבור</p>
            <p className="text-xs text-muted-foreground">קבל התראה בדפדפן כשמחר תורך</p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={remindersEnabled} disabled={reminderBusy} onClick={() => void toggleDutyReminder()} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${remindersEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${remindersEnabled ? 'translate-x-1' : 'translate-x-6'}`} />
        </button>
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
