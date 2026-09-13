'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, ShieldAlert, UserMinus, Users } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  is_approved: boolean;
  is_removed: boolean;
  role: 'member' | 'admin';
  created_at: string;
};

export default function AdminMembersPage() {
  const { isAdmin, profile } = useAuth();
  const supabase = createClient();
  const [pending, setPending] = useState<MemberRow[]>([]);
  const [active, setActive] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadMembers = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('user_profiles')
      .select('id, email, display_name, is_approved, is_removed, role, created_at')
      .order('created_at', { ascending: true });
    if (queryError) setError('לא ניתן לטעון את רשימת החברים.');
    else {
      const rows = (data || []) as MemberRow[];
      setPending(rows.filter((row) => !row.is_approved && !row.is_removed));
      setActive(rows.filter((row) => row.is_approved && !row.is_removed));
    }
    setLoading(false);
  }, [isAdmin, supabase]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const approve = async (id: string) => {
    setActionId(id);
    setError('');
    const { error: actionError } = await supabase.rpc('approve_pt100_member', { p_profile_id: id });
    if (actionError) setError('האישור נכשל. נסה שוב.');
    else await loadMembers();
    setActionId(null);
  };

  const remove = async (id: string) => {
    if (!window.confirm('להסיר את החבר מ-PT100? ההיסטוריה תישמר, אך הגישה תבוטל.')) return;
    setActionId(id);
    setError('');
    const { error: actionError } = await supabase.rpc('remove_pt100_member', { p_profile_id: id });
    if (actionError) setError('ההסרה נכשלה. נסה שוב.');
    else await loadMembers();
    setActionId(null);
  };

  const setAdmin = async (member: MemberRow) => {
    setActionId(member.id);
    setError('');
    const { error: actionError } = await supabase.rpc('set_pt100_admin', {
      p_profile_id: member.id,
      p_is_admin: member.role !== 'admin',
    });
    if (actionError) setError('עדכון הרשאת Admin נכשל.');
    else await loadMembers();
    setActionId(null);
  };

  if (!isAdmin) {
    return <AppLayout activeRoute="/admin/members"><div className="py-16 text-center text-muted-foreground">אין לך הרשאת Admin.</div></AppLayout>;
  }

  const MemberLine = ({ member, pendingMember = false }: { member: MemberRow; pendingMember?: boolean }) => (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{member.display_name || 'ללא שם'}</p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {pendingMember && (
          <button disabled={actionId === member.id} onClick={() => approve(member.id)} className="btn-primary px-3 py-2 text-xs">
            {actionId === member.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            אישור כניסה
          </button>
        )}
        {member.id !== profile?.id && (
          <>
            {!pendingMember && <button disabled={actionId === member.id} onClick={() => setAdmin(member)} className="btn-secondary px-3 py-2 text-xs">
              {member.role === 'admin' ? 'ביטול Admin' : 'הפוך ל-Admin'}
            </button>}
            <button disabled={actionId === member.id} onClick={() => remove(member.id)} className="btn-secondary px-3 py-2 text-xs text-destructive">
              {actionId === member.id ? <Loader2 size={15} className="animate-spin" /> : <UserMinus size={15} />}
              הסרה
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <AppLayout activeRoute="/admin/members">
      <div className="space-y-6">
        <header>
          <div className="flex items-center gap-2"><ShieldAlert size={22} className="text-primary" /><h1 className="text-2xl font-bold text-foreground">ניהול חברי PT100</h1></div>
          <p className="mt-1 text-sm text-muted-foreground">אשר חברים חדשים והסר מי שאינו צריך להישאר בקבוצה.</p>
        </header>
        {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
        {loading ? <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div> : (
          <>
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-base font-bold"><Users size={17} />ממתינים לאישור ({pending.length})</h2>
              {pending.length ? pending.map((member) => <MemberLine key={member.id} member={member} pendingMember />) : <p className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">אין חברים שממתינים לאישור.</p>}
            </section>
            <section className="space-y-3">
              <h2 className="text-base font-bold">חברים פעילים ({active.length})</h2>
              {active.map((member) => <MemberLine key={member.id} member={member} />)}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
