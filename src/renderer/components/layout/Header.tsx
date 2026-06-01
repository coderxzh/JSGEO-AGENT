import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Settings, Sun, Moon, Globe, Building2, ChevronDown, Menu, Check, Trash2 } from 'lucide-react';
import { useEnterprise } from '../../context/EnterpriseContext';
import { cn } from '../../lib/utils';
import { ViewState } from '../../types';

const CURRENT_CONVERSATION_STORAGE_PREFIX = 'geo-agent-current-conversation-id';
const PHASE_TWO_PROMPT_STORAGE_KEY = 'geo-agent-phase-two-prompts-v2';

function conversationStorageKey(projectId?: string | null) {
  return `${CURRENT_CONVERSATION_STORAGE_PREFIX}:${projectId || 'global'}`;
}

function clearConversationStorageById(conversationId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(`${CURRENT_CONVERSATION_STORAGE_PREFIX}:`)) {
      continue;
    }
    if (localStorage.getItem(key) === conversationId) {
      localStorage.removeItem(key);
    }
  }
}

function clearConversationStorage() {
  if (typeof window === 'undefined') {
    return;
  }
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(`${CURRENT_CONVERSATION_STORAGE_PREFIX}:`) || key === PHASE_TWO_PROMPT_STORAGE_KEY) {
      localStorage.removeItem(key);
    }
  }
}

