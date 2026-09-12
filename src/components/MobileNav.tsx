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
  LogOut,
  Trophy,
  Upload,
  X,
  Menu,
} from 'lucide-react';
import Icon from '@/components/ui/AppIcon';


const navGroups = [
  {
    label: 'ראשי',
    items: [
      { href: '/', label: 'מסך הבית', icon: Home },
      { href: '/class-schedule-attendance', label: 'לו"ז ונוכחות', icon: CalendarDays },
    ],
  },
  {
    label: 'העשירייה',
    items: [
      { href: '/members', label: 'חברי העשירייה', icon: Users },
      { href: '/connection-duties', label: 'סידור תורני חיבור', icon: RotateCcw },
      { href: '/import-profiles', label: 'ייבוא פרופילים', icon: Upload },
    ],
  },
  {
    label: 'אישי',
    items: [
      { href: '/profile', label: 'פרופיל אישי', icon: User },
      { href: '/score', label: 'ניקוד ומובילים', icon: Trophy },
      { href: '/settings', label: 'הגדרות', icon: Settings },
    ],
  },
];

interface MobileNavProps {
  activeRoute?: string;
}

export default function MobileNav({ activeRoute }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border sticky top-0 z-20">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="פתח תפריט"
        >
          <Menu size={22} className="text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-bold text-foreground text-base">מרחב העשירייה</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
          ש
        </div>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-card z-50 lg:hidden flex flex-col transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <AppLogo size={32} />
            <span className="font-bold text-foreground">מרחב העשירייה</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="סגור תפריט"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
              ש
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">שחר כהן</p>
              <p className="text-xs text-muted-foreground">עשירייה ב׳</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navGroups.map((group) => (
            <div key={`mob-group-${group.label}`}>
              <p className="text-2xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeRoute === item.href;
                  return (
                    <Link
                      key={`mob-nav-${item.href}`}
                      href={item.href}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => setOpen(false)}
                    >
                      <Icon size={18} className="flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-border">
          <Link
            href="/sign-up-login-screen"
            className="nav-item text-destructive hover:bg-red-50"
            onClick={() => setOpen(false)}
          >
            <LogOut size={18} className="flex-shrink-0" />
            <span>התנתקות</span>
          </Link>
        </div>
      </div>
    </>
  );
}