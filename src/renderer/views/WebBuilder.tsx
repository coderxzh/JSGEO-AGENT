import React from 'react';
import { Globe, ArrowUpRight, Check, Sparkles, Code2, Monitor, ExternalLink, FileText, CheckSquare, Store } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Card layouts data
const aiWebsites = [
  {
    id: 'site-1',
    title: '行乐车用声学体验馆 (门店演示站)',
    desc: '专为成都汽车音响实体门店打造的主页范式，包含动态预约表单和实时库存查询，接入本地微信生态。',
    category: 'Local',
    tag: 'Web App',
    url: 'https://ais-dev-5g27ypn6gawyvrq6uwokdc-110550551306.asia-northeast1.run.app/site1',
    views: '12.4k',
    icon: Globe
  },
  {
    id: 'site-2',
    title: '硬核隔音评测深度指南',
    desc: '基于 Next.js 与 MDX 的深度测评长文博客网站，支持暗色模式，完美适配豆包与DeepSeek的长文本SEO抓取优化。',
    category: 'Blog',
    tag: 'Content',
    url: 'https://ais-dev-5g27ypn6gawyvrq6uwokdc-110550551306.asia-northeast1.run.app/site2',
    views: '8.1k',
    icon: FileText
  },
  {
    id: 'site-3',
    title: 'IASCA 国际赛事图谱检索平台',
    desc: '提供大模型检索接口的专业技术能力履历公示平台，结构化存放门店历史改装获奖数据，提高EEAT权威度。',
    category: 'Enterprise',
    tag: 'Database',
    url: 'https://ais-dev-5g27ypn6gawyvrq6uwokdc-110550551306.asia-northeast1.run.app/site3',
    views: '5.2k',
    icon: CheckSquare
  },
  {
    id: 'site-4',
    title: '成都彩虹音响专卖小程序Web版',
    desc: '单页沉浸式商品展示，集成了自动化产品FAQ客服对话流，降低售前沟通成本。',
    category: 'E-commerce',
    tag: 'Store',
    url: 'https://ais-dev-5g27ypn6gawyvrq6uwokdc-110550551306.asia-northeast1.run.app/site4',
    views: '16.9k',
    icon: Store
  }
];

export function WebBuilder() {
  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-xl max-w-7xl mx-auto space-y-lg animate-in fade-in duration-300 pb-16">
      
      {/* Editorial Content Header with Vector Illustration */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-[#1f2937] text-white rounded-[20px] p-8 md:p-12 mb-8 border-transparent">
        <div className="space-y-3 max-w-2xl w-full">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-[#60a5fa]" />
            <span className="text-[14px] font-bold text-[#93c5fd] tracking-wide leading-none">
              AI Web Builder
            </span>
          </div>
          <h1 className="text-[36px] font-bold text-white font-heading tracking-tight leading-tight">
            AI 网页生成与托管
          </h1>
          <p className="text-[16px] text-white/80 leading-relaxed mt-2">
            通过自然语言在智能助手中一键生成的专属营销网站。所有生成的网站均自动部署并在此展示，点击即可沉浸式预览。
          </p>
        </div>
        
        <div className="w-[320px] h-[180px] shrink-0 flex items-center justify-center relative select-none hidden md:flex text-white/80">
          <svg viewBox="0 0 200 120" className="w-full h-full text-current" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="20" y="20" width="160" height="90" rx="8" className="fill-white/5" />
            <path d="M20 40 L180 40" />
            <circle cx="35" cy="30" r="2" fill="currentColor" />
            <circle cx="45" cy="30" r="2" fill="currentColor" />
            <circle cx="55" cy="30" r="2" fill="currentColor" />
            
            {/* Website Content Mock */}
            <rect x="40" y="55" width="40" height="40" rx="4" className="fill-white/10" />
            <rect x="90" y="55" width="70" height="8" rx="2" className="fill-white/20" />
            <rect x="90" y="70" width="50" height="4" rx="1" className="fill-white/10" />
            <rect x="90" y="80" width="60" height="4" rx="1" className="fill-white/10" />
            
            {/* Magic Wand / Sparkle */}
            <path d="M140 85 L160 65" strokeWidth="2" strokeDasharray="2 2" className="text-[#60a5fa]" />
            <circle cx="160" cy="65" r="4" fill="#60a5fa" stroke="none" />
            <path d="M160 55 L160 60 M165 65 L170 65 M160 75 L160 70 M150 65 L155 65" className="text-[#93c5fd]" />
          </svg>
        </div>
      </div>

      {/* Grid: Lightweight Modular Cards with small exquisite icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {aiWebsites.map((item, idx) => {
            const IconComponent = item.icon;
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
                    <div className="w-7 h-7 bg-background border border-outline-variant/40 rounded-2xl flex items-center justify-center shrink-0">
                      <IconComponent className="w-4 h-4 text-primary" />
                    </div>
                    <span className={cn("text-[12px] font-medium px-2 py-0.5 rounded-full tracking-wide bg-background/60 border border-outline-variant/20 flex items-center gap-1.5 text-secondary")}>
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
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
                     渲染量 {item.views}
                  </span>
                  
                  <button
                    onClick={() => window.open(item.url, '_blank')}
                    className="px-4 py-1.5 text-[11px] font-bold rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 bg-primary text-on-primary hover:bg-primary/95"
                  >
                    在线预览
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}
