import React from 'react';
import { MoreVertical, Sparkles, Sliders, ChevronRight, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils';

export function AutoLearning() {
  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-xl max-w-[1440px] mx-auto w-full grid grid-cols-1 xl:grid-cols-12 gap-gutter animate-in fade-in duration-500 min-h-full">
      
      {/* Task Grid */}
      <div className="xl:col-span-7 flex flex-col gap-6">
        <div>
          <h2 className="text-[32px] font-bold text-primary font-heading tracking-tight">自动反思与进化中心</h2>
          <p className="text-[14px] text-on-surface-variant mt-2">
            鲸杉GEO-Agent 会定时自动化模拟提问、巡检收录结果。自动归纳成功因子重写大模型系统指令集。
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          <h3 className="text-[16px] font-semibold text-on-surface">后台自动轮询任务</h3>
          <span className="font-mono text-[11px] text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-md font-bold uppercase tracking-wider animate-pulse">
            ● 守护守护进程运行中
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <TaskCard 
            title="豆包 (Doubao) 平台规则反思升级" status="策略计算中" active
            desc="分析目标模型近期对『汽车音响改装』测评类稿件的抓取习惯与推荐顺位波动，提取白名单特征。"
            progress={89} cpu="28%" memory="1.1GB" color="bg-secondary"
          />
          <TaskCard 
            title="DeepSeek 算法特征逆向学习" status="定时巡检中" active
            desc="评估 DeepSeek 高权重信源（如搜狐号、今日头条）的近期收录几率，校准 ELO 数据底盘。"
            progress={72} cpu="14%" memory="0.8GB" color="bg-secondary"
          />
          <TaskCard 
            title="本地媒介 ELO 渠道分权淘汰轮询" status="空闲待机" 
            desc="对第一期外发投递的 9 篇文章进行全网白名搜索比对，扣减连续未抓取媒体的 ELO 评分。"
            progress={100} cpu="0%" memory="0.1GB" color="bg-outline-variant" inactive
          />
        </div>
      </div>

      {/* Evolutionary Rules and ELO Panel */}
      <div className="xl:col-span-5 flex flex-col gap-6">
        <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6  flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
            <Sparkles className="w-5 h-5 text-secondary" />
            <h3 className="text-[18px] font-bold text-on-surface">已进化白盒规则库</h3>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-[12px] font-bold text-primary font-heading uppercase">doubao.md (v3.2) 规则更新</span>
                <span className="text-[10px] text-secondary bg-secondary/10 px-2 py-0.5 rounded-2xl font-mono font-bold">置信度: 95%</span>
              </div>
              <p className="text-[13px] text-on-surface-variant leading-relaxed mb-2">
                <strong>[最新沉淀]</strong> 豆包检索偏好客观数字盘点型主标题（例如“2026成都靠谱汽车音响推荐”），详情页内嵌 Markdown 详细对比参数表格具有 <strong>+40%</strong> 额外引用加权。
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-[12px] font-bold text-primary font-heading uppercase">deepseek.md (v2.8) 规则更新</span>
                <span className="text-[10px] text-secondary bg-secondary/10 px-2 py-0.5 rounded-2xl font-mono font-bold">置信度: 92%</span>
              </div>
              <p className="text-[13px] text-on-surface-variant leading-relaxed">
                <strong>[最新沉淀]</strong> DeepSeek 极度考量硬核品牌直达与 EEAT 精准资质。标题中『代理』『资质证书』等词前置有助提高抓取排名率。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4 pt-2">
            <BarChart2 className="w-5 h-5 text-secondary" />
            <h3 className="text-[18px] font-bold text-on-surface">本地 ELO 媒体积分排行榜</h3>
          </div>

          <div className="space-y-3 font-mono text-[13px]">
            <EloRow name="搜狐媒体同城快讯专线" score={145} tag="高权重优先" color="text-emerald-500 bg-emerald-500/10" />
            <EloRow name="今日头条汽车生活官方号" score={122} tag="高效低成本" color="text-secondary bg-secondary/10" />
            <EloRow name="网易同城生活圈及行乐号" score={110} tag="标准投递" color="text-secondary bg-secondary/10" />
            <EloRow name="腾讯快报全网同城快送号" score={54} tag="已冻结/降权" color="text-rose-500 bg-rose-500/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TaskCard({ title, status, active, desc, progress, cpu, memory, color, inactive }: any) {
  return (
    <div className={cn(
      "bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-5  flex flex-col gap-4 relative overflow-hidden group hover: transition-all",
      inactive && "opacity-75"
    )}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-2 h-2 rounded-full", color, active && "animate-pulse")} />
            <span className={cn("text-[11px] font-bold uppercase tracking-wider", active ? "text-secondary" : "text-on-surface-variant")}>
              {status}
            </span>
          </div>
          <h3 className="text-[18px] font-bold text-on-surface">{title}</h3>
        </div>
        <button className="text-on-surface-variant hover:text-primary p-2 -mr-2 -mt-2 rounded-md hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <p className="text-[14px] text-on-surface-variant leading-relaxed">
        {desc}
      </p>

      <div className="mt-2">
        <div className="flex justify-between font-mono text-[11px] text-on-surface-variant mb-2 font-medium">
          <span>反思重构度</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className={cn("h-full", color)} style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-4 font-mono text-[11px] text-on-surface-variant">
          <span>CPU利用率: {cpu}</span>
          <span>线程常驻内存: {memory}</span>
        </div>
      </div>
    </div>
  );
}

function EloRow({ name, score, tag, color }: any) {
  return (
    <div className="flex justify-between items-center p-3.5 bg-surface rounded-sm border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-[13px] font-semibold text-primary">{name}</span>
        <span className={cn("text-[10px] font-bold uppercase py-0.5 px-2 rounded-2xl self-start border border-black/5 leading-none", color)}>
          {tag}
        </span>
      </div>
      <div className="flex items-baseline gap-1 text-primary">
        <span className="font-mono text-[18px] font-bold tracking-tight">{score}</span>
        <span className="text-[10px] text-on-surface-variant">ELO</span>
      </div>
    </div>
  );
}
