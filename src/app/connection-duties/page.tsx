'use client';
import React, { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { MEMBERS, getInitials, getAvatarColor } from '@/data/members';
import { ChevronRight, ChevronLeft, Calendar, Bell, BellOff, HeartHandshake, Edit3, Check, X, Clock3, UserRound } from 'lucide-react';
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
  isoDate: string;
  date: string;
  weekday: string;
  memberA: typeof MEMBERS[0];
  memberB: typeof MEMBERS[0];
  indexA: number;
  indexB: number;
}

type SwapStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';
type MemberProfile = { id: string; email: string; profile_id: number | null; display_name: string };
type DutyApiRow = { duty_date: string; member1: MemberProfile | null; member2: MemberProfile | null; is_manual_override: boolean };
type SwapRequest = {
  id: string;
  duty_date: string;
  requested_by: string;
  requested_to: string;
  status: SwapStatus;
  requester: MemberProfile | null;
  recipient: MemberProfile | null;
};

const WEEKDAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateMonthlyRoster(year: number, month: number): DutyPair[] {
  const members = [...MEMBERS];
  const allPairs: [number, number][] = [];
  for (let i = 0; i < members.length; i += 1) for (let j = i + 1; j < members.length; j += 1) allPairs.push([i, j]);
  const seed = year * 100 + month;
  const shuffled = [...allPairs].sort((a, b) => (((a[0] * 31 + a[1]) * seed) % 997) - (((b[0] * 31 + b[1]) * seed) % 997));
  let previousPair: [number, number] | null = null;
  return Array.from({ length: getDaysInMonth(year, month) }, (_, offset) => {
    const day = offset + 1;
    const date = new Date(year, month, day);
    const candidates = shuffled.filter(([a, b]) => !previousPair || (!previousPair.includes(a) && !previousPair.includes(b)));
    const [iA, iB] = (candidates.length ? candidates : shuffled)[offset % (candidates.length ? candidates.length : shuffled.length)];
    previousPair = [iA, iB];
    return { day, isoDate: dateKey(year, month, day), date: `${day}/${month + 1}/${year}`, weekday: WEEKDAYS_HE[date.getDay()], memberA: members[iA], memberB: members[iB], indexA: iA, indexB: iB };
  });
}

function AvatarBadge({ name, index, highlight = false }: { name: string; index: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${highlight ? 'font-bold' : ''}`}>
      <div className={`w-8 h-8 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{getInitials(name)}</div>
      <span className="text-sm font-medium text-foreground">{name}</span>
    </div>
  );
}

function statusText(status: SwapStatus) {
  if (status === 'accepted') return 'החלפה אושרה';
  if (status === 'rejected') return 'החלפה נדחתה';
  if (status === 'cancelled') return 'הבקשה בוטלה';
  return 'ממתין לאישור';
}

