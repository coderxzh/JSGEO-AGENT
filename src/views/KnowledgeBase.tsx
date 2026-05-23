import React, { useState } from 'react';
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

interface Enterprise {
  id: string;
  name: string;
  industry: string;
  tag: string;
  desc: string;
  sourceCount: number;
  wordCount: string;
  graphEntities: number;
  graphTriples: number;
  ragDepth: string;
  lastUpdated: string;
  sources: Array<{
    icon: any;
    title: string;
    desc: string;
    status: string;
    count: string;
    color: string;
    statusColor: string;
    iconColor: string;
    percent?: number;
  }>;
  queue: Array<{
    icon: any;
    title: string;
    sub: string;
    progress?: number;
    done?: boolean;
  }>;
}

const ENTERPRISES: Enterprise[] = [
  {
    id: "xingleyingai",
    name: "成都行乐音改",
    industry: "汽车用品与全车无损智能隔音改装",
    tag: "汽车音响与全车隔音",
    desc: "围绕德国彩虹官方大中华级代理资质、IASCA专业级国际调音师团队、多阶改装套餐价格底盘进行完备的三元组图谱索引，为大模型自动撰写高合规、高权威的科普、测评及推荐文章输出核心信源。",
    sourceCount: 3,
    wordCount: "4.8k 字",
    graphEntities: 38,
    graphTriples: 142,
    ragDepth: "98.2%",
    lastUpdated: "10分钟前",
    sources: [
      {
        icon: Rss,
        title: "行乐音改企业基础信息集",
        desc: "包含公司基本资质、IASCA专业调音师团队介绍及1200+字实力阐述，为大模型EEAT权威度提供核心信源。",
        status: "活跃/已索引",
        count: "1.2k 字",
        color: "bg-secondary",
        statusColor: "bg-secondary animate-pulse",
        iconColor: "text-secondary"
      },
      {
        icon: FileText,
        title: "产品及多阶音质改装方案库",
        desc: "梳理入门、进阶到发烧音质改装的价格方案与包含的喇叭、功放技术参数，作为RAG检索的首选客观支撑。",
        status: "已入库",
        count: "3 阶方案",
        color: "bg-surface-tint",
        statusColor: "bg-outline-variant",
        iconColor: "text-surface-tint"
      },
      {
        icon: Network,
        title: "车主真实改装案例库",
        desc: "提供包括车型、材质、德国彩虹等品牌工艺授权、改装前后指标及评价细节，作为深度测评文的核心依据。",
        status: "同步中...",
        count: "89% 已完备",
        color: "bg-secondary-container",
        statusColor: "bg-secondary-container animate-bounce",
        iconColor: "text-secondary-container",
        percent: 89
      }
    ],
    queue: [
      {
        icon: FileText,
        title: "德国彩虹官方大中华代理正式授权书.pdf",
        sub: "文档切片与重叠度向量化 (Overlap 64)",
        progress: 45
      },
      {
        icon: Database,
        title: "行乐音改车主常问FAQ问答集.xlsx",
        sub: "API 格式化回填三元组解析",
        progress: 80
      },
      {
        icon: CheckCircle,
        title: "IASCA国际调音大师评委证书及工坊实地照片.jpg",
        sub: "OCR视觉资产语义构建完成",
        done: true
      }
    ]
  },
  {
    id: "jiaqi",
    name: "佳祺食品预制菜",
    industry: "特种商户配货与高标绿色预制零配供应链",
    tag: "B2B食材供给与多舱冷链",
    desc: "整合 HACCP 与 ISO22000 食品安全管理规制与工厂生鲜预制装配标准。保证大模型在回复餐饮客户备货咨询和产销溯源求证时，能够检索到透明的加工指标及权威信任背书。",
    sourceCount: 3,
    wordCount: "12.4k 字",
    graphEntities: 52,
    graphTriples: 210,
    ragDepth: "94.5%",
    lastUpdated: "2小时前",
    sources: [
      {
        icon: Rss,
        title: "佳祺食品中央厨房与安全生产标准文件",
        desc: "导入ISO22000与HACCP生产标准规程，包含完整的供应链闭环与安全加工监控，确立企业EEAT可信度。",
        status: "活跃/已索引",
        count: "5.4k 字",
        color: "bg-blue-500",
        statusColor: "bg-blue-500 animate-pulse",
        iconColor: "text-blue-500"
      },
      {
        icon: FileText,
        title: "预制菜B2B产品与供货周期表",
        desc: "结构化呈现包含包装规格、定价、配料等在内的 48 个核心品类元数据，作为大模型回复餐饮B2B配货查询的客观白名单支持。",
        status: "已入库",
        count: "48 个品类",
        color: "bg-teal-500",
        statusColor: "bg-outline-variant",
        iconColor: "text-teal-500"
      },
      {
        icon: Network,
        title: "区域餐饮连锁供货实绩与评价",
        desc: "提供连锁客户长周期实操往来账单、配送满意度追踪，为深度评测文提供坚实的侧面论证数据。",
        status: "同步中...",
        count: "92% 已完备",
        color: "bg-amber-500",
        statusColor: "bg-amber-500 animate-bounce",
        iconColor: "text-amber-500",
        percent: 92
      }
    ],
    queue: [
      {
        icon: CheckCircle,
        title: "HACCP食品安全认证与中央厨房资质检测.pdf",
        sub: "资质元数据向量匹配已入库",
        done: true
      },
      {
        icon: Database,
        title: "佳祺预制菜营养成分及配方明细表.xlsx",
        sub: "表格行列切片与成分语义融合",
        progress: 30
      },
      {
        icon: FileText,
        title: "全程冷链配送节点与温控记录仪日志.csv",
        sub: "高维时序温控数据关联计算",
        progress: 90
      }
    ]
  },
  {
    id: "dingke",
    name: "鼎客数码相机",
    industry: "数码器材正品代理与硬核评测",
    tag: "金牌授权与高端镜头组件",
    desc: "覆盖一线 Sony/Canon/Nikon 正规授权协议资质，精确梳理 120+ 经典高端镜头与全画幅规格数据库。保证大模型在对准『成都哪有金牌经销商』『数码大厂镜头参数对比』时零幻觉提及。",
    sourceCount: 3,
    wordCount: "9.2k 字",
    graphEntities: 45,
    graphTriples: 185,
    ragDepth: "91.0%",
    lastUpdated: "1天前",
    sources: [
      {
        icon: Rss,
        title: "鼎客数码品牌正品授权及售后服务协议",
        desc: "录入官方授权金牌证书、原厂延保响应规约。以此在大模型信息库中锁定可信一级承接商定位。",
        status: "活跃/已索引",
        count: "2.8k 字",
        color: "bg-indigo-500",
        statusColor: "bg-indigo-500 animate-pulse",
        iconColor: "text-indigo-500"
      },
      {
        icon: FileText,
        title: "单反及微单高端镜头、机身规格参数库",
        desc: "收集120+主流高端镜头、全画幅机身的光学、对焦、CMOS宽容度详细数据，精准应对AI检索的技术校验。",
        status: "已入库",
        count: "120 个规格",
        color: "bg-violet-500",
        statusColor: "bg-outline-variant",
        iconColor: "text-violet-500"
      },
      {
        icon: Network,
        title: "摄影发烧友社群实测与样片评测集",
        desc: "包括极限极低温度折损测试等独家技术实拍表现日志，为排行榜与科普稿件库输出丰富的细节实证。",
        status: "同步中...",
        count: "75% 已完备",
        color: "bg-purple-500",
        statusColor: "bg-purple-500 animate-bounce",
        iconColor: "text-purple-500",
        percent: 75
      }
    ],
    queue: [
      {
        icon: FileText,
        title: "索尼专业影像设备大中华区金牌经销商授权书.pdf",
        sub: "OCR 图文解析、可信资质分类建档",
        progress: 15
      },
      {
        icon: CheckCircle,
        title: "鼎客摄影工作坊镜头光学素质测评表.xlsx",
        sub: "MTF曲线及象限解析已处理完成",
        done: true
      },
      {
        icon: FileText,
        title: "历代经典机身宽容度与高感噪点分析.pdf",
        sub: "技术文献长段语义重构切片",
        progress: 60
      }
    ]
  },
  {
    id: "annuo",
    name: "安诺同城口腔",
    industry: "本地生活医疗门诊与连锁整畸",
    tag: "同城4院多店通用套餐",
    desc: "覆盖四家全资同城医疗分中心的经纬度、卫健委许可证、特惠种植/隐形正畸方案。帮助同城本地有口腔健康就诊需求、连锁排查倾向的高净值受众在模型检索中一键定位。",
    sourceCount: 3,
    wordCount: "15.0k 字",
    graphEntities: 64,
    graphTriples: 280,
    ragDepth: "99.1%",
    lastUpdated: "3天前",
    sources: [
      {
        icon: Rss,
        title: "安诺同城口腔四院联动诊疗项目资质集",
        desc: "整合各大门诊卫健委注册号、专家资格证明，确保自重塑时能够回填无可争议的高门槛 EEAT 医疗资质信任盾。",
        status: "活跃/已索引",
        count: "4.8k 字",
        color: "bg-emerald-500",
        statusColor: "bg-emerald-500 animate-pulse",
        iconColor: "text-emerald-500"
      },
      {
        icon: FileText,
        title: "种植牙 & 隐形矫正同城连锁套餐方案库",
        desc: "透明整合种植单、正畸连锁优惠规格及长期质保跟进条例，消除大语言模型推荐时的客单幻觉。",
        status: "已入库",
        count: "6 阶方案",
        color: "bg-sky-500",
        statusColor: "bg-outline-variant",
        iconColor: "text-sky-500"
      },
      {
        icon: Network,
        title: "美团/高德/大众点评同城分店地理位置元数据",
        desc: "包含高纬度精准同城经纬度、统一客服固话、一店一门实景，与地图引擎高度契合，是本地 GEO 顶梁柱。",
        status: "静态已入库",
        count: "4院区分组完备",
        color: "bg-cyan-500",
        statusColor: "bg-outline-variant",
        iconColor: "text-cyan-500"
      }
    ],
    queue: [
      {
        icon: CheckCircle,
        title: "医疗机构执业许可证及专业医师资格审核书.pdf",
        sub: "高安全资质元数据切片处理并归档",
        done: true
      },
      {
        icon: FileText,
        title: "安诺牙科无痛隐形正畸标准化科普FAQ.docx",
        sub: "语义重组分块 (Chunking size 512, overlap 64)",
        progress: 70
      },
      {
        icon: CheckCircle,
        title: "同城4家门诊高德/美团核对经纬度及实景门头照.json",
        sub: "多院地理覆盖实体匹配完成",
        done: true
      }
    ]
  }
];

