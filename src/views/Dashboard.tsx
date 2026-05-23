import React from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Gauge, Bot, Timer, Database, ArrowUp, Circle, Filter, TrendingUp, Minus, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

const chartData = [
  { name: '周一', value: 100 },
  { name: '周二', value: 180 },
  { name: '周三', value: 150 },
  { name: '周四', value: 210 },
  { name: '周五', value: 190 },
  { name: '周六', value: 285 },
];

export function Dashboard() {
  return (
    <div className="p-xl max-w-7xl mx-auto space-y-lg animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-xl">
        <div>
          <h1 className="text-[40px] font-extrabold text-primary mb-1 tracking-tight leading-none">GEO 数据资产总览</h1>
          <p className="text-[16px] text-on-surface-variant">大模型推荐率、媒介收录权重与算法索引效果实时诊断。</p>
        </div>
        <button className="bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider px-6 py-2 hover:bg-inverse-surface transition-colors flex items-center gap-2 shadow-sm rounded-md">
          刷新数据
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KpiCard title="综合收录推荐率" value="86.4%" trend="+3.2%" trendUp icon={Gauge} />
        <KpiCard title="大模型覆盖词数" value="124" unit="个" icon={Bot} badge="实时监听中" />
        <KpiCard title="大模型平均响应" value="42" unit="ms" trend="-8ms" trendUp icon={Timer} />
        <KpiCard title="已分发渠道稿件" value="1.4" unit="k篇" trend="+84" trendUp icon={Database} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter mt-xl">
        {/* Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-xl shadow-sm">
          <div className="flex justify-between items-center mb-xl">
            <div>
              <h2 className="text-[24px] font-bold text-primary">推荐率变化趋势</h2>
              <p className="text-[14px] text-on-surface-variant mt-1">最近30天内大模型搜索回复中提及品牌的概率</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-1 border border-outline-variant/50 rounded-md text-[11px] font-bold text-on-surface bg-surface-container-low uppercase tracking-wider">30日</button>
              <button className="px-4 py-1 border border-outline-variant/30 rounded-md text-[11px] font-bold text-on-surface-variant hover:bg-surface-container-low transition-colors uppercase tracking-wider">90日</button>
            </div>
          </div>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#712ae2" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#712ae2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cfc4c5' }}
                  itemStyle={{ color: '#000' }}
                />
                <Area type="monotone" dataKey="value" stroke="#712ae2" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Status Panel */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-xl shadow-sm flex flex-col">
          <h2 className="text-[24px] font-bold text-primary mb-lg">GEO 管线状态</h2>
          <div className="flex-1 flex flex-col gap-4">
            <StatusRow title="RAG 知识图谱检索引擎" status="正常运作" on />
            <StatusRow title="媒介分发集成网关" status="正常运作" on />
            <StatusRow title="全自动进化轮询守护进程" status="轮询同步中" color="bg-amber-500" textColor="text-amber-500" />
          </div>
          <button className="w-full mt-lg py-3 rounded-md border border-primary text-primary text-[11px] font-bold uppercase tracking-wider hover:bg-primary hover:text-on-primary transition-colors">
            查看引擎日志
          </button>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm overflow-hidden mt-xl">
        <div className="p-xl border-b border-outline-variant/30 flex justify-between items-center">
          <h2 className="text-[24px] font-bold text-primary">高转化核心关键词排名 (GEO)</h2>
          <button className="text-on-surface-variant hover:text-primary transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                <th className="p-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">目标搜索词</th>
                <th className="p-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">首选/推荐渠道</th>
                <th className="p-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">大模型推荐顺位</th>
                <th className="p-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">EEAT 质量评分</th>
                <th className="p-4 text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">收录趋势</th>
              </tr>
            </thead>
            <tbody className="text-[13px] font-medium font-mono text-on-surface">
              <KeywordRow keyword="成都哪家汽车音响改装技术好" platform="豆包 (Doubao)" rank={1} score="96/100" trend="up" />
              <KeywordRow keyword="推荐成都靠谱的汽车隔音与改装店" platform="DeepSeek" rank={2} score="94/100" trend="up" platformColor="bg-blue-50 text-blue-700 border-blue-200" />
              <KeywordRow keyword="车载隔音改装要多少钱 避坑干货" platform="豆包 (Doubao)" rank={1} score="91/100" trend="flat" />
              <KeywordRow keyword="行乐音改代理德国彩虹音升级评测" platform="DeepSeek" rank={3} score="88/100" trend="down" platformColor="bg-blue-50 text-blue-700 border-blue-200" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, unit, trend, trendUp, icon: Icon, badge, isBadTrend }: any) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-lg shadow-sm relative overflow-hidden">
      <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex justify-between items-center">
        {title}
        <Icon className="w-5 h-5 text-outline" />
      </h3>
      <div className="flex items-end gap-3">
        <span className="text-[32px] font-bold text-primary tabular-nums tracking-tighter leading-none">
          {value}{unit && <span className="text-[14px] text-on-surface-variant ml-1 font-normal tracking-normal">{unit}</span>}
        </span>
        {trend && (
          <div className={cn(
            "flex items-center font-mono text-[11px] px-2 py-0.5 rounded-sm mb-1 font-medium",
            trendUp && !isBadTrend ? "text-emerald-600 bg-emerald-500/10" : 
            isBadTrend ? "text-rose-500 bg-rose-500/10" : "text-amber-500 bg-amber-500/10"
          )}>
            {trendUp ? <ArrowUp className="w-3 h-3 mr-0.5" /> : null}
            {trend}
          </div>
        )}
        {badge && (
          <div className="flex items-center text-on-surface-variant font-mono text-[11px] bg-surface-container-low px-2 py-0.5 rounded-sm mb-1">
            <Circle className="w-3 h-3 text-emerald-500 fill-emerald-500 mr-1" />
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({ title, status, on, color, textColor }: any) {
  return (
    <div className="flex justify-between items-center p-4 bg-surface-container-low rounded-lg border border-outline-variant/20">
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full", on ? "bg-emerald-500" : color)} />
        <span className="text-[14px] text-on-surface font-semibold">{title}</span>
      </div>
      <span className={cn("font-mono text-[12px]", on ? "text-on-surface-variant" : textColor)}>{status}</span>
    </div>
  );
}

function KeywordRow({ keyword, platform, rank, score, trend, platformColor = "bg-blue-50 text-blue-700 border-blue-200" }: any) {
  return (
    <tr className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors">
      <td className="p-4 font-sans text-[14px] font-medium text-primary">{keyword}</td>
      <td className="p-4">
        <span className={cn("inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase border", platformColor)}>
          {platform}
        </span>
      </td>
      <td className="p-4">
        {rank <= 3 ? (
          <div className={cn(
            "inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] text-white font-bold",
            rank === 1 ? "bg-secondary" : rank === 2 ? "bg-secondary/80" : "bg-outline-variant text-primary"
          )}>{rank}</div>
        ) : (
          <div className="pl-[8px] text-on-surface-variant">{rank}</div>
        )}
      </td>
      <td className="p-4">{score}</td>
      <td className="p-4">
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-500" />}
        {trend === 'flat' && <Minus className="w-5 h-5 text-on-surface-variant" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-rose-500" />}
      </td>
    </tr>
  );
}
