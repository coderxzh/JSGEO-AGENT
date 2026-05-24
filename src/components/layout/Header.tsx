import React, { useEffect, useState } from 'react';
import { Bell, Settings, Sun, Moon, Globe, Building2, ChevronDown, Menu } from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { cn } from '../../lib/utils';

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { currentEnterpriseId, currentEnterprise, setEnterpriseId, enterprises } = useEnterprise();
  const [isOpen, setIsOpen] = useState(false);
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
    <header className={cn(
      "bg-background/85 backdrop-blur-md fixed top-0 w-full h-[64px] z-40 flex justify-between items-center px-6 border-b border-outline-variant/40 transition-all duration-300",
      isSidebarCollapsed ? "md:pl-[24px]" : "md:pl-[240px]"
    )}>
      
      {/* Left side: Sidebar Toggle */}
      <div className="relative flex items-center gap-3">
        {isSidebarCollapsed && (
          <button 
            onClick={onToggleSidebar}
            className="p-1 rounded hover:bg-surface-variant text-on-surface-variant hover:text-primary transition-colors cursor-pointer mr-1"
            title="展开侧边栏"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="relative mr-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-surface-container-low hover:bg-surface-variant border border-outline-variant/30 text-left group active:scale-[0.98] transition-all"
            title="切换当前优化的企业"
            id="enterprise-selector-btn"
          >
            <Building2 className="w-3.5 h-3.5 text-secondary group-hover:text-secondary/80 transition-colors" />
            <span className="text-[12px] font-bold text-primary transition-colors leading-none font-sans">
              {currentEnterprise.name}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-on-surface-variant/80 group-hover:text-primary transition-all duration-200", isOpen && "rotate-180")} />
          </button>

          {/* List modal dropdown */}
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsOpen(false)} 
              />
              <div className="absolute right-0 top-full mt-2 w-[280px] bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-lg z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-outline-variant/20 mb-1.5">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">
                    切换项目信源与知识库
                  </span>
                </div>
                <div className="space-y-1">
                  {enterprises.map((ent) => {
                    const isSelected = ent.id === currentEnterpriseId;
                    return (
                      <button
                        key={ent.id}
                        onClick={() => {
                          setEnterpriseId(ent.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full text-left p-2 rounded-lg transition-all flex items-start gap-3",
                          isSelected 
                            ? "bg-secondary/10 border-transparent text-secondary" 
                            : "hover:bg-surface-container-low border border-transparent text-primary"
                        )}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
                          isSelected ? "bg-secondary/20 text-secondary" : "bg-surface-container-low text-on-surface-variant/80"
                        )}>
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div>
                            <span className={cn("text-[13px] font-bold block truncate", isSelected && "font-extrabold")}>
                              {ent.name}
                            </span>
                            <span className="text-[11px] text-on-surface-variant block truncate mt-0.5 leading-none">
                              {ent.industry}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="w-2 h-2 bg-secondary rounded-full shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
        
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

