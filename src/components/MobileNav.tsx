'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  Home,
  Users,
  CalendarDays,
  RotateCcw,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  Trophy,
  X,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'בית', icon: Home },
  { href: '/class-schedule-attendance', label: 'לו״ז', icon: CalendarDays },
  { href: '/members', label: 'חברים', icon: Users },
  { href: '/connection-duties', label: 'תורנים', icon: RotateCcw },
  { href: '/profile', label: 'פרופיל אישי', icon: User },
  { href: '/score', label: 'ניקוד', icon: Trophy },
  { href: '/settings', label: 'הגדרות', icon: Settings },
];

interface MobileNavProps {
  activeRoute?: string;
}

export default function MobileNav({ activeRoute }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const { signOut, profile, user, isAdmin } = useAuth();
  const router = useRouter();

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'PT100';
  const initials = displayName.charAt(0).toUpperCase();
  const items = isAdmin
    ? [...NAV_ITEMS, { href: '/admin/members', label: 'ניהול חברים', icon: ShieldCheck }]
    : NAV_ITEMS;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // The local session is cleared even if the remote sign-out request fails.
    } finally {
      router.replace('/sign-up-login-screen');
      router.refresh();
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-bold text-foreground text-base">PT100</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-foreground hover:bg-muted transition-colors"
          aria-label="פתיחת תפריט"
          aria-expanded={open}
        >
          <Menu size={24} />
        </button>
      </header>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="סגירת תפריט"
          />
          <aside
            dir="rtl"
            className="fixed right-0 top-0 bottom-0 z-50 w-[min(88vw,320px)] bg-card border-l border-border shadow-2xl flex flex-col"
            role="dialog"
            aria-label="תפריט ניווט"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <AppLogo size={30} />
                <span className="font-bold text-foreground">PT100</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                aria-label="סגור תפריט"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground">PT100{isAdmin ? ' · Admin' : ''}</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.href;
                return (
                  <Link
                    key={`mobile-nav-${item.href}`}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={19} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="px-3 py-4 border-t border-border">
              <button onClick={handleSignOut} className="nav-item text-destructive hover:bg-destructive/5 w-full">
                <LogOut size={19} className="flex-shrink-0" />
                <span>התנתקות</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
