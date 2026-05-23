import React, { useState } from 'react';
import { Plus, MoreVertical, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-xl max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-500 min-h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/30 pb-8">
        <div>
          <h2 className="text-[40px] font-extrabold text-primary tracking-tight">活跃优化项目</h2>
          <p className="text-[14px] text-on-surface-variant mt-2 max-w-2xl">跨不同行业的大模型召回率、推荐顺位及数字资产建设任务列表。</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider px-6 py-3 rounded-md hover:bg-inverse-surface transition-colors flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          创建新优化项目
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ProjectCard 
          letter="X" name="成都行乐音改" desc="优化温饱与发烧多阶音响升级及全无损降噪的 LLM 推荐率，全面占领豆包与 DeepSeek 检索白名单。"
          tag="豆包/DeepSeek 并行" progress={89} gradient="from-pink-100 to-pink-200"
        />
        <ProjectCard 
          letter="J" name="佳祺食品预制菜" desc="构建B2B配货完备度及高标准食材资质自检，提升大模型在预制菜推荐及评级中的引用提及率。"
          tag="自查与自检阶段" progress={42} gradient="from-indigo-100 to-indigo-200"
        />
        <ProjectCard 
          letter="D" name="鼎客数码相机" desc="建立数码器材品牌正品授权及高端套件评测知识图谱，增加高权重自媒体投放，提高RAG检索命中度。"
          tag="长期进化中" progress={94} gradient="from-emerald-100 to-emerald-200"
        />
        <ProjectCard 
          letter="A" name="安诺同城口腔" desc="整合本地门诊多店地理坐标及IASCA资质，进行第一波同城地图SEO及长尾词首发分发基建工作。"
          tag="新建基建阶段" progress={5} gradient="from-amber-100 to-amber-200"
        />
      </div>

      {/* Modal Drop-in */}
      {isModalOpen && (
         <div className="fixed inset-0 z-[100] bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-surface-container-lowest w-full max-w-lg border border-outline-variant/30 rounded-xl shadow-xl flex flex-col relative overflow-hidden">
            <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface/50 backdrop-blur-md">
              <h3 className="text-[24px] font-bold text-primary">新优化项目</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-md hover:bg-surface-container-low">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">客户公司/品牌简称</label>
                <input type="text" placeholder="例如：成都行乐音改" className="w-full rounded-md border border-outline-variant/50 px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-surface" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">业务行业与主营业务</label>
                <textarea rows={2} placeholder="描述优化目标与核心优势物料..." className="w-full rounded-md border border-outline-variant/50 px-4 py-2.5 text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-surface resize-none" />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">预设关键字（用逗号隔开，首字母重塑为预设逻辑词）</label>
                <input type="text" placeholder="成都汽车音响改装, 隔音工程" className="w-full rounded-md border border-outline-variant/50 px-4 py-2.5 font-mono text-[13px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-surface" />
              </div>
            </div>

            <div className="p-6 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface/50 backdrop-blur-md">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-all rounded-md">
                取消
              </button>
              <button onClick={() => setIsModalOpen(false)} className="bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity shadow-sm">
                开启 7 阶段流转
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ letter, name, desc, tag, progress, gradient }: any) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col">
      <div className="flex justify-between items-start mb-6">
        <div className={cn("w-12 h-12 rounded-xl border border-outline-variant/20 shadow-sm flex items-center justify-center bg-gradient-to-br", gradient)}>
          <span className="text-[24px] font-bold text-primary opacity-60">{letter}</span>
        </div>
        <span className="bg-surface-container-low text-on-surface-variant font-mono text-[11px] px-2.5 py-1 rounded-md border border-outline-variant/30 font-medium">
          {tag}
        </span>
      </div>
      
      <h3 className="text-[20px] font-bold text-primary mb-2 group-hover:text-secondary transition-colors cursor-pointer">{name}</h3>
      <p className="text-[14px] text-on-surface-variant mb-8 flex-1">{desc}</p>
      
      <div className="mt-auto">
        <div className="flex justify-between font-mono text-[11px] text-on-surface-variant mb-2 font-medium">
          <span>优化进度</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-on-surface-variant hover:text-primary p-2 hover:bg-surface-container-low rounded-md"><MoreVertical className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
