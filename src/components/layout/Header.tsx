import React, { useEffect, useState } from 'react';
import { Bell, Settings, Sun, Moon, Globe } from 'lucide-react';

export function Header() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
      // Check system preference as callback
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="bg-surface-container-lowest/80 backdrop-blur-md fixed top-0 w-full h-[64px] z-40 border-b border-outline-variant/50 flex justify-end items-center px-xl md:pl-[280px] transition-all">
      <div className="flex items-center gap-md ml-auto shrink-0">
        <button className="text-on-surface hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low" title="Language">
          <Globe className="w-5 h-5" />
        </button>
        <button 
          onClick={toggleTheme}
          className="text-on-surface hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low flex items-center justify-center" 
          title={theme === 'light' ? '切换至深色主题' : '切换至浅色主题'}
          id="theme-toggle-btn"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-secondary" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500 animate-[spin_10s_linear_infinite]" />
          )}
        </button>
        <button className="text-on-surface hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low relative" title="Notifications">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
        </button>
        <button className="text-on-surface hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-low" title="Settings">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