export default function ConnectionDutiesPage() {
  const now = new Date();
  const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(now);
  const anchorDate = '2026-09-29';
  const dateFromIso = (iso: string) => new Date(`${iso}T12:00:00Z`);
  const addDays = (iso: string, days: number) => { const date = dateFromIso(iso); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
  const periodStartFor = (iso: string) => { const diff = Math.floor((dateFromIso(iso).getTime() - dateFromIso(anchorDate).getTime()) / 86400000); return addDays(anchorDate, Math.floor(diff / 14) * 14); };
  const [periodStart, setPeriodStart] = useState(() => periodStartFor(todayIso));
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Record<number, string>>({});
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [swapBusy, setSwapBusy] = useState<string | number | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<MemberProfile[]>([]);
  const [savedDuties, setSavedDuties] = useState<DutyApiRow[]>([]);
  const { profile } = useAuth();

  const roster = useMemo(() => {
    if (!savedDuties.length) return [];
      return savedDuties.map((duty, index) => {
        const date = new Date(`${duty.duty_date}T12:00:00`);
      const memberA = duty.member1 ? { ...MEMBERS.find((member) => member.email.toLowerCase() === duty.member1!.email.toLowerCase()), ...duty.member1, profileId: duty.member1.profile_id ?? 0, displayName: duty.member1.display_name } as typeof MEMBERS[0] : MEMBERS[0];
      const memberB = duty.member2 ? { ...MEMBERS.find((member) => member.email.toLowerCase() === duty.member2!.email.toLowerCase()), ...duty.member2, profileId: duty.member2.profile_id ?? 0, displayName: duty.member2.display_name } as typeof MEMBERS[0] : MEMBERS[1];
      return { day: index + 1, isoDate: duty.duty_date, date: `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`, weekday: WEEKDAYS_HE[date.getDay()], memberA, memberB, indexA: index % 12, indexB: (index + 1) % 12 };
    });
  }, [savedDuties]);
  const periodEnd = addDays(periodStart, 13);
  const periodLabel = `${roster[0]?.date || periodStart} – ${roster[roster.length - 1]?.date || periodEnd}`;
  const todayRow = roster.find((row) => row.isoDate === todayIso);
  const profileByEmail = useMemo(() => new Map(memberProfiles.map((item) => [item.email.toLowerCase(), item])), [memberProfiles]);

  const loadSwapRequests = async () => {
    const response = await fetch(`/api/connection-duty-swaps?start=${periodStart}&end=${periodEnd}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { requests?: SwapRequest[] };
    setSwapRequests(data.requests || []);
  };

  useEffect(() => {
    void supabase.from('user_profiles').select('id,email,profile_id,display_name').then(({ data }) => setMemberProfiles((data || []) as MemberProfile[]));
  }, []);

  useEffect(() => {
      void fetch(`/api/connection-duties?start=${periodStart}&end=${periodEnd}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() as Promise<{ duties?: DutyApiRow[] }> : { duties: [] })
      .then((data) => setSavedDuties(data.duties || []))
      .catch(() => setSavedDuties([]));
  }, [periodStart, periodEnd]);

  useEffect(() => { void loadSwapRequests(); }, [periodStart, periodEnd, profile?.id]);

  useEffect(() => {
    if (!profile?.id) return undefined;
    const refresh = () => { void loadSwapRequests(); };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [periodStart, periodEnd, profile?.id]);

  useEffect(() => {
    const incoming = swapRequests.find((request) => request.requested_to === profile?.id && request.status === 'pending');
    if (!incoming || typeof window === 'undefined') return;
    const notificationKey = `asiriya.swap-notified.${incoming.id}`;
    if (window.localStorage.getItem(notificationKey) === 'true') return;
    const requesterName = incoming.requester?.display_name || 'חבר';
    toast.info(`${requesterName} מבקש להחליף איתך תורנות`, { description: 'פתח את השורה המתאימה כדי לאשר או לסרב.' });
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.ready.then((registration) => registration.showNotification('בקשת החלפה חדשה', { body: `${requesterName} מבקש להחליף איתך את תורנות החיבור`, dir: 'rtl', lang: 'he', tag: `duty-swap-${incoming.id}`, data: { url: '/connection-duties' } }));
    }
    window.localStorage.setItem(notificationKey, 'true');
  }, [swapRequests, profile?.id]);

  useEffect(() => {
    let cancelled = false;
    const loadPushState = async () => {
      if (!profile?.id || !('serviceWorker' in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (!('pushManager' in registration)) return;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription || cancelled) return;
        const { data } = await supabase.from('push_subscriptions').select('id').eq('user_id', profile.id).eq('endpoint', subscription.endpoint).limit(1);
        if (!cancelled) setRemindersEnabled(Boolean(data?.length));
      } catch { /* surfaced when the user enables the toggle */ }
    };
    void loadPushState();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const toggleDutyReminder = async () => {
    const next = !remindersEnabled;
    if (!profile?.id) return toast.error('יש להתחבר כדי להפעיל התראות');
    if (!window.isSecureContext) return toast.error('התראות דורשות אתר מאובטח ב־HTTPS');
    if (!('serviceWorker' in navigator) || typeof Notification === 'undefined') return toast.error('הדפדפן הזה אינו תומך בהתראות מערכת');
    setReminderBusy(true);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      if (!('pushManager' in registration)) return toast.error('הדפדפן הזה אינו תומך בהתראות Push. נסה לפתוח את האתר בדפדפן נתמך.');
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
      const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
      if (permission !== 'granted') return toast.error('כדי לקבל התראות יש לאפשר הרשאות התראה בהגדרות המכשיר או הדפדפן');
      const configResponse = await fetch('/api/push/config', { cache: 'no-store' });
      const config = await configResponse.json() as { publicKey?: string };
      if (!configResponse.ok || !config.publicKey) return toast.error('חיבור ההתראות עדיין לא הוגדר במערכת.');
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToArrayBuffer(config.publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return toast.error('הדפדפן לא החזיר פרטי מנוי תקינים');
      const { error } = await supabase.from('push_subscriptions').upsert({ user_id: profile.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent, updated_at: new Date().toISOString() }, { onConflict: 'user_id,endpoint' });
      if (error) throw error;
      await supabase.from('user_profiles').update({ push_reminders_enabled: true }).eq('id', profile.id);
      setRemindersEnabled(true);
      toast.success('התראות החיבור הופעלו במכשיר');
    } catch (error) {
      console.error('Push subscription error', error);
      toast.error(error instanceof DOMException && error.name === 'NotAllowedError' ? 'הרשאת ההתראות נחסמה בהגדרות המכשיר או הדפדפן.' : 'שמירת מנוי ההתראות נכשלה.');
    } finally { setReminderBusy(false); }
  };

  const getEffectivePair = (row: DutyPair) => {
    const accepted = swapRequests.find((request) => request.status === 'accepted' && request.duty_date === row.isoDate);
    if (!accepted) return { memberA: row.memberA, memberB: row.memberB, indexA: row.indexA, indexB: row.indexB };
    const replacement = memberProfiles.find((item) => item.id === accepted.requested_to);
    const replacementIndex = replacement?.profile_id == null ? -1 : MEMBERS.findIndex((member) => member.profileId === replacement.profile_id);
    const replacementMember = replacement ? { ...row.memberA, email: replacement.email, profileId: replacement.profile_id ?? row.memberA.profileId, displayName: replacement.display_name } : row.memberA;
    if (accepted.requested_by === profileByEmail.get(row.memberA.email.toLowerCase())?.id) return { memberA: replacement ? replacementMember : row.memberA, memberB: row.memberB, indexA: replacementIndex >= 0 ? replacementIndex : row.indexA, indexB: row.indexB };
    const replacementMemberB = replacement ? { ...row.memberB, email: replacement.email, profileId: replacement.profile_id ?? row.memberB.profileId, displayName: replacement.display_name } : row.memberB;
    return { memberA: row.memberA, memberB: replacement ? replacementMemberB : row.memberB, indexA: row.indexA, indexB: replacementIndex >= 0 ? replacementIndex : row.indexB };
  };

  const createSwapRequest = async (row: DutyPair, targetId: string) => {
    setSwapBusy(row.day);
    const response = await fetch('/api/connection-duty-swaps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', dutyDate: row.isoDate, requestedTo: targetId }) });
    const data = await response.json() as { error?: string; push?: { reason?: string } };
    setSwapBusy(null);
    if (!response.ok) return toast.error(data.error === 'pending_request_exists' ? 'כבר קיימת בקשת החלפה שממתינה לאישור.' : 'לא ניתן ליצור את בקשת ההחלפה.');
    setEditingDay(null);
    setSelectedTarget((previous) => ({ ...previous, [row.day]: '' }));
    await loadSwapRequests();
    if (data.push?.reason === 'recipient_has_no_subscription') toast.warning('הבקשה נשלחה, אבל לחבר אין כרגע מנוי התראות פעיל באייפון.');
    else toast.success('בקשת ההחלפה נשלחה לחבר');
  };

  const respondToSwap = async (request: SwapRequest, status: 'accepted' | 'rejected') => {
    setSwapBusy(request.id);
    const response = await fetch('/api/connection-duty-swaps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'respond', requestId: request.id, status }) });
    setSwapBusy(null);
    if (!response.ok) return toast.error('לא ניתן לעדכן את בקשת ההחלפה.');
    await loadSwapRequests();
    toast.success(status === 'accepted' ? 'ההחלפה אושרה' : 'ההחלפה נדחתה');
  };

  function previousPeriod() { setPeriodStart((value) => addDays(value, -14)); }
  function nextPeriod() { setPeriodStart((value) => addDays(value, 14)); }
  function goToday() { setPeriodStart(periodStartFor(todayIso)); }

  return (
    <AppLayout activeRoute="/connection-duties">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1"><div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><HeartHandshake size={20} className="text-primary" /></div><h1 className="text-2xl font-bold text-foreground">סידור תורני חיבור</h1></div>
        <p className="text-muted-foreground text-sm mr-12">כל יום שני חברים מתחברים ומחזקים את כולם</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 card-shadow mb-5 flex items-center justify-between">
        <button onClick={previousPeriod} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="המחזור הקודם"><ChevronRight size={20} className="text-muted-foreground" /></button>
        <div className="text-center"><p className="font-bold text-foreground text-lg">סידור לשבועיים</p><p className="text-xs text-muted-foreground">{periodLabel} · {roster.length || 14} ימים</p></div>
        <button onClick={nextPeriod} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="המחזור הבא"><ChevronLeft size={20} className="text-muted-foreground" /></button>
      </div>

      <div className={`mb-5 rounded-2xl border p-4 transition-all ${todayRow ? 'border-primary/40 bg-gradient-to-l from-primary/15 via-primary/5 to-card shadow-lg shadow-primary/10' : 'border-border bg-card'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${todayRow ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}><Calendar size={21} /></div><div><p className="text-xs font-bold text-primary uppercase tracking-wide">תורנות היום</p><p className="text-sm font-bold text-foreground">{todayRow ? `${todayRow.memberA.displayName} + ${todayRow.memberB.displayName}` : 'היום נמצא במחזור אחר'}</p></div></div>
          <button onClick={goToday} className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3"><Calendar size={14} /> היום</button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 card-shadow mb-5 flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${remindersEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{remindersEnabled ? <Bell size={18} /> : <BellOff size={18} />}</div><div><p className="text-sm font-semibold text-foreground">התראות תורנות</p><p className="text-xs text-muted-foreground">קבל הודעה כשמחר תורך או כשמישהו מבקש החלפה</p></div></div><button type="button" role="switch" aria-checked={remindersEnabled} disabled={reminderBusy} onClick={() => void toggleDutyReminder()} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${remindersEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${remindersEnabled ? 'translate-x-1' : 'translate-x-6'}`} /></button></div>

      <div className="bg-card border border-border rounded-xl card-shadow overflow-hidden"><div className="grid grid-cols-[auto_1fr_1fr_auto] text-xs font-semibold text-muted-foreground bg-muted/50 px-4 py-3 border-b border-border"><div className="w-20">תאריך</div><div className="px-4">חבר א׳</div><div className="px-4">חבר ב׳</div><div className="w-8" /></div>
        <div className="divide-y divide-border">{roster.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">הסידור למחזור הזה עדיין לא נוצר. הוא יתעדכן אוטומטית ביום שלישי.</div> : roster.map((row) => {
          const isToday = row.isoDate === todayIso;
          const rowDate = row.isoDate;
          const pair = getEffectivePair(row);
          const currentEmail = profile?.email?.toLowerCase();
          const currentProfileIsDuty = currentEmail === pair.memberA.email.toLowerCase() || currentEmail === pair.memberB.email.toLowerCase();
          const pendingOutgoing = swapRequests.find((request) => request.duty_date === rowDate && request.requested_by === profile?.id && request.status === 'pending');
          const pendingIncoming = swapRequests.find((request) => request.duty_date === rowDate && request.requested_to === profile?.id && request.status === 'pending');
          const isEditing = editingDay === row.day;
          const candidates = memberProfiles.filter((candidateProfile) => candidateProfile.email.toLowerCase() !== pair.memberA.email.toLowerCase() && candidateProfile.email.toLowerCase() !== pair.memberB.email.toLowerCase() && candidateProfile.id !== profile?.id);
          return <div key={row.day} className={isToday ? 'bg-primary/[0.04]' : ''}>
            <div className={`grid grid-cols-[auto_1fr_1fr_auto] items-center px-4 py-3 transition-colors ${isToday ? 'border-r-4 border-primary bg-primary/10' : 'hover:bg-muted/30'}`}>
              <div className="w-20"><p className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>{row.date.split('/').slice(0, 2).join('/')}</p><p className="text-2xs text-muted-foreground">{row.weekday}</p>{isToday && <span className="inline-flex mt-1 text-[10px] font-bold text-primary bg-primary/15 rounded-full px-2 py-0.5">היום</span>}</div>
              <div className="px-4"><AvatarBadge name={pair.memberA.displayName} index={pair.indexA} highlight={isToday} /></div><div className="px-4"><AvatarBadge name={pair.memberB.displayName} index={pair.indexB} highlight={isToday} /></div>
              <div className="w-8 flex justify-center">{currentProfileIsDuty && !pendingOutgoing && <button onClick={() => setEditingDay(isEditing ? null : row.day)} className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-primary/15 text-primary' : 'hover:bg-muted'}`} aria-label="בקש החלפה"><Edit3 size={14} className={isEditing ? 'text-primary' : 'text-muted-foreground'} /></button>}</div>
            </div>
            {(pendingOutgoing || pendingIncoming || isEditing) && <div className="px-4 pb-3 space-y-2">
              {pendingOutgoing && <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800"><Clock3 size={14} /><span>ממתין לאישור של {pendingOutgoing.recipient?.display_name || 'החבר שנבחר'}</span></div>}
              {pendingIncoming && <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2"><div className="flex items-center gap-2 text-sm font-semibold"><UserRound size={15} className="text-primary" />{pendingIncoming.requester?.display_name || 'חבר'} מבקש להחליף איתך את תורנות {rowDate}</div><div className="flex gap-2"><button disabled={swapBusy === pendingIncoming.id} onClick={() => void respondToSwap(pendingIncoming, 'accepted')} className="btn-primary text-xs py-1.5 px-3"><Check size={13} /> אישור</button><button disabled={swapBusy === pendingIncoming.id} onClick={() => void respondToSwap(pendingIncoming, 'rejected')} className="btn-ghost text-xs py-1.5 px-3"><X size={13} /> סירוב</button></div></div>}
              {isEditing && currentProfileIsDuty && !pendingOutgoing && <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-3"><div><p className="text-sm font-bold text-foreground">החלפה עם חבר</p><p className="text-xs text-muted-foreground mt-0.5">בחר חבר אחר. הוא יקבל התראה ויחליט אם לאשר.</p></div><select className="input-field text-sm" value={selectedTarget[row.day] || ''} onChange={(event) => setSelectedTarget((previous) => ({ ...previous, [row.day]: event.target.value }))}><option value="">בחר חבר להחלפה</option>{candidates.map((candidateProfile) => <option key={candidateProfile.id} value={candidateProfile.id}>{candidateProfile.display_name}</option>)}</select><div className="flex gap-2"><button disabled={!selectedTarget[row.day] || swapBusy === row.day} onClick={() => void createSwapRequest(row, selectedTarget[row.day])} className="btn-primary text-xs py-1.5 px-3">שלח בקשה</button><button onClick={() => setEditingDay(null)} className="btn-ghost text-xs py-1.5 px-3">ביטול</button></div></div>}
            </div>}
          </div>;
        })}</div>
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary/20 border-r-2 border-primary" /><span>היום</span></div><div className="flex items-center gap-2"><Edit3 size={12} /><span>עיפרון מופיע רק בתורנות שלך</span></div></div>
    </AppLayout>
  );
}
