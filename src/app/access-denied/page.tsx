'use client';
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ShieldX, Mail, LogOut } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

export default function AccessDeniedPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router?.push('/sign-up-login-screen');
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <AppLogo size={56} />
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX size={40} className="text-destructive" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          אין לך גישה ל-PT100
        </h1>

        {/* Subtitle */}
        <p className="text-muted-foreground text-base mb-2">
          כתובת האימייל שלך לא נמצאת ברשימת החברים המאושרים.
        </p>

        {/* Email display */}
        {user?.email && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-lg mb-6">
            <Mail size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground font-medium">{user?.email}</span>
          </div>
        )}

        {/* Explanation */}
        <div className="bg-card border border-border rounded-xl p-5 mb-6 text-right">
          <p className="text-sm text-foreground font-semibold mb-2">מה לעשות?</p>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">1.</span>
              <span>ודא שהשתמשת באימייל שאיתו נרשמת לקבוצת PT100.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">2.</span>
              <span>אם האימייל נכון — פנה למנהל הקבוצה לאישור הגישה שלך.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">3.</span>
              <span>לאחר אישור המנהל, התחבר מחדש עם אותו אימייל.</span>
            </li>
          </ul>
        </div>

        {/* Contact admin button */}
        <a
          href="mailto:shachar.cohen052@gmail.com?subject=בקשת גישה ל-PT100&body=שלום, אני מבקש גישה לאפליקציית PT100. כתובת האימייל שלי: "
          className="btn-primary w-full flex items-center justify-center gap-2 py-3 mb-3"
        >
          <Mail size={18} />
          <span>פנה למנהל לאישור גישה</span>
        </a>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="btn-ghost w-full flex items-center justify-center gap-2 py-3 text-muted-foreground"
        >
          <LogOut size={18} />
          <span>התנתק ונסה עם אימייל אחר</span>
        </button>
      </div>
    </div>
  );
}
