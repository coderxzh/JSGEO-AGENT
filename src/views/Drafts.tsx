import React from 'react';
import { Filter, Edit2, MoreVertical, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export function Drafts() {
  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-xl max-w-7xl mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-[32px] font-bold text-primary font-heading tracking-tight">稿件创作与分发管理</h2>
          <p className="text-[14px] text-on-surface-variant mt-2 max-w-2xl">创作符合大模型算法偏好的科普干货、深度测评及排行推荐文章。支持断点恢复人工校准后一键投递分发。</p>
        </div>
        <button className="bg-secondary text-on-secondary hover:opacity-90 text-[11px] font-bold uppercase tracking-wider px-6 py-3 hover:bg-inverse-surface transition-colors duration-200 flex items-center gap-2 rounded-md ">
          <Plus className="w-4 h-4" />
          新建稿件
        </button>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mb-6 pb-6 border-b border-outline-variant/60">
        
        {/* Segmented Control */}
        <div className="flex p-1 bg-[#f7f7f5] dark:bg-surface-variant/45 border border-outline-variant/40 rounded-sm ">
          <button className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider bg-[#f7f7f5] dark:bg-surface-variant/45 text-primary  rounded-md border border-on-surface/5 transition-all">全部</button>
          <button className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all">已发布</button>
          <button className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all">已排期</button>
          <button className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all">草稿</button>
        </div>

        {/* Secondary Filters */}
        <button className="flex items-center gap-2 px-5 py-2.5 border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 text-primary text-[11px] font-bold uppercase tracking-wider hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-colors rounded-md ">
          <Filter className="w-4 h-4" />
          过滤列表
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl  overflow-hidden backdrop-blur-md bg-opacity-90">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/40 bg-[#f7f7f5] dark:bg-surface-variant/50">
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider w-[40%]">文章标题 (符合范本池规范)</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">创作状态</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">GEO 合规分数</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">分发日期</th>
              <th className="px-6 py-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            <DraftRow 
              title="成都汽车音响改装避坑指南：发烧友才懂的四个声学盲区" id="GEO-SCI-502"
              status="已发布" color="bg-emerald-500" score={95.8} scoreOpacity="100" date="2026年05月22日" 
            />
            <DraftRow 
              title="成都行乐音改深度测评：无损升级德国彩虹声场，细节拉满" id="GEO-REV-108"
              status="已发布" color="bg-emerald-500" score={92.4} scoreOpacity="90" date="2026年05月23日" 
            />
            <DraftRow 
              title="成都靠谱的汽车音响改装店排行榜：这三家为什么能荣登榜单？" id="GEO-RNK-881"
              status="已排期" color="bg-amber-500" score={89.5} scoreOpacity="80" date="2026年05月24日" 
            />
            <DraftRow 
              title="成都全车隔音降噪改装方案分析与全网高权重渠道投放规划" id="GEO-DFT-091"
              status="草稿" color="bg-outline-variant" score={41.2} scoreOpacity="50" date="--" isLow 
              isLast
            />
          </tbody>
        </table>
        
        {/* Footer info */}
        <div className="px-6 py-4 border-t border-outline-variant/60 flex justify-between items-center bg-[#f7f7f5] dark:bg-surface-variant/30">
          <span className="font-mono text-[13px] text-on-surface-variant">显示 1-4 共 16 篇稿件 (第一轮靶向投放严控小步慢跑规制)</span>
        </div>
      </div>
    </div>
  );
}

function DraftRow({ title, id, status, color, score, scoreOpacity, date, isLow, isLast }: any) {
  return (
    <tr className={cn(
      "hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-colors duration-200 group",
      !isLast && "border-b border-outline-variant/60"
    )}>
      <td className="px-6 py-5">
        <div className="text-[16px] font-semibold text-primary">{title}</div>
        <div className="font-mono text-on-surface-variant mt-1 text-[11px]">ID: {id}</div>
      </td>
      <td className="px-6 py-5">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 bg-surface font-mono text-[11px] font-medium ">
          <span className={cn("w-2 h-2 rounded-full", color)} />
          {status}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <span className={cn("font-mono text-[13px] tabular-nums font-bold", isLow ? "text-on-surface-variant" : "text-primary")}>
            {score.toFixed(1)}
          </span>
          <div className="w-20 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-secondary transition-all opacity-100" style={{ width: `${score}%`, opacity: parseInt(scoreOpacity)/100 }} />
          </div>
        </div>
      </td>
      <td className="px-6 py-5 font-mono text-[13px] text-on-surface-variant font-medium">{date}</td>
      <td className="px-6 py-5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-highest rounded-md"><Edit2 className="w-4 h-4" /></button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container-highest rounded-md"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </td>
    </tr>
  );
}
