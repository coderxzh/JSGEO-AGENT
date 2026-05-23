import React from 'react';
import { ViewState } from '../../types';
import { cn } from '../../lib/utils';
import { 
  LayoutDashboard, 
  Bot, 
  Library, 
  FileText, 
  FolderOpen, 
  GraduationCap,
  HelpCircle,
  Headset
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

const navItems = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { id: 'agent', label: '智能助手', icon: Bot },
  { id: 'knowledge', label: '知识库', icon: Library },
  { id: 'drafts', label: '稿件管理', icon: FileText },
  { id: 'projects', label: '项目管理', icon: FolderOpen },
  { id: 'learning', label: '自动学习', icon: GraduationCap },
] as const;

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <nav className="fixed left-0 top-0 h-full w-[280px] z-50 bg-surface-container-lowest border-r border-outline-variant/50 flex flex-col hidden md:flex">
      <div className="px-xl h-[64px] flex items-center shrink-0">
        <div className="flex items-center gap-sm">
          <div className="h-6 w-6 rounded-full bg-primary shadow-sm flex-shrink-0 flex items-center justify-center">
             <Bot className="w-4 h-4 text-on-primary" />
          </div>
          <span className="text-[20px] font-bold tracking-tight text-primary leading-none whitespace-nowrap">
            鲸杉GEO
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-sm flex flex-col gap-xs mt-2">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              onClick={() => onViewChange(id as ViewState)}
              className={cn(
                "flex items-center gap-md px-xl py-3 w-full transition-all text-[14px]",
                isActive 
                  ? "text-primary font-bold bg-secondary/5 border-r-[2px] border-primary"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-low border-r-[2px] border-transparent"
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      
      <div className="mt-auto flex flex-col gap-xs pt-md border-t border-outline-variant/30 pb-xl">
        <button className="flex items-center gap-md text-on-surface-variant hover:text-primary px-xl py-sm transition-all text-[14px]">
          <HelpCircle className="w-5 h-5" />
          <span>帮助</span>
        </button>
        <button className="flex items-center gap-md text-on-surface-variant hover:text-primary px-xl py-sm transition-all text-[14px]">
          <Headset className="w-5 h-5" />
          <span>支持</span>
        </button>
      </div>
    </nav>
  );
}
