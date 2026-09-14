'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock3, LogOut, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function MemberAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-up-login-screen');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4" aria-busy="true">
        <div className="flex flex-col items-center gap-3 text-center text-muted-foreground">
          <Loader2 size={28} className="animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm">טוענים את המרחב...</p>
          <p className="text-xs">אם המסך לא נטען, נסה לרענן את הדף.</p>
        </div>
      </main>
    );
  }

  if (!profile || profile.is_approved !== true) {
    return (
      <main dir="rtl" className="flex min-h-screen items-center justify-center bg-background px-4">
        <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Clock3 size={27} aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-foreground">ההרשמה התקבלה</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            החשבון נוצר בהצלחה. מנהל PT100 צריך לאשר את הכניסה שלך לפני שתוכל לראות את תוכן הקבוצה.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">לאחר האישור, רענן את המסך כדי להיכנס.</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
            <button onClick={() => refreshProfile()} className="btn-primary flex-1">
              <RefreshCw size={16} aria-hidden="true" />
              בדוק אישור
            </button>
            <button onClick={() => signOut()} className="btn-secondary flex-1">
              <LogOut size={16} aria-hidden="true" />
              התנתק
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