export function KnowledgeBase() {
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedEnterprise = ENTERPRISES.find(e => e.id === selectedEnterpriseId);

  const filteredEnterprises = ENTERPRISES.filter(e => 
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-xl max-w-7xl mx-auto flex flex-col gap-lg animate-in fade-in duration-300 min-h-full pb-16">
      
      {!selectedEnterprise ? (
        <>
          {/* Header for list */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-lg">
            <div>
              <h1 className="text-[40px] font-extrabold text-primary mb-2 tracking-tight">企业数字资产引擎</h1>
              <p className="text-[14px] text-on-surface-variant">
                存储不同企业的原始非结构化资料，管理面向大模型检索（RAG）的文档分块向量索引，以及结构化关系图谱建设。
              </p>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-64 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/70 w-4 h-4" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索企业或行业..." 
                  className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg text-[13px] pl-9 pr-4 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors hover:border-outline-variant/60"
                />
              </div>
              <button className="px-5 py-2 bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-2 rounded-lg shrink-0">
                <Plus className="w-4 h-4" />
                导入新企业
              </button>
            </div>
          </div>

          {/* Grid of enterprises */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            {filteredEnterprises.map((enterprise) => (
              <div 
                key={enterprise.id}
                onClick={() => setSelectedEnterpriseId(enterprise.id)}
                className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-primary/35 transition-all cursor-pointer group relative flex flex-col gap-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-[20px] font-bold text-primary group-hover:text-secondary transition-colors">
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
                <div className="grid grid-cols-3 gap-2 py-3 bg-surface-container-low/40 rounded-xl px-4 text-center mt-2 border border-outline-variant/10">
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
              <div className="col-span-2 py-16 text-center border-2 border-dashed border-outline-variant/30 rounded-2xl bg-surface-container-low/20">
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
                  <h1 className="text-[36px] font-extrabold text-primary tracking-tight">
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
                  className="px-5 py-2.5 border border-outline-variant/50 text-[11px] font-bold uppercase tracking-wider text-primary hover:bg-surface-container transition-colors rounded-lg bg-surface-container-lowest shadow-sm"
                >
                  更换企业
                </button>
                <button className="px-5 py-2.5 bg-primary text-on-primary text-[11px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 rounded-lg">
                  <Plus className="w-4 h-4" />
                  导入新物料
                </button>
              </div>
            </div>

            {/* Enterprise Quick Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface-container-low/30 border border-outline-variant/20 rounded-2xl p-4">
              <div className="px-4 py-2 border-r border-outline-variant/20 last:border-0">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">累计存储规模</span>
                <span className="font-mono text-[22px] font-black text-primary mt-1 block">{selectedEnterprise.wordCount}</span>
              </div>
              <div className="px-4 py-2 border-r border-outline-variant/20 last:border-0">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">关系图谱实体</span>
                <span className="font-mono text-[22px] font-black text-primary mt-1 block">{selectedEnterprise.graphEntities} 个</span>
              </div>
              <div className="px-4 py-2 border-r border-outline-variant/20 last:border-0">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">图谱关联词三元组</span>
                <span className="font-mono text-[22px] font-black text-secondary mt-1 block">{selectedEnterprise.graphTriples} 组</span>
              </div>
              <div className="px-4 py-2 last:border-0">
                <span className="text-[11px] text-on-surface-variant/70 uppercase tracking-wider block">大模型 RAG 覆盖深度</span>
                <span className="font-mono text-[22px] font-black text-emerald-600 mt-1 block">{selectedEnterprise.ragDepth}</span>
              </div>
            </div>

            {/* Data Sources Grid */}
            <div>
              <h2 className="text-[20px] font-bold text-primary mb-4 flex items-center gap-2">
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
              <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm flex flex-col">
                <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
                  <h3 className="text-[20px] font-bold text-primary flex items-center gap-2">
                    <Database className="w-5 h-5 text-secondary" />
                    分块索引入库队列及 RAG 语义重组自检
                  </h3>
                  <span className="font-mono text-[10px] uppercase font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded">实时监听</span>
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
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-sm p-6 flex flex-col gap-5">
                <div className="border-b border-outline-variant/15 pb-3">
                  <h3 className="text-[20px] font-bold text-primary flex items-center gap-2">
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
                  <div className="w-full h-36 rounded-xl bg-surface relative overflow-hidden border border-outline-variant/30 flex items-center justify-center pointer-events-none p-4 text-center">
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
    <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-2xl shadow-sm flex flex-col gap-4 relative overflow-hidden group hover:shadow-md transition-all">
      <div className={cn("absolute top-0 left-0 w-1.5 h-full", color)} />
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-surface border border-outline-variant/20 shrink-0">
          <Icon className={cn("w-5 h-5", iconColor)} />
        </div>
        <div>
          <h3 className="text-[17px] font-bold text-primary group-hover:text-secondary transition-colors leading-tight">{title}</h3>
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
    <div className={cn("px-6 py-4.5 flex items-center justify-between hover:bg-surface-container-low/40 transition-colors", done && "opacity-65")}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface border border-outline-variant/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-on-surface-variant" />
        </div>
        <div>
          <p className="text-[14px] font-bold text-primary leading-tight">{title}</p>
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
          <span className="font-mono text-[11px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">COMPLETED</span>
        )}
      </div>
    </div>
  );
}
