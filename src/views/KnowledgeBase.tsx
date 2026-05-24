import React, { useState, useEffect } from 'react';
import { 
  Rss, 
  FileText, 
  Network, 
  CheckCircle, 
  Database, 
  ShieldCheck, 
  Plus, 
  ArrowLeft, 
  Search, 
  Building2, 
  ChevronRight, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useEnterprise } from '../context/EnterpriseContext';
import { ENTERPRISES } from '../data/enterprises';

export function KnowledgeBase() {
  const { currentEnterpriseId, setEnterpriseId } = useEnterprise();
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string | null>(currentEnterpriseId);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync selected enterprise view when global enterprise selection changes
  useEffect(() => {
    setSelectedEnterpriseId(currentEnterpriseId);
  }, [currentEnterpriseId]);

  const selectedEnterprise = ENTERPRISES.find(e => e.id === selectedEnterpriseId);

  const filteredEnterprises = ENTERPRISES.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectEnterprise = (id: string) => {
    setSelectedEnterpriseId(id);
    setEnterpriseId(id);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-xl max-w-7xl mx-auto flex flex-col gap-lg animate-in fade-in duration-300 min-h-full pb-16">
      
      {!selectedEnterprise ? (
        <>
          {/* Header for list */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-[#f7f7f5] dark:bg-surface-variant/40 rounded-[20px] p-8 md:p-12 mb-8 border-transparent">
            <div className="space-y-3 max-w-2xl w-full">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-on-surface-variant/80 tracking-wide leading-none">
                  Knowledge Base
                </span>
              </div>
              <h1 className="text-[36px] font-bold text-primary tracking-tight leading-tight font-heading">
                企业数字资产引擎
              </h1>
              <p className="text-[16px] text-on-surface-variant leading-relaxed mt-2">
                存储不同企业的原始非结构化资料，管理面向大模型检索（RAG）的文档分块向量索引，以及结构化关系图谱建设。
              </p>
              <button className="mt-4 px-4 py-2 bg-secondary text-on-secondary hover:bg-secondary/90 text-[13px] font-bold rounded flex items-center gap-2 shrink-0 transition-colors">
                <Plus className="w-4 h-4" />
                导入新企业
              </button>
            </div>
            <div className="w-[240px] h-[160px] shrink-0 flex items-center justify-center relative select-none hidden md:flex">
              <svg viewBox="0 0 200 120" className="w-full h-full text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M60 20 h80 v80 h-80 z" className="fill-surface" />
                <path d="M70 40 h60 M70 60 h60 M70 80 h40" strokeDasharray="3,3" />
                <path d="M50 30 h10 v70 h-10 z" className="fill-surface" />
                <circle cx="150" cy="30" r="12" className="fill-surface" />
                <path d="M150 42 L150 55" />
              </svg>
            </div>
          </div>

          {/* Grid of enterprises */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {filteredEnterprises.map((enterprise) => (
              <div 
                key={enterprise.id}
                onClick={() => handleSelectEnterprise(enterprise.id)}
                className="bg-[#f7f7f5] dark:bg-surface-variant/45 p-6 rounded-2xl  hover: hover:border-primary/35 transition-all cursor-pointer group relative flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[20px] font-bold text-primary font-heading group-hover:text-secondary transition-colors">
                        {enterprise.name}
                      </h3>
                      <p className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider mt-0.5">
                        {enterprise.industry}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase border border-outline-variant/40 px-2 py-0.5 rounded-full text-on-surface-variant bg-surface">
                    {enterprise.tag}
                  </span>
                </div>

                <p className="text-[14px] text-on-surface-variant leading-relaxed flex-1 pt-1">
                  {enterprise.desc}
                </p>

                {/* Grid Metadata metrics */}
                <div className="grid grid-cols-3 gap-2 py-3 bg-[#f7f7f5] dark:bg-surface-variant/40 rounded-2xl px-4 text-center mt-2 border border-outline-variant/10">
                  <div>
                    <span className="block text-[11px] text-on-surface-variant font-medium">数据源</span>
                    <span className="font-mono text-[14px] font-black text-primary mt-0.5 block">{enterprise.sourceCount} 个</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-on-surface-variant font-medium">RAG字数</span>
                    <span className="font-mono text-[14px] font-black text-primary mt-0.5 block">{enterprise.wordCount}</span>
                  </div>
                  <div>
                    <span className="block text-[11px] text-on-surface-variant font-medium">图谱三元组</span>
                    <span className="font-mono text-[14px] font-black text-secondary mt-0.5 block">{enterprise.graphTriples} 组</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-[12px] font-mono">
                  <span className="text-on-surface-variant/60">更新于 {enterprise.lastUpdated}</span>
                  <span className="text-secondary font-bold inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                    进入 RAG 知识库管理
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))}

            {filteredEnterprises.length === 0 && (
              <div className="col-span-2 py-16 text-center border-2 border-dashed border-outline-variant/60 rounded-2xl bg-[#f7f7f5] dark:bg-surface-variant/20">
                <p className="text-on-surface-variant text-[14px]">未搜索到相关企业数据资产库。</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Detailed Enterprise Asset View */}
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Breadcrumb Navigation */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-outline-variant/20 pb-6">
              <div className="space-y-2">
                <button 
                  onClick={() => setSelectedEnterpriseId(null)}
                  className="inline-flex items-center gap-2 text-[12px] font-bold text-secondary uppercase tracking-widest hover:text-primary transition-colors group mb-1"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  返回企业列表
                </button>
                <div className="flex items-baseline gap-3">
                  <h1 className="text-[36px] font-bold text-primary font-heading tracking-tight leading-tight">
                    {selectedEnterprise.name} <span className="text-on-surface-variant/40 text-[24px] font-medium">• 知识库</span>
                  </h1>
                </div>
                <p className="text-[14px] text-on-surface-variant max-w-4xl">
                  当前处于 <span className="font-bold text-primary">{selectedEnterprise.tag}</span> 专属 RAG 分割控制区。管理源头文章接入、模型逆向白名单信源切片。
                </p>
              </div>
              <div className="flex gap-4 shrink-0">
                <button 
                  onClick={() => setSelectedEnterpriseId(null)}
                  className="px-5 py-2.5 border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-surface-container transition-colors rounded-sm bg-[#f7f7f5] dark:bg-surface-variant/45 "
                >
                  更换企业
                </button>
                <button className="px-5 py-2.5 bg-secondary text-on-secondary hover:opacity-90 text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity  flex items-center gap-2 rounded-sm">
                  <Plus className="w-4 h-4" />
                  导入新物料
                </button>
              </div>
            </div>

            {/* Enterprise Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-5">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">累计存储规模</span>
                <span className="font-mono text-[22px] font-black text-primary mt-1 block">{selectedEnterprise.wordCount}</span>
              </div>
              <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-5">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">关系图谱实体</span>
                <span className="font-mono text-[22px] font-black text-primary mt-1 block">{selectedEnterprise.graphEntities} 个</span>
              </div>
              <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-5">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">图谱关联词三元组</span>
                <span className="font-mono text-[22px] font-black text-secondary mt-1 block">{selectedEnterprise.graphTriples} 组</span>
              </div>
              <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-5">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">大模型 RAG 覆盖深度</span>
                <span className="font-mono text-[22px] font-black text-emerald-600 mt-1 block">{selectedEnterprise.ragDepth}</span>
              </div>
            </div>

            {/* Data Sources Grid */}
            <div>
              <h2 className="text-[20px] font-bold text-primary font-heading mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-secondary" />
                已装配的核心物料数据源
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedEnterprise.sources.map((source, index) => (
                  <SourceCard 
                    key={index}
                    icon={source.icon}
                    title={source.title}
                    desc={source.desc}
                    status={source.status}
                    count={source.count}
                    color={source.color}
                    statusColor={source.statusColor}
                    iconColor={source.iconColor}
                    percent={source.percent}
                  />
                ))}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
              
              {/* Queue */}
              <div className="lg:col-span-2 bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl  flex flex-col">
                <div className="p-6 border-b border-outline-variant/60 flex justify-between items-center">
                  <h3 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
                    <Database className="w-5 h-5 text-secondary" />
                    分块索引入库队列及 RAG 语义重组自检
                  </h3>
                  <span className="font-mono text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-2xl">实时监听</span>
                </div>
                <div className="flex-1 divide-y divide-outline-variant/10">
                  {selectedEnterprise.queue.map((item, index) => (
                    <QueueItem 
                      key={index}
                      icon={item.icon}
                      title={item.title}
                      sub={item.sub}
                      progress={item.progress}
                      done={item.done}
                    />
                  ))}
                </div>
              </div>

              {/* Graphical EEAT side card */}
              <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl  p-6 flex flex-col gap-5">
                <div className="border-b border-outline-variant/15 pb-3">
                  <h3 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-secondary" />
                    企业白盒 EEAT 重塑底盘
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <span className="text-[13px] text-on-surface-variant font-medium">行业规范分类</span>
                    <span className="font-sans text-[13px] font-semibold text-primary">{selectedEnterprise.tag}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <span className="text-[13px] text-on-surface-variant font-medium">可用图谱实体数</span>
                    <span className="font-mono text-[13px] font-bold text-primary">{selectedEnterprise.graphEntities} 个</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/10">
                    <span className="text-[13px] text-on-surface-variant font-medium">已解析关联通路数</span>
                    <span className="font-mono text-[13px] font-bold text-primary">{selectedEnterprise.graphTriples} 组</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-[13px] text-on-surface-variant font-medium">EEAT 完整度评定</span>
                    <span className="font-mono text-[13px] font-bold text-emerald-600">极高 (96/100)</span>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <div className="w-full h-36 rounded-2xl bg-surface relative overflow-hidden border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 flex items-center justify-center pointer-events-none p-4 text-center">
                    <div className="absolute inset-0 bg-secondary/10 opacity-30" />
                    <div className="relative z-10 flex flex-col items-center">
                      <ShieldCheck className="w-10 h-10 text-secondary mb-2" />
                      <span className="text-[11px] font-bold tracking-widest uppercase text-primary">RAG 真实数据安全锁</span>
                      <p className="text-[10px] text-on-surface-variant/70 mt-1 max-w-[200px]">已启用隔离存储，非商业用途外部绝对无法逆向抓取</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}

function SourceCard({ icon: Icon, title, desc, status, count, color, statusColor, iconColor, percent }: any) {
  return (
    <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 p-6 rounded-2xl  flex flex-col gap-4 relative overflow-hidden group hover: transition-all">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-2xl bg-surface border border-outline-variant/20 shrink-0">
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-primary font-heading group-hover:text-secondary transition-colors leading-tight">{title}</h3>
          <span className="font-mono text-[11px] text-on-surface-variant/70 mt-1 block">{count}</span>
        </div>
      </div>
      <p className="text-[14px] text-on-surface-variant flex-1 leading-relaxed">{desc}</p>
      
      <div className="pt-4 flex items-center justify-between border-t border-outline-variant/10">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", statusColor)} />
          <span className="font-mono text-[12px] text-on-surface font-semibold">{status}</span>
        </div>
        {percent && (
          <span className="font-mono text-[11px] text-secondary font-bold">{percent}%</span>
        )}
      </div>
    </div>
  );
}

function QueueItem({ icon: Icon, title, sub, progress, done }: any) {
  return (
    <div className={cn("px-6 py-4.5 flex items-center justify-between hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/40 transition-colors", done && "opacity-65")}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-surface border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 flex items-center justify-center">
          <Icon className="w-5 h-5 text-on-surface-variant" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-primary font-heading leading-tight">{title}</p>
          <p className="font-mono text-[11px] text-on-surface-variant mt-1">{sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-6">
        {progress ? (
           <>
            <div className="w-32 h-1.5 bg-surface-container rounded-full overflow-hidden hidden sm:block">
              <div className="h-full bg-secondary" style={{ width: `${progress}%` }} />
            </div>
            <span className="font-mono text-[13px] text-secondary font-bold w-10 text-right">{progress}%</span>
           </>
        ) : (
          <span className="font-mono text-[11px] font-bold text-on-surface-variant bg-[#f7f7f5] dark:bg-surface-variant/45 px-2 py-1 rounded-2xl">COMPLETED</span>
        )}
      </div>
    </div>
  );
}
