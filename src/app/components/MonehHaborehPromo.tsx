'use client';

import React from 'react';
import { ArrowUpLeft, Sparkles } from 'lucide-react';

const MONEH_HABOREH_URL = 'https://symphonious-lolly-6cfc60.netlify.app/';

export default function MonehHaborehPromo() {
  return (
    <section
      aria-labelledby="moneh-haboreh-title"
      className="relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-l from-amber-50 via-white to-orange-50 p-4 shadow-sm dark:border-amber-900/50 dark:from-amber-950/40 dark:via-card dark:to-orange-950/30"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-amber-200/30 blur-2xl dark:bg-amber-700/20"
      />
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
            <Sparkles aria-hidden="true" size={19} strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              כלי קטן לדרך
            </p>
            <h2 id="moneh-haboreh-title" className="text-base font-bold text-foreground">
              מונה הבורא
            </h2>
            <p className="mt-0.5 max-w-[34rem] text-xs leading-5 text-muted-foreground sm:text-sm">
              מקום אישי למעקב, התבוננות ותפילה — כדי לעצור לרגע ולהתחבר למה שחשוב.
            </p>
          </div>
        </div>
        <a
          href={MONEH_HABOREH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 sm:px-4 sm:text-sm"
        >
          <span>להיכנס לאתר</span>
          <ArrowUpLeft aria-hidden="true" size={15} />
        </a>
      </div>
    </section>
  );
}
