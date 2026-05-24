import React, { useState } from 'react';
import { Search, Compass, Download, ArrowUpRight, Copy, Check, FileText, Bot, Terminal, Sliders, CheckSquare, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Card layouts data
const discoverTemplates = [
  {
    id: 'dt-1',
    title: '硬核深度实测对比规范 (Review Matrix)',
    desc: '大模型极度偏好包含详实硬件测试参数以及优缺点多阶对比的数据切片，该模板包含15参数对照表。',
    category: 'Templates',
    tag: 'Design',
    tagColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    downloads: 245,
    icon: FileText
  },
  {
    id: 'dt-2',
    title: '同城服务门诊 EEAT 资质图谱 (Local EEAT)',
    desc: '专为实体门店优化设计的本地三元组关系表。打包品牌授权证明、官方主理、IASCA声学证书等权威印记。',
    category: 'Templates',
    tag: 'Engineering',
    tagColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    downloads: 189,
    icon: Sliders
  },
  {
    id: 'dt-3',
    title: '科普干货文 “行业避坑” 经典模版 (SEO Guide)',
    desc: '以客观数字盘点为核心，详情页采用Markdown多维说明，完美契合豆包、DeepSeek大模型的召回规则。',
    category: 'Templates',
    tag: 'Marketing',
    tagColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    downloads: 412,
    icon: FileText
  },
  {
    id: 'da-1',
    title: 'ELO 媒介投放自检先锋 (ELO Media Auditor)',
    desc: '后台实时评估发布渠道的推荐顺位和被抓取几率。自动对差评、降权渠道标记淘汰，保护数据基础。',
    category: 'Agents',
    tag: 'Engineering',
    tagColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    downloads: 320,
    icon: Bot
  },
  {
    id: 'da-2',
    title: 'GEO 标靶关键词重塑 Agent (Keyword Reshaper)',
    desc: '自动逆向豆包现状并检测提及率偏弱的特定主词。将主词细分并生成长尾修饰链，提高大模型召回精度。',
    category: 'Agents',
    tag: 'AI Studio',
    tagColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    downloads: 508,
    icon: Terminal
  },
  {
    id: 'da-3',
    title: 'EEAT 知识清洗器 (Compliance Sanitizer)',
    desc: '自动化检测产品手册，过滤敏感极限词，提取带有逻辑结构的FAQ对，使物料一键转化为大模型友好型。',
    category: 'Agents',
    tag: 'Regulation',
    tagColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    downloads: 147,
    icon: CheckSquare
  }
];

export function Marketplace() {
  const [activeTab, setActiveTab] = useState<'discover' | 'templates' | 'agents'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleInstall = (id: string) => {
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 1500);
  };

  const filteredItems = discoverTemplates.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.desc.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (activeTab === 'discover') return true;
    if (activeTab === 'templates') return item.category === 'Templates';
    if (activeTab === 'agents') return item.category === 'Agents';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-xl max-w-7xl mx-auto space-y-lg animate-in fade-in duration-300 pb-16">
      
      {/* Editorial Content Header with Vector Illustration */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-[#1f2937] text-white rounded-[20px] p-8 md:p-12 mb-8 border-transparent">
        <div className="space-y-3 max-w-2xl w-full">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#60a5fa]" />
            <span className="text-[14px] font-bold text-[#93c5fd] tracking-wide leading-none">
              Agents
            </span>
          </div>
          <h1 className="text-[36px] font-bold text-white font-heading tracking-tight leading-tight">
            Custom agents are here
          </h1>
          <p className="text-[16px] text-white/80 leading-relaxed max-w-lg mt-2">
            Create an agent for any task, built specifically to work within your specialized workflows.
          </p>
        </div>
        
        <div className="w-[280px] h-[180px] shrink-0 flex items-center justify-center relative select-none hidden md:flex text-white/80">
          <svg viewBox="0 0 200 120" className="w-full h-full text-current" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {/* Book/Paper stack */}
            <path d="M40 90 L80 100 L120 90 L80 80 Z" fill="currentColor" fillOpacity="0.05" />
            <path d="M40 80 L80 90 L120 80 L80 70 Z" />
            <path d="M40 85 L80 95 L120 85" strokeDasharray="2 4" />
            {/* Pencil intersecting */}
            <path d="M110 50 L75 95 L65 105 L60 100 L70 90 L105 45" fill="currentColor" fillOpacity="0.05" />
            <path d="M110 50 L105 45 L115 40 Z" fill="currentColor" />
            {/* Floating Sparkles/Lightbulb */}
            <circle cx="130" cy="35" r="10" />
            <path d="M130 45 L130 50 M120 35 L115 35 M140 35 L145 35 M123 28 L119 24 M137 28 L141 24" />
            <path d="M20 110 L180 110" strokeDasharray="1 6" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Segmented Controls & Search Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-1.5">
        
        {/* Segmented Control - Text links like Notion Marketplace */}
        <div className="flex space-x-6">
          <button 
            onClick={() => setActiveTab('discover')}
            className={cn(
              "py-1.5 text-[18px] font-semibold transition-all cursor-pointer",
              activeTab === 'discover' 
                ? "text-primary" 
                : "text-on-surface-variant/60 hover:text-primary/70"
            )}
          >
            Discover
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={cn(
              "py-1.5 text-[18px] font-semibold transition-all cursor-pointer",
              activeTab === 'templates' 
                ? "text-primary" 
                : "text-on-surface-variant/60 hover:text-primary/70"
            )}
          >
            Templates
          </button>
          <button 
            onClick={() => setActiveTab('agents')}
            className={cn(
              "py-1.5 text-[18px] font-semibold transition-all cursor-pointer",
              activeTab === 'agents' 
                ? "text-primary" 
                : "text-on-surface-variant/60 hover:text-primary/70"
            )}
          >
            Agents
          </button>
        </div>

        {/* Search input in Light Gray */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2 text-on-surface-variant/60" />
          <input 
            type="text" 
            placeholder="Search agents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-variant/50 border-transparent focus:outline-none pl-9 pr-4 py-1.5 text-[14px] rounded-md transition-all text-primary placeholder:text-on-surface-variant/60"
          />
        </div>
      </div>

      {/* Grid: Lightweight Modular Cards with small exquisite icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, idx) => {
            const IconComponent = item.icon;
            const isInstalled = copiedId === item.id;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                transition={{ duration: 0.15, delay: idx * 0.05 }}
                className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-5 flex flex-col justify-between min-h-[170px]"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    {/* Small rounded-2xl exquisite Icon */}
                    <div className="w-7 h-7 bg-background border border-outline-variant/40 rounded-2xl flex items-center justify-center shrink-0">
                      <IconComponent className="w-4 h-4 text-primary" />
                    </div>
                    {/* Key Low-Saturation Status Tag */}
                    <span className={cn("text-[12px] font-medium px-2 py-0.5 rounded-full tracking-wide bg-background/60 border border-outline-variant/20")}>
                      {item.tag}
                    </span>
                  </div>
                  
                  <h3 className="text-[16px] font-bold text-primary group-hover:text-secondary transition-colors line-clamp-1 font-heading">
                    {item.title}
                  </h3>
                  <p className="text-[14px] text-on-surface-variant mt-1.5 leading-relaxed line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3 mt-4">
                  <span className="text-[10px] font-mono text-on-surface-variant/60">
                    {item.downloads} 人克隆
                  </span>
                  
                  <button
                    onClick={() => handleInstall(item.id)}
                    className={cn(
                      "px-3 py-1.5 text-[11px] font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5",
                      isInstalled
                        ? "text-on-surface bg-surface-container-high"
                        : "bg-primary text-on-primary hover:bg-primary/95"
                    )}
                  >
                    {isInstalled ? (
                      <>
                        <Check className="w-3 h-3" />
                        Added
                      </>
                    ) : (
                      <>
                        Get template
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredItems.length === 0 && (
          <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-outline-variant rounded-md">
            <p className="text-[13px] text-on-surface-variant">没有找到匹配检索的模版或插件</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-3 text-[11px] font-semibold text-secondary hover:underline cursor-pointer"
            >
              清除检索词
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
