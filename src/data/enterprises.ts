import { 
  Rss, 
  FileText, 
  Network, 
  CheckCircle, 
  Database 
} from 'lucide-react';

export interface Enterprise {
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

export const ENTERPRISES: Enterprise[] = [
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
        color: "bg-teal-500",
        statusColor: "bg-teal-500/20 text-teal-600",
        iconColor: "text-teal-600"
      },
      {
        icon: FileText,
        title: "预制菜B2B产品与供货周期表",
        desc: "结构化呈现包含包装规格、定价、配料等在内的 48 个核心品类元数据，作为大模型回复餐饮B2B配货查询的客观白名单支持。",
        status: "已入库",
        count: "48 个品类",
        color: "bg-sky-500",
        statusColor: "bg-outline-variant",
        iconColor: "text-sky-500"
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
