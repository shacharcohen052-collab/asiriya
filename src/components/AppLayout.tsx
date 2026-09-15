import React from 'react';
import MobileNav from './MobileNav';
import MemberAccessGate from './MemberAccessGate';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

export default function AppLayout({ children, activeRoute }: AppLayoutProps) {
  return (
    <MemberAccessGate>
      <div className="min-h-screen bg-background">
        <MobileNav activeRoute={activeRoute} />
        <main className="mx-auto w-full max-w-[760px] px-3 pt-3 pb-4 sm:px-5 sm:pt-5 page-enter">
          {children}
        </main>
      </div>
    </MemberAccessGate>
  );
}
