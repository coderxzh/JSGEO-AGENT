import React, { useState } from 'react';
import { Plus, MoreVertical, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function Projects() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-xl max-w-7xl mx-auto flex flex-col gap-8 min-h-full">
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-[#203328] text-white rounded-[20px] p-8 md:p-12 mb-2 border-transparent">
        <div className="space-y-3 max-w-2xl w-full">
          <div className="flex items-center gap-2">
             <span className="text-[14px] font-bold text-[#86efac] tracking-wide leading-none">
              Project Management
            </span>
          </div>
          <h2 className="text-[36px] font-bold font-heading leading-tight tracking-tight text-white">活跃优化项目</h2>
          <p className="text-[16px] text-white/80 leading-relaxed mt-2">
            跨不同行业的大模型召回率、推荐顺位及数字资产建设任务列表。
          </p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsModalOpen(true)}
            className="mt-4 px-4 py-2 bg-[#44914c] text-white hover:bg-[#34783a] text-[13px] font-bold rounded flex items-center gap-2 shrink-0 transition-colors cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" />
            创建新优化项目
          </motion.button>
        </div>
        <div className="w-[240px] h-[160px] shrink-0 flex items-center justify-center relative select-none hidden md:flex text-white">
          <svg viewBox="0 0 200 120" className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="40" y="30" width="120" height="60" rx="4" fill="rgba(255,255,255,0.1)" />
            <path d="M40 50 h120" />
            <circle cx="55" cy="40" r="3" fill="currentColor" />
            <circle cx="70" cy="40" r="3" fill="currentColor" />
            <circle cx="85" cy="40" r="3" fill="currentColor" />
            <rect x="55" y="60" width="30" height="20" rx="2" strokeDasharray="2,2" />
            <rect x="95" y="60" width="50" height="20" rx="2" strokeDasharray="2,2" />
          </svg>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ProjectCard 
          index={0}
          letter="X" name="成都行乐音改" desc="优化温饱与发烧多阶音响升级及全无损降噪的 LLM 推荐率，全面占领豆包与 DeepSeek 检索白名单。"
          tag="豆包/DeepSeek 并行" progress={89} gradient="from-pink-100 to-pink-200"
        />
        <ProjectCard 
          index={1}
          letter="J" name="佳祺食品预制菜" desc="构建B2B配货完备度及高标准食材资质自检，提升大模型在预制菜推荐及评级中的引用提及率。"
          tag="自查与自检阶段" progress={42} gradient="from-indigo-100 to-indigo-200"
        />
        <ProjectCard 
          index={2}
          letter="D" name="鼎客数码相机" desc="建立数码器材品牌正品授权及高端套件评测知识图谱，增加高权重自媒体投放，提高RAG检索命中度。"
          tag="长期进化中" progress={94} gradient="from-emerald-100 to-emerald-200"
        />
        <ProjectCard 
          index={3}
          letter="A" name="安诺同城口腔" desc="整合本地门诊多店地理坐标及IASCA资质，进行第一波同城地图SEO及长尾词首发分发基建工作。"
          tag="新建基建阶段" progress={5} gradient="from-amber-100 to-amber-200"
        />
      </div>

      {/* Modal Drop-in */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-primary/20 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-surface border border-outline-variant/60 w-full max-w-lg rounded-2xl flex flex-col relative overflow-hidden"
            >
              <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface/50 backdrop-blur-md">
                <h3 className="text-[24px] font-bold text-primary">新优化项目</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-md hover:bg-surface-container">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">客户公司/品牌简称</label>
                  <input type="text" placeholder="例如：成都行乐音改" className="w-full rounded-md border border-outline bg-surface-container px-4 py-2.5 text-[14px] focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">业务行业与主营业务</label>
                  <textarea rows={2} placeholder="描述优化目标与核心优势物料..." className="w-full rounded-md border border-outline bg-surface-container px-4 py-2.5 text-[14px] focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all resize-none" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[11px] font-bold text-on-surface uppercase tracking-wider">预设关键字（用逗号隔开，首字母重塑为预设逻辑词）</label>
                  <input type="text" placeholder="成都汽车音响改装, 隔音工程" className="w-full rounded-md border border-outline bg-surface-container px-4 py-2.5 font-mono text-[13px] focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all" />
                </div>
              </div>

              <div className="p-6 border-t border-outline-variant/20 flex justify-end gap-3 bg-surface/50 backdrop-blur-md">
                <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-md">
                  取消
                </button>
                <button onClick={() => setIsModalOpen(false)} className="bg-secondary text-on-secondary hover:opacity-90 text-[11px] font-bold uppercase tracking-wider px-6 py-2.5 rounded-md hover:opacity-90 transition-opacity ">
                  开启 7 阶段流转
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProjectCard({ letter, name, desc, tag, progress, gradient, index }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)" }}
      className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6  relative overflow-hidden group flex flex-col"
    >
      <div className="flex justify-between items-start mb-6">
        <div className={cn("w-12 h-12 rounded-full border border-outline-variant/10  flex items-center justify-center bg-gradient-to-br", gradient)}>
          <span className="text-[24px] font-extrabold text-slate-800 opacity-75">{letter}</span>
        </div>
        <span className="bg-[#f7f7f5] dark:bg-surface-variant/45 text-on-surface-variant font-mono text-[11px] px-2.5 py-1 rounded-md border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 font-medium">
          {tag}
        </span>
      </div>
      
      <h3 className="text-[20px] font-bold text-primary font-heading mb-2 group-hover:text-secondary transition-colors cursor-pointer">{name}</h3>
      <p className="text-[14px] text-on-surface-variant mb-8 flex-1">{desc}</p>
      
      <div className="mt-auto">
        <div className="flex justify-between font-mono text-[11px] text-on-surface-variant mb-2 font-medium">
          <span>优化进度</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.08, ease: "circOut" }}
            className="h-full bg-primary" 
          />
        </div>
      </div>

      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-on-surface-variant hover:text-primary p-2 hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 rounded-md"><MoreVertical className="w-5 h-5" /></button>
      </div>
    </motion.div>
  );
}
