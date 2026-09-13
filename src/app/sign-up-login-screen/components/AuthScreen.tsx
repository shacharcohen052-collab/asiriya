'use client';
import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import AppLogo from '@/components/ui/AppLogo';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row" dir="rtl">
      {/* Brand panel — left on desktop */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-[-40px] w-32 h-32 rounded-full bg-white/5" />

        <div className="relative z-10 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-white/15 flex items-center justify-center">
              <AppLogo size={56} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">PT100</h1>
          <p className="text-white/75 text-base leading-relaxed max-w-xs">
            המרחב הדיגיטלי של PT100 — שיעורים, תורנויות, ומעקב אישי במקום אחד.
          </p>

          <div className="mt-10 space-y-4 text-right">
            {[
              'ראה מה קורה היום בשנייה',
              'תכנון הגעה בלי לחץ',
              'עקוב אחר ההתקדמות שלך',
            ].map((item) => (
              <div key={`feature-${item}`} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <span className="text-white/85 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile top strip */}
      <div className="lg:hidden bg-primary px-6 py-8 flex items-center gap-4">
        <AppLogo size={40} />
        <div>
          <h1 className="text-xl font-bold text-white">PT100</h1>
          <p className="text-white/70 text-xs">המרחב הדיגיטלי שלך</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1 mb-7">
            {(['login', 'signup'] as const).map((tab) => (
              <button
                key={`auth-tab-${tab}`}
                onClick={() => setMode(tab)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  mode === tab
                    ? 'bg-card text-foreground card-shadow'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab === 'login' ? 'התחברות' : 'הרשמה'}
              </button>
            ))}
          </div>

          {mode === 'login' ? (
            <LoginForm onSwitchToSignup={() => setMode('signup')} />
          ) : (
            <SignupForm onSwitchToLogin={() => setMode('login')} />
          )}

          {/* Info notice */}
          <div className="mt-6 p-4 bg-fixed-meeting-bg border border-primary/20 rounded-xl">
            <p className="text-xs text-primary font-semibold mb-1">חברי PT100 בלבד</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              הגישה מוגבלת לחברי PT100 מאושרים. אם אינך יכול להתחבר, פנה למנהל הקבוצה.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}