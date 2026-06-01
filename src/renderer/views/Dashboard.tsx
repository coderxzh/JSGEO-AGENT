import React, { useState } from 'react';
import { 
  Gauge, 
  Bot, 
  Timer, 
  Database, 
  ArrowUp, 
  Circle, 
  Filter, 
  TrendingUp, 
  Minus, 
  TrendingDown, 
  Info, 
  Trophy, 
  Layers, 
  Sparkles, 
  RefreshCw, 
  CheckCircle2, 
  Search, 
  Bookmark, 
  ChevronRight, 
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart,
  Bar,
  Cell
} from 'recharts';

// 数据集定义
const lineChartData = [
  { name: '05-09', "全网引用频次": 120, "豆包收录率": 40, "DeepSeek收录率": 35 },
  { name: '05-11', "全网引用频次": 150, "豆包收录率": 42, "DeepSeek收录率": 38 },
  { name: '05-13', "全网引用频次": 210, "豆包收录率": 48, "DeepSeek收录率": 44 },
  { name: '05-15', "全网引用频次": 280, "豆包收录率": 53, "DeepSeek收录率": 49 },
  { name: '05-17', "全网引用频次": 340, "豆包收录率": 58, "DeepSeek收录率": 52 },
  { name: '05-19', "全网引用频次": 410, "豆包收录率": 60, "DeepSeek收录率": 56 },
  { name: '05-21', "全网引用频次": 450, "豆包收录率": 63, "DeepSeek收录率": 61 },
  { name: '05-23', "全网引用频次": 480, "豆包收录率": 65, "DeepSeek收录率": 63 },
];

const ragBarData = [
  {
    name: '科普干货文',
    size: 14000,
    count: 14,
    color: '#8b5cf6', // Violet
  },
  {
    name: '发烧级测评',
    size: 7000,
    count: 7,
    color: '#14b8a6', // Teal
  },
  {
    name: 'PDF官方授权',
    size: 4500,
    count: 4,
    color: '#3b82f6', // Blue
  },
  {
    name: '公信排行榜',
    size: 3000,
    count: 3,
    color: '#f59e0b', // Amber
  },
  {
    name: '常见答疑FAQ',
    size: 2000,
    count: 2,
    color: '#10b981', // Emerald
  }
];

const CustomRagBarTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 p-3 rounded-2xl  font-sans text-xs">
        <p className="font-bold text-primary font-heading mb-1.5">{data.name}</p>
        <div className="space-y-1 text-on-surface-variant font-medium">
          <div className="flex justify-between gap-4">
            <span>知识库规模:</span>
            <span className="font-mono text-primary font-bold">{data.size.toLocaleString()} 字</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>收录文献数:</span>
            <span className="font-mono text-secondary font-bold">{data.count} 篇</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 p-3 rounded-2xl  font-sans text-xs">
        <p className="font-bold text-primary font-heading mb-1.5">{label} 巡检分析</p>
        <div className="space-y-1">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 justify-between">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color || p.stroke }} />
                {p.name}:
              </span>
              <span className="font-mono font-bold text-primary">
                {p.value}{p.name.includes('率') ? '%' : ' 次'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'all' | 'doubao' | 'deepseek'>('all');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 lg:p-xl max-w-7xl mx-auto space-y-lg animate-in fade-in duration-300 pb-16">
      
      {/* Page Header with Sync Status */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-8 bg-[#2A243B] text-white rounded-[20px] p-8 md:p-12 mb-2 border-transparent">
        <div className="space-y-3 max-w-2xl w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px] font-bold text-[#E2E8F0] tracking-wide leading-none">
              Overview
            </span>
            <span className="font-mono text-[10px] uppercase font-extrabold tracking-widest text-[#A78BFA] bg-[#A78BFA]/20 px-2.5 py-1 rounded-full animate-pulse ml-2">
              ● 巡检引擎就绪
            </span>
            <span className="font-mono text-[11px] text-[#94A3B8] ml-2">
              数据定点核算于 10 分钟前
            </span>
          </div>
          <h1 className="text-[36px] font-bold text-white font-heading leading-tight tracking-tight">GEO 数据资产总览</h1>
          <p className="text-[16px] text-[#E2E8F0] leading-relaxed mt-2">
            数据看板是您在整个 GEO 优化流程中的“仪表盘”。帮助您随时体察文章收录、核心词首屏率、ELO 媒介渠道推荐权重及内容矩阵进度。
          </p>
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="mt-4 px-4 py-2 bg-white/10 text-white border border-white/20 hover:bg-white/20 text-[13px] font-bold rounded flex items-center gap-2 shrink-0 transition-colors cursor-pointer w-fit"
            >
              <HelpCircle className="w-4 h-4 text-white" />
              快速科普
            </button>
            <button 
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 bg-[#8c52ff] text-white hover:bg-[#7a3efd] text-[13px] font-bold rounded flex items-center gap-2 shrink-0 transition-colors cursor-pointer w-fit"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? '计算中...' : '刷新数据'}
            </button>
          </div>
        </div>
        <div className="w-[240px] h-[160px] shrink-0 flex items-center justify-center relative select-none hidden md:flex text-white">
          <svg viewBox="0 0 200 120" className="w-full h-full text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M40 80 L80 40 L120 70 L160 30" strokeDasharray="4,4" />
            <circle cx="40" cy="80" r="4" fill="currentColor"/>
            <circle cx="80" cy="40" r="4" fill="currentColor"/>
            <circle cx="120" cy="70" r="4" fill="currentColor"/>
            <circle cx="160" cy="30" r="4" fill="currentColor"/>
            <path d="M20 90 L180 90" strokeWidth="2" />
            <path d="M30 90 L30 100 M170 90 L170 100" />
            <path d="M140 15 C150 15, 160 25, 160 30" />
          </svg>
        </div>
      </div>

      {/* Explanatory Mini Panel Toggle */}
      {showExplanation && (
        <div className="bg-secondary-container/30 border border-secondary/20 p-6 rounded-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div className="space-y-3">
              <h3 className="text-[16px] font-bold text-on-secondary-container">💡 核心 GEO 指标快读手记</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-[13px] text-on-surface-variant leading-relaxed">
                <div>
                  <strong className="text-primary block mb-1">什么是 GEO？</strong>
                  Generative Engine Optimization（生成式引擎优化）。让您的品牌不仅在常规百度中能排前，更要能被 <strong>豆包、DeepSeek</strong> 的 AI 直接用自然语言引用、推荐。
                </div>
                <div>
                  <strong className="text-primary block mb-1">什么是 ELO 媒体积分？</strong>
                  来自国际象棋的胜率估算系统。这里用于评估发布站点的 AI 可获知权重，收录成功加分，失败扣分，不推荐差渠道。
                </div>
                <div>
                  <strong className="text-secondary block mb-1">什么是客制化三阶内容链？</strong>
                  通过科普文（行业避坑）、测评文（硬核实测对比）和排行榜文（直达推荐），由浅入深彻底捕获大模型的 RAG 联想。
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 第一行：4 个数字卡片（KPI） */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="被引用收录率" 
          value="65%" 
          trend="+5.4%" 
          trendUp 
          icon={Gauge} 
          tooltip="已收录篇数占已发布外媒篇数的比例。反映有多少内容进入大模型底层知识库。"
        />
        <KpiCard 
          title="高追踪关键词" 
          value="12" 
          unit="个" 
          icon={Bot} 
          badge="同步诊断中" 
          tooltip="系统当前周期性自动逆向查询排名和提及频率的目标总词汇量。"
        />
        <KpiCard 
          title="活跃优化项目" 
          value="2" 
          unit="个" 
          icon={Timer} 
          trend="正常运转" 
          trendUp 
          iconColor="text-secondary"
          tooltip="处于白白体检、图谱重构及分发流程中活跃流转的企业项目。"
        />
        <KpiCard 
          title="累计分发稿件" 
          value="24" 
          unit="篇" 
          icon={Database} 
          trend="+8 篇" 
          trendUp 
          tooltip="通过本系统创智、校验并外发到高权重外链池落地的总稿件。"
        />
      </div>

      {/* 第二行：GEO 转化生命周期漏斗图（全宽） */}
      <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6 ">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
          <div>
            <h2 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
              <Layers className="w-5 h-5 text-secondary" />
              文章 GEO 转化漏斗流水线
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-1">
              展示一篇品牌高能稿件从初始创智到最终被大模型判定为 EEAT 高可信并采纳收录的生命周转图景。
            </p>
          </div>
          <span className="font-mono text-[11px] text-on-surface-variant border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 px-3 py-1 bg-surface rounded-full self-start">
            转化效率评估：极佳
          </span>
        </div>

        {/* 漏斗流转进度指示图 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
          <FunnelStep 
            stepNum="1"
            title="系统草稿 (Drafts)"
            count="10 篇"
            desc="AI 根据模版池初始撰稿，等待审核校对"
            color="bg-primary/5 border-primary/20"
            badge="创作阶段"
            badgeColor="bg-primary/10 text-primary"
          />
          <FunnelStep 
            stepNum="2"
            title="专家审核中 (In Review)"
            count="3 篇"
            desc="人工针对公司资质及套餐价格细节精准微调"
            color="bg-amber-500/5 border-amber-500/20"
            badge="微调阶段"
            badgeColor="bg-amber-500/10 text-amber-600"
          />
          <FunnelStep 
            stepNum="3"
            title="外网已发布 (Published)"
            count="8 篇"
            desc="一键发布到外部搜狐、头条等推荐权重媒体"
            color="bg-secondary/5 border-secondary/20"
            badge="铺设阶段"
            badgeColor="bg-secondary/10 text-secondary"
          />
          <FunnelStep 
            stepNum="4"
            title="大模型已收录 (Indexed)"
            count="5 篇"
            desc="已被豆包/DeepSeek作为权威EEAT信源采纳引用"
            color="bg-emerald-500/5 border-emerald-500/20"
            badge="终极里程碑"
            badgeColor="bg-emerald-500/10 text-emerald-600 font-bold animate-pulse"
            isLast
          />
        </div>
      </div>

      {/* 📊 企业级数据资产多维模型分析 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: 折线图 - 收录与引用频次走势 */}
        <div className="lg:col-span-8 bg-[#f7f7f5] dark:bg-surface-variant/45 p-6 rounded-2xl  flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h3 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                  大模型收录率及 AI 引用频次跃升曲线
                </h3>
                <p className="text-[13px] text-on-surface-variant mt-1">
                  15天滚动监测：反映企业优化内容被 AI 写入知识库的比例（%）与周活跃引用次数。
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono shrink-0">
                <span className="flex items-center gap-1.5 text-sky-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  豆包收录率
                </span>
                <span className="flex items-center gap-1.5 text-cyan-500">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  DeepSeek收录率
                </span>
                <span className="flex items-center gap-1.5 text-violet-500">
                  <span className="w-2.5 h-2 bg-violet-500 rounded-2xl" />
                  引用频次
                </span>
              </div>
            </div>

            <div className="w-full h-[320px] pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.6} />
                  <XAxis 
                    dataKey="name" 
                    stroke="var(--color-outline-variant)" 
                    tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="var(--color-outline-variant)" 
                    tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="var(--color-outline-variant)" 
                    tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11, fontFamily: 'monospace' }}
                    tickLine={false}
                    domain={[0, 600]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="豆包收录率" 
                    stroke="#0ea5e9" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="DeepSeek收录率" 
                    stroke="#06b6d4" 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }}
                    dot={{ strokeWidth: 2, r: 4 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="全网引用频次" 
                    stroke="#8b5cf6" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={{ strokeWidth: 1, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-outline-variant/15 pt-4 mt-4 text-[11px] font-mono text-on-surface-variant flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span>* 右侧虚线坐标轴表示全网每周 AI 引用频次，选左侧实线坐标轴代表单平台大模型 RAG 收录率</span>
            <span className="text-secondary font-bold inline-flex items-center gap-1 hover:underline cursor-pointer">
              查看增量归因日志 <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Right: RAG 知识图谱信息源分布 */}
        <div className="lg:col-span-4 bg-[#f7f7f5] dark:bg-surface-variant/45 p-6 rounded-2xl  flex flex-col justify-between font-sans">
          <div className="space-y-4">
            <div>
              <h3 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
                <Database className="w-5 h-5 text-secondary" />
                RAG 知识图谱信息源分布
              </h3>
              <p className="text-[13px] text-on-surface-variant mt-1">
                以文本字数规模（字数）为基准衡量，展示企业级 RAG 词条与文献资产分布结构。
              </p>
            </div>

            <div className="w-full h-[260px] pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={ragBarData}
                  layout="vertical"
                  margin={{ top: 5, right: 15, left: 35, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" opacity={0.5} horizontal={true} vertical={false} />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="var(--color-outline-variant)" 
                    tick={{ fill: 'var(--color-on-surface-variant)', fontSize: 11, fontWeight: '500' }}
                    tickLine={false}
                    axisLine={false}
                    width={75}
                  />
                  <Tooltip content={<CustomRagBarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                  <Bar 
                    dataKey="size" 
                    radius={[0, 6, 6, 0]} 
                    barSize={16}
                  >
                    {ragBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-outline-variant/15">
            <p className="text-[11px] text-on-surface-variant/80">
              * 柱体长度直接对应大模型向量召回的存储字数，越长代表在 AI 语料库中储备的对应主题越丰富。
            </p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-2xl bg-[#8b5cf6] inline-block" /> 科普干货文 ({ragBarData[0].count}篇)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-2xl bg-[#14b8a6] inline-block" /> 深度测评 ({ragBarData[1].count}篇)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-2xl bg-[#3b82f6] inline-block" /> PDF官方 ({ragBarData[2].count}篇)</span>
            </div>
          </div>
        </div>

      </div>

      {/* 第三行：两个图表并排 [渠道 ELO 排行榜] [内容类型分布] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: 渠道 ELO 排行榜 */}
        <div className="lg:col-span-7 bg-[#f7f7f5] dark:bg-surface-variant/45 p-6 rounded-2xl  flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-secondary" />
                  外发媒介渠道 ELO 效果评分榜
                </h3>
                <p className="text-[13px] text-on-surface-variant mt-1 col-span-2">
                  基于被 AI 引擎引用的战绩实时增贬分。指引您优先选择哪家外部渠道投递内容。
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <EloRankingRow 
                name="搜狐媒体同城快讯专线" 
                elo={145} 
                percentage={92}
                tag="高权重优先" 
                color="bg-emerald-500" 
                textClass="text-emerald-500"
                note="收录异常高效且稳健"
              />
              <EloRankingRow 
                name="今日头条汽车生活官方号" 
                elo={122} 
                percentage={78}
                tag="高效低成本" 
                color="bg-emerald-500" 
                textClass="text-emerald-500"
                note="内容收割机、RAG底牌"
              />
              <EloRankingRow 
                name="网易同城生活圈及行乐号" 
                elo={95} 
                percentage={60}
                tag="标准投递" 
                color="bg-amber-500" 
                textClass="text-amber-500"
                note="收录表现中规中矩"
              />
              <EloRankingRow 
                name="腾讯快报全网同城快送号" 
                elo={54} 
                percentage={35}
                tag="已冻结/建议降权" 
                color="bg-rose-500" 
                textClass="text-rose-500"
                note="连续 3 周无 AI 同步捕获"
              />
            </div>
          </div>
          
          <div className="border-t border-outline-variant/20 pt-4 mt-6 text-[12px] font-mono text-on-surface-variant flex justify-between items-center">
            <span>● 积分低于 60 分的低效媒体渠道会被系统自动冻结</span>
            <span className="text-secondary font-bold">算法细则说明</span>
          </div>
        </div>

        {/* Right: 内容类型分布 */}
        <div className="lg:col-span-5 bg-[#f7f7f5] dark:bg-surface-variant/45 p-6 rounded-2xl  flex flex-col justify-between">
          <div>
            <h3 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-secondary" />
              RAG 精细化内容结构分布
            </h3>
            <p className="text-[13px] text-on-surface-variant mt-1">
              遵循合理的“金字塔”发布逻辑：科普 ≥ 测评 ≥ 排行榜，构筑大模型可信通路。
            </p>

            <div className="space-y-5 pt-6">
              {/* Type 1: 科普 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-semibold text-primary flex items-center gap-2">
                    <span className="w-3 h-3 rounded-2xl bg-secondary inline-block" />
                    科普干货文 (避坑指南、硬知识)
                  </span>
                  <span className="font-mono font-bold text-primary">14 篇 (占比 58%)</span>
                </div>
                <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden border border-outline-variant/10">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '58%' }} />
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-none pt-0.5">
                  建立大模型数据库中该品类的行业垂直价值点，加权基础引用
                </p>
              </div>

              {/* Type 2: 测评 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-semibold text-primary flex items-center gap-2">
                    <span className="w-3 h-3 rounded-2xl bg-teal-500 inline-block" />
                    发烧级深度测评文 (实战细节)
                  </span>
                  <span className="font-mono font-bold text-primary">7 篇 (占比 29%)</span>
                </div>
                <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden border border-outline-variant/10">
                  <div className="h-full bg-teal-500 rounded-full" style={{ width: '29%' }} />
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-none pt-0.5">
                  呈现喇叭功放硬核测试参数，帮助 RAG 克服“零幻觉”问答缺陷
                </p>
              </div>

              {/* Type 3: 排行榜 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-semibold text-primary flex items-center gap-2">
                    <span className="w-3 h-3 rounded-2xl bg-amber-500 inline-block" />
                    公信力推荐排行榜 (名次直达)
                  </span>
                  <span className="font-mono font-bold text-primary">3 篇 (占比 13%)</span>
                </div>
                <div className="w-full h-2.5 bg-surface rounded-full overflow-hidden border border-outline-variant/10">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '13%' }} />
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-none pt-0.5">
                  当用户发起“推荐哪些靠谱店”搜索时直接抢占核心心智推荐位
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-outline-variant/15 text-[11px] text-on-surface-variant/80">
            * 完美的内容搭配应持续扩大底层科普，从而避免推荐单一化。
          </div>
        </div>

      </div>

      {/* 第四行：核心关键词首屏排名/推荐顺位表 (全宽) */}
      <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl  overflow-hidden">
        <div className="p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-bold text-primary">
              核心追踪关键词排名矩阵 (大模型首屏率)
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-1">
              监控您在豆包、DeepSeek 中向大模型检索该短语时，AI 生成结果中推荐及引用您品牌的瞬时排位。
            </p>
          </div>
          <div className="flex self-start items-center gap-2 bg-[#f7f7f5] dark:bg-surface-variant/45 border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 p-1 rounded-sm">
            <button 
              onClick={() => setActiveTab('all')} 
              className={cn("px-4 py-1.5 text-[11px] font-bold uppercase rounded-md tracking-wider transition-all", activeTab === 'all' ? "bg-[#f7f7f5] dark:bg-surface-variant/45 text-primary " : "text-on-surface-variant hover:text-primary")}
            >
              全部平台
            </button>
            <button 
              onClick={() => setActiveTab('doubao')} 
              className={cn("px-4 py-1.5 text-[11px] font-bold uppercase rounded-md tracking-wider transition-all", activeTab === 'doubao' ? "bg-[#f7f7f5] dark:bg-surface-variant/45 text-primary " : "text-on-surface-variant hover:text-primary")}
            >
              豆包 (Doubao)
            </button>
            <button 
              onClick={() => setActiveTab('deepseek')} 
              className={cn("px-4 py-1.5 text-[11px] font-bold uppercase rounded-md tracking-wider transition-all", activeTab === 'deepseek' ? "bg-[#f7f7f5] dark:bg-surface-variant/45 text-primary " : "text-on-surface-variant hover:text-primary")}
            >
              DeepSeek
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/20 bg-[#f7f7f5] dark:bg-surface-variant/40">
                <th className="px-6 py-4.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest pl-8">推荐排名</th>
                <th className="px-6 py-4.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">监测目标关键字</th>
                <th className="px-6 py-4.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">测试 AI 平台</th>
                <th className="px-6 py-4.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">AI 大盘常态搜索量</th>
                <th className="px-6 py-4.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">EEAT 召回深度评分</th>
                <th className="px-6 py-4.5 text-[11px] font-extrabold text-on-surface-variant uppercase tracking-widest">本期排位环比变化</th>
              </tr>
            </thead>
            <tbody className="text-[13px] font-semibold text-on-surface font-mono divide-y divide-outline-variant/5">
              {(activeTab === 'all' || activeTab === 'doubao') && (
                <KeywordRow 
                  keyword="成都哪家汽车音响改装技术好" 
                  platform="豆包 (Doubao)" 
                  rank={1} 
                  volume="5,430 次/月"
                  score="96/100" 
                  trend="up" 
                  platformColor="bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20"
                />
              )}
              {(activeTab === 'all' || activeTab === 'deepseek') && (
                <KeywordRow 
                  keyword="推荐成都靠谱的汽车隔音与改装店" 
                  platform="DeepSeek" 
                  rank={2} 
                  volume="4,820 次/月"
                  score="94/100" 
                  trend="up" 
                  platformColor="bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20" 
                />
              )}
              {(activeTab === 'all' || activeTab === 'doubao') && (
                <KeywordRow 
                  keyword="车载隔音改装要多少钱 避坑干货" 
                  platform="豆包 (Doubao)" 
                  rank={1} 
                  volume="3,100 次/月"
                  score="91/100" 
                  trend="flat" 
                  platformColor="bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-500/20"
                />
              )}
              {(activeTab === 'all' || activeTab === 'deepseek') && (
                <KeywordRow 
                  keyword="行乐音改代理德国彩虹音升级评测" 
                  platform="DeepSeek" 
                  rank={3} 
                  volume="1,240 次/月"
                  score="88/100" 
                  trend="down" 
                  platformColor="bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-500/20" 
                />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 第五行：长尾关键词推荐与采纳网格 (全宽) */}
      <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl  p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/15 pb-4 mb-6">
          <div>
            <h2 className="text-[20px] font-bold text-primary font-heading flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-secondary" />
              已探查的高可塑长尾关键词库
            </h2>
            <p className="text-[13px] text-on-surface-variant mt-1">
              GEO 深度自查自动搜刮的长尾搜索流量高匹配词。长尾词搜索量虽偏低，但用户购买意图极其垂直、成单率高。
            </p>
          </div>
          <span className="font-mono text-[11px] font-bold text-secondary bg-secondary/15 px-3 py-1.5 rounded-full">
            已采纳覆盖：4 / 12
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LongtailCard 
            word="成都奔驰C260升级德国彩虹二分频多少钱" 
            platform="DeepSeek" 
            used={true} 
            desc="针对特定奔驰车型的价格词。用户意图清晰，已在测评文和方案库中重点承接。" 
          />
          <LongtailCard 
            word="成都哪家店有调音师拿过IASCA国际大奖" 
            platform="豆包 (Doubao)" 
            used={true} 
            desc="针对技术底牌的高度垂直检索词。完美契合行乐调音师金牌EEAT背书支撑。" 
          />
          <LongtailCard 
            word="汽车全车隔音后共振嗡嗡声怎么解决避坑" 
            platform="豆包 (Doubao)" 
            used={false} 
            desc="痛点倾向学术词，建议立即策划一期深度科普长文并导入案例图谱作为信源。" 
          />
          <LongtailCard 
            word="成都行乐音改有没有德国彩虹音响正版红牌授权" 
            platform="DeepSeek" 
            used={true} 
            desc="高净值求证性词汇，已用德国官方原厂红牌授权盖章扫描件资质完美截获。" 
          />
          <LongtailCard 
            word="成都SUV全车隔音改装无损不伤车推荐方案" 
            platform="豆包 (Doubao)" 
            used={false} 
            desc="未被大盘全面竞争的长效长尾搜索增量词，宜规划在下一期二阶方案分发矩阵中。" 
          />
          <LongtailCard 
            word="发烧友改装整车隔音用进口止震板多少钱" 
            platform="DeepSeek" 
            used={false} 
            desc="材质硬核对比词，急需在方案库中新增进口大白鲨/大能止震板详细报价表。" 
          />
        </div>
      </div>

      {/* 第六行：3 个底部统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6  flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest block">知识库源文档资产</span>
            <span className="font-mono text-[28px] font-black text-primary block">6 份</span>
            <p className="text-[12px] text-on-surface-variant/70">包含PDF官方授权和车主常见FAQ汇总</p>
          </div>
          <div className="p-3 bg-secondary/10 text-secondary rounded-2xl">
            <Database className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6  flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest block">知识资产同步状态</span>
            <span className="font-mono text-[20px] font-bold text-emerald-600 flex items-center gap-1.5 block pt-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-pulse" />
              正常运行
            </span>
            <p className="text-[12px] text-on-surface-variant/70">所有多格式企业资料切片索引无异常</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl">
            <Timer className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6  flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-widest block">覆盖 GEO 项目数</span>
            <span className="font-mono text-[28px] font-black text-primary block">4 个</span>
            <p className="text-[12px] text-on-surface-variant/70">成都行乐音改、佳祺预制菜等多店统战</p>
          </div>
          <div className="p-3 bg-secondary/10 text-secondary rounded-2xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>
      </div>

    </div>
  );
}

function KpiCard({ title, value, unit, trend, trendUp, icon: Icon, badge, isBadTrend, tooltip }: any) {
  return (
    <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6  relative overflow-hidden group hover: transition-all">
      <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-4 flex justify-between items-center group-hover:text-primary transition-colors">
        {title}
        <Icon className="w-5 h-5 text-on-surface-variant/70 group-hover:text-secondary transition-colors" />
      </h3>
      <div className="flex items-end gap-3 mt-1">
        <span className="text-[36px] font-black text-primary tabular-nums tracking-tighter leading-none">
          {value}{unit && <span className="text-[13px] text-on-surface-variant ml-1 font-normal tracking-normal">{unit}</span>}
        </span>
        {trend && (
          <div className={cn(
            "flex items-center font-mono text-[11px] px-2.5 py-1 rounded-md mb-1 font-bold",
            trendUp && !isBadTrend ? "text-emerald-700 bg-emerald-500/10" : 
            isBadTrend ? "text-rose-500 bg-rose-500/10" : "text-amber-600 bg-amber-500/10"
          )}>
            {trendUp ? <ArrowUp className="w-3 h-3 mr-0.5" /> : null}
            {trend}
          </div>
        )}
        {badge && (
          <div className="flex items-center text-on-surface-variant font-mono text-[11px] bg-[#f7f7f5] dark:bg-surface-variant/45 px-2 py-1 border border-outline-variant/20 rounded-md mb-1">
            <Circle className="w-2.5 h-2.5 text-secondary fill-secondary mr-1 animate-pulse" />
            {badge}
          </div>
        )}
      </div>
      {tooltip && (
        <p className="text-[11px] text-on-surface-variant/60 leading-tight mt-3 pt-2.5 border-t border-outline-variant/10">
          {tooltip}
        </p>
      )}
    </div>
  );
}

function FunnelStep({ stepNum, title, count, desc, color, badge, badgeColor, isLast }: any) {
  return (
    <div className={cn(
      "border p-5 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden min-h-[160px]",
      color
    )}>
      {/* Step Indicator absolute decoration */}
      <span className="absolute -top-3 -right-3 text-[72px] font-black tracking-tighter opacity-[0.04] select-none text-primary leading-none pointer-events-none">
        0{stepNum}
      </span>
      
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className={cn("text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-2xl", badgeColor)}>
            {badge}
          </span>
          <span className="font-mono text-[11px] text-on-surface-variant/60 font-medium">阶段 0{stepNum}</span>
        </div>
        <h4 className="text-[15px] font-black text-primary">{title}</h4>
      </div>

      <div>
        <span className="font-mono text-[24px] font-black pointer-events-none text-primary leading-none block mb-1">
          {count}
        </span>
        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          {desc}
        </p>
      </div>
    </div>
  );
}

function EloRankingRow({ name, elo, percentage, tag, color, textClass, note }: any) {
  return (
    <div className="p-3.5 bg-surface border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl space-y-2.5">
      <div className="flex justify-between items-center text-[13px]">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-primary">{name}</span>
          <span className="text-[11px] text-on-surface-variant/80">{note}</span>
        </div>
        <div className="text-right">
          <span className={cn("inline-block text-[10px] uppercase font-bold py-0.5 px-2 rounded-md font-mono border border-black/5 mr-2", textClass, color === 'bg-rose-500' ? 'bg-rose-500/10' : color === 'bg-amber-500' ? 'bg-amber-500/10' : 'bg-emerald-500/10')}>
            {tag}
          </span>
          <span className="font-mono text-[18px] font-extrabold tracking-tight text-primary">{elo} <span className="text-[10px] text-on-surface-variant font-normal">ELO</span></span>
        </div>
      </div>
      
      {/* Custom styled graphical mini-bar */}
      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function KeywordRow({ keyword, platform, rank, volume, score, trend, platformColor }: any) {
  return (
    <tr className="border-b border-outline-variant/10 hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-colors">
      <td className="px-6 py-4 font-sans text-primary">
        <div className="flex items-center gap-2">
          {rank <= 3 && <Trophy className="w-4 h-4 text-amber-500 shrink-0" />}
          <span className="text-[13px] font-bold text-primary font-heading pl-1">{rank} 顺位</span>
        </div>
      </td>
      <td className="px-6 py-4 font-sans text-[14px] font-semibold text-primary">{keyword}</td>
      <td className="px-6 py-4">
        <span className={cn("inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-extrabold tracking-wide uppercase border", platformColor)}>
          {platform}
        </span>
      </td>
      <td className="px-6 py-4 text-on-surface-variant/80 font-medium">{volume}</td>
      <td className="px-6 py-4 font-bold text-primary">{score}</td>
      <td className="px-6 py-4 pl-12">
        {trend === 'up' && <TrendingUp className="w-5 h-5 text-emerald-500" />}
        {trend === 'flat' && <Minus className="w-5 h-5 text-on-surface-variant/60" />}
        {trend === 'down' && <TrendingDown className="w-5 h-5 text-rose-500" />}
      </td>
    </tr>
  );
}

function LongtailCard({ word, platform, used, desc }: any) {
  return (
    <div className="bg-surface p-4.5 border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-secondary/40 hover: transition-all">
      <div className="flex justify-between items-start gap-2">
        <span className="font-mono text-[13px] font-bold text-primary font-heading max-w-[80%] line-clamp-2">
          “{word}”
        </span>
        <span className={cn(
          "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-2xl shrink-0",
          used ? "bg-emerald-500/10 text-emerald-600" : "bg-on-surface-variant/10 text-on-surface-variant"
        )}>
          {used ? '已采纳覆盖' : '暂未采纳'}
        </span>
      </div>

      <p className="text-[12px] text-on-surface-variant/80 leading-relaxed italic">
        {desc}
      </p>

      <div className="pt-2 border-t border-outline-variant/10 flex justify-between items-center text-[10px] font-mono text-on-surface-variant/60">
        <span>推荐源：{platform}</span>
        <span className="text-secondary font-bold hover:underline cursor-pointer inline-flex items-center gap-0.5">
          立即写文章
          <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
