'use client';
import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { Home, Users, CalendarDays, RotateCcw, User, Settings, LogOut, Trophy, Upload,  } from 'lucide-react';
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

interface SidebarProps {
  activeRoute?: string;
}

export default function Sidebar({ activeRoute }: SidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col fixed right-0 top-0 h-full w-64 bg-card border-l border-border card-shadow z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <AppLogo size={36} />
        <div>
          <span className="font-bold text-base text-foreground leading-tight block">מרחב</span>
          <span className="font-bold text-base text-primary leading-tight block">העשירייה</span>
        </div>
      </div>

      {/* User badge */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
            ש
          </div>
          <div className="min-w-0">
            <p className="text-sm font-600 text-foreground truncate">שחר כהן</p>
            <p className="text-xs text-muted-foreground">עשירייה ב׳</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={`group-${group.label}`}>
            <p className="text-2xs font-600 text-muted-foreground uppercase tracking-widest px-3 mb-2">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.href;
                return (
                  <Link
                    key={`nav-${item.href}`}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
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

      {/* Bottom logout */}
      <div className="px-3 py-4 border-t border-border">
        <Link href="/sign-up-login-screen" className="nav-item text-destructive hover:bg-destructive/5">
          <LogOut size={18} className="flex-shrink-0" />
          <span>התנתקות</span>
        </Link>
      </div>
    </aside>
  );
}