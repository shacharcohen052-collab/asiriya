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
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';


// Bottom navigation tabs: בית | לו״ז | חברים | תורנים | עוד
const BOTTOM_TABS = [
  { href: '/', label: 'בית', icon: Home },
  { href: '/class-schedule-attendance', label: 'לו״ז', icon: CalendarDays },
  { href: '/members', label: 'חברים', icon: Users },
  { href: '/connection-duties', label: 'תורנים', icon: RotateCcw },
];

// "עוד" drawer items
const MORE_ITEMS = [
  { href: '/profile', label: 'פרופיל אישי', icon: User },
  { href: '/score', label: 'ניקוד', icon: Trophy },
  { href: '/settings', label: 'הגדרות', icon: Settings },
];

interface MobileNavProps {
  activeRoute?: string;
}

export default function MobileNav({ activeRoute }: MobileNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const { signOut, profile, isAdmin } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/sign-up-login-screen');
    } catch {}
  };

  const displayName = profile?.display_name || 'PT100';
  const initials = displayName.charAt(0).toUpperCase();
  const moreItems = isAdmin
    ? [...MORE_ITEMS, { href: '/admin/members', label: 'ניהול חברים', icon: ShieldCheck }]
    : MORE_ITEMS;

  return (
    <>
      {/* Top bar (mobile only) */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-bold text-foreground text-base">PT100</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          {initials}
        </div>
      </header>

      {/* Bottom navigation bar (mobile only) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-stretch">
          {BOTTOM_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRoute === tab.href;
            return (
              <Link
                key={`bottom-tab-${tab.href}`}
                href={tab.href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
                  isActive
                    ? 'text-primary' :'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className={`text-2xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* עוד tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors ${
              moreOpen ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MoreHorizontal size={22} strokeWidth={moreOpen ? 2.5 : 1.8} />
            <span className="text-2xs font-medium">עוד</span>
          </button>
        </div>
      </nav>

      {/* "עוד" bottom sheet overlay */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <span className="font-bold text-foreground">עוד</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="סגור"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* User info */}
            <div className="px-5 py-3 border-b border-border">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">PT100</p>
                </div>
              </div>
            </div>

            <div className="px-3 py-3 space-y-0.5">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.href;
                return (
                  <Link
                    key={`more-item-${item.href}`}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMoreOpen(false)}
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="px-3 py-3 border-t border-border">
              <button
                onClick={handleSignOut}
                className="nav-item text-destructive hover:bg-red-50 w-full"
              >
                <LogOut size={18} className="flex-shrink-0" />
                <span>התנתקות</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
