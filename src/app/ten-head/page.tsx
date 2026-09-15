'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import { UsersRound, Construction } from 'lucide-react';

export default function TenHeadPage() {
  return (
    <AppLayout activeRoute="/ten-head">
      <section className="space-y-5" dir="rtl">
        <header>
          <h1 className="text-2xl font-bold text-foreground">ראש עשירייה</h1>
          <p className="mt-1 text-sm text-muted-foreground">מרחב העבודה של ראש העשירייה</p>
        </header>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UsersRound size={28} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-foreground">ראש עשירייה</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            המסך הזה מוכן להמשך הפיתוח. בהמשך נבנה כאן את הכלים, המשימות והמעקב של ראש העשירייה.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-xs font-semibold text-muted-foreground">
            <Construction size={14} /> בקרוב
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
