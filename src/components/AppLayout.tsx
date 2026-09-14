import React from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import MemberAccessGate from './MemberAccessGate';

interface AppLayoutProps {
  children: React.ReactNode;
  activeRoute?: string;
}

export default function AppLayout({ children, activeRoute }: AppLayoutProps) {
  return (
    <MemberAccessGate>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <Sidebar activeRoute={activeRoute} />

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 lg:mr-64">
          {/* Mobile top bar */}
          <MobileNav activeRoute={activeRoute} />

          <main className="flex-1 px-4 pt-4 pb-4 lg:px-8 lg:pt-8 lg:pb-8 max-w-screen-2xl mx-auto w-full page-enter">
            {children}
          </main>
        </div>
      </div>
    </MemberAccessGate>
  );
}
