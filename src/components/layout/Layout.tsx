import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { LayoutProps } from '../../types';

export function Layout({ currentView, onViewChange, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex antialiased">
      <Sidebar currentView={currentView} onViewChange={onViewChange} />
      
      <div className="flex-1 flex flex-col relative w-full overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto mt-[64px] pb-xl md:pl-[280px] w-full transition-all relative">
          <div className="fixed top-[-10%] right-[-5%] w-[600px] h-[600px] fluid-sphere rounded-full pointer-events-none z-0" />
          <div className="relative z-10 w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
