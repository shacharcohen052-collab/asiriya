'use client';

import React, { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';

function AutoTheme() {
  useEffect(() => {
    const updateTheme = () => {
      const hour = new Date().getHours();
      const isNight = hour >= 19 || hour < 7;
      document.documentElement.classList.toggle('dark', isNight);
      document.documentElement.style.colorScheme = isNight ? 'dark' : 'light';
    };

    updateTheme();
    const timer = window.setInterval(updateTheme, 60_000);
    const handleVisibility = () => { if (!document.hidden) updateTheme(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider><AutoTheme />{children}</AuthProvider>;
}