interface HeaderProps {
  currentView: ViewState;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ currentView, isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { currentEnterpriseId, currentEnterprise, setEnterpriseId, enterprises, hasEnterprises, isLoadingEnterprises } = useEnterprise();
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<GeoAgentConversationSummary[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement | null>(null);
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

  const currentConversationTitle = useMemo(() => {
    if (!currentConversationId) {
      return '新对话';
    }
    return conversations.find((conversation) => conversation.id === currentConversationId)?.title ?? '当前会话';
  }, [currentConversationId, conversations]);
  const groupedConversations = useMemo(() => groupConversations(conversations), [conversations]);
  const currentConversationStorageKey = conversationStorageKey(currentEnterprise?.id);

  const refreshConversations = () => {
    if (currentView !== 'agent' || !hasEnterprises || !window.geoAgent?.getConversations) {
      setConversations([]);
      return;
    }
    window.geoAgent.getConversations(currentEnterprise.id, 40)
      .then((response) => setConversations(response.conversations ?? []))
      .catch(() => setConversations([]));
  };

  useEffect(() => {
    refreshConversations();
  }, [currentView, currentEnterprise.id, hasEnterprises]);

  useEffect(() => {
    setCurrentConversationId(localStorage.getItem(currentConversationStorageKey));
  }, [currentConversationStorageKey]);

  useEffect(() => {
    const handleChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ id?: string | null }>).detail;
      const nextId = detail?.id ?? null;
      setCurrentConversationId(nextId);
      if (nextId) {
        localStorage.setItem(currentConversationStorageKey, nextId);
      } else {
        localStorage.removeItem(currentConversationStorageKey);
      }
      refreshConversations();
    };
    const handleRefresh = () => refreshConversations();
    const handleCleared = () => {
      clearConversationStorage();
      setCurrentConversationId(null);
      setConversations([]);
      refreshConversations();
    };
    window.addEventListener('geo-agent-conversation-changed', handleChanged);
    window.addEventListener('geo-agent-conversations-refresh', handleRefresh);
    window.addEventListener('geo-agent-conversations-cleared', handleCleared);
    return () => {
      window.removeEventListener('geo-agent-conversation-changed', handleChanged);
      window.removeEventListener('geo-agent-conversations-refresh', handleRefresh);
      window.removeEventListener('geo-agent-conversations-cleared', handleCleared);
    };
  }, [currentEnterprise.id, currentView, hasEnterprises]);

  useEffect(() => {
    const closeHistory = (event: PointerEvent | FocusEvent) => {
      if (!historyRef.current?.contains(event.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeHistory);
    document.addEventListener('focusin', closeHistory);
    return () => {
      document.removeEventListener('pointerdown', closeHistory);
      document.removeEventListener('focusin', closeHistory);
    };
  }, []);

  const openConversation = (conversationId: string) => {
    window.dispatchEvent(new CustomEvent('geo-agent-open-conversation', { detail: { id: conversationId } }));
    setCurrentConversationId(conversationId);
    localStorage.setItem(currentConversationStorageKey, conversationId);
    setIsHistoryOpen(false);
  };

  const startNewConversation = () => {
    window.dispatchEvent(new CustomEvent('geo-agent-new-conversation'));
    setCurrentConversationId(null);
    localStorage.removeItem(currentConversationStorageKey);
    setIsHistoryOpen(false);
  };

  const deleteConversation = async (conversationId: string, title: string) => {
    if (!window.geoAgent?.deleteConversation) {
      return;
    }
    const confirmed = window.confirm(`确定删除「${title}」这条对话记录吗？`);
    if (!confirmed) {
      return;
    }
    try {
      await window.geoAgent.deleteConversation(conversationId);
      clearConversationStorageById(conversationId);
      setConversations((items) => items.filter((conversation) => conversation.id !== conversationId));
      window.dispatchEvent(new CustomEvent('geo-agent-conversation-deleted', { detail: { id: conversationId } }));
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null);
        localStorage.removeItem(currentConversationStorageKey);
      } else {
        window.dispatchEvent(new CustomEvent('geo-agent-conversations-refresh'));
      }
    } catch (error) {
      clearConversationStorageById(conversationId);
      window.dispatchEvent(new CustomEvent('geo-agent-conversation-deleted', { detail: { id: conversationId } }));
      console.error('Failed to delete conversation', error);
    }
  };

  return (
    <header className={cn(
      "bg-background/85 backdrop-blur-md fixed top-0 w-full h-[64px] z-40 flex justify-between items-center px-6 border-b border-outline-variant/40 transition-all duration-300",
      isSidebarCollapsed ? "md:pl-[24px]" : "md:pl-[240px]"
    )}>
      
      {/* Left side: Sidebar Toggle and active page controls */}
      <div className="relative flex min-w-0 items-center gap-3">
        {isSidebarCollapsed && (
          <button 
            onClick={onToggleSidebar}
            className="p-1 rounded hover:bg-surface-variant text-on-surface-variant hover:text-primary transition-colors cursor-pointer mr-1"
            title="展开侧边栏"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {currentView === 'agent' && (
          <div className="relative ml-8 flex min-w-0 items-center gap-2 md:ml-10" ref={historyRef}>
            <span className="hidden text-[12px] font-bold text-primary sm:inline">
              鲸杉GEO-Agent
            </span>
            <span className="hidden text-[12px] text-on-surface-variant/45 sm:inline">/</span>
            <button
              className="inline-flex max-w-[220px] items-center gap-1.5 rounded-xl bg-transparent px-3 py-1.5 text-[12px] font-bold text-primary transition-colors hover:bg-surface-container-low"
              onClick={() => setIsHistoryOpen((current) => !current)}
              type="button"
            >
              <span className="truncate">{currentConversationTitle}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-on-surface-variant transition-transform', isHistoryOpen && 'rotate-180')} />
            </button>
            {isHistoryOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsHistoryOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 w-[360px] max-w-[calc(100vw-32px)] rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-2 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between px-2 pb-2 pt-1">
                    <span className="text-[12px] font-bold text-on-surface-variant">历史聊天</span>
                    <button
                      className="rounded-lg bg-transparent px-2.5 py-1.5 text-[12px] font-bold text-primary transition-colors hover:bg-surface-container-low"
                      onClick={startNewConversation}
                      type="button"
                    >
                      新对话
                    </button>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto px-1 pb-1">
                    {groupedConversations.length > 0 ? groupedConversations.map((group) => (
                      <div className="pb-2" key={group.label}>
                        <div className="px-2 py-2 text-[12px] font-bold text-on-surface-variant/70">
                          {group.label}
                        </div>
                        <div className="space-y-1">
                          {group.items.map((conversation) => (
                            <div
                              className={cn(
                                'group/history-row flex w-full items-center justify-between gap-2 rounded-lg transition-colors',
                                currentConversationId === conversation.id
                                  ? 'bg-surface-container'
                                  : 'hover:bg-surface-container-low'
                              )}
                              key={conversation.id}
                            >
                              <button
                                className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2.5 py-2 text-left text-[13px] font-semibold text-primary"
                                onClick={() => openConversation(conversation.id)}
                                type="button"
                              >
                                <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                                {currentConversationId === conversation.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                              </button>
                              <button
                                aria-label={`删除对话：${conversation.title}`}
                                className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-on-surface-variant/50 opacity-0 transition-all hover:bg-error/10 hover:text-error group-hover/history-row:opacity-100 focus-visible:opacity-100"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  deleteConversation(conversation.id, conversation.title);
                                }}
                                title="删除对话"
                                type="button"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )) : (
                      <div className="px-3 py-10 text-center text-[13px] leading-relaxed text-on-surface-variant">
                        暂无历史聊天。发送第一条消息后会自动保存。
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
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
              {isLoadingEnterprises ? '加载企业中...' : currentEnterprise.name}
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
                  {enterprises.length > 0 ? enterprises.map((ent) => {
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
                  }) : (
                    <div className="px-3 py-8 text-center text-[13px] leading-relaxed text-on-surface-variant">
                      暂无可优化企业。请先在知识库模块建立企业知识库。
                    </div>
                  )}
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

const parseConversationDate = (value: string) => {
  if (!value) {
    return null;
  }
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized.endsWith('Z') ? normalized : `${normalized}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const groupConversations = (items: GeoAgentConversationSummary[]) => {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfPreviousWeek = new Date(startOfToday);
  startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);
  const labels = ['Today', 'Yesterday', 'Previous 7 days', 'Earlier'];
  const byLabel = new Map(labels.map((label) => [label, [] as GeoAgentConversationSummary[]]));

  items.forEach((conversation) => {
    const date = parseConversationDate(conversation.updated_at);
    if (!date || date < startOfPreviousWeek) {
      byLabel.get('Earlier')?.push(conversation);
    } else if (date >= startOfToday) {
      byLabel.get('Today')?.push(conversation);
    } else if (date >= startOfYesterday) {
      byLabel.get('Yesterday')?.push(conversation);
    } else {
      byLabel.get('Previous 7 days')?.push(conversation);
    }
  });

  return labels
    .map((label) => ({ label, items: byLabel.get(label) ?? [] }))
    .filter((group) => group.items.length > 0);
};
