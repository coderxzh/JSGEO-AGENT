import React, { useState } from 'react';
import { Compass, GraduationCap, FileText, PlusCircle, Mic, ChevronDown, ArrowUp, Brain } from 'lucide-react';
import { cn } from '../lib/utils';

export function AgentStudio() {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("鲸杉GEO-Agent 1.8");
  const models = ["鲸杉GEO-Agent 1.8", "DeepSeek-V3", "Llama-3"];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] relative w-full pt-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-xl pb-[140px] z-10 scroll-smooth">
        
        {/* Intro */}
        <div className="flex flex-col items-center justify-center mb-12 mt-8">
          <h1 className="text-[40px] font-extrabold text-primary tracking-tight whitespace-nowrap">鲸杉GEO-Agent</h1>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4 mt-12 max-w-3xl">
            <QuickAction icon={Compass} text="📥 补全成都行乐音改资质 (EEAT基建码)" />
            <QuickAction icon={GraduationCap} text="🔍 启动豆包/DeepSeek现状并查体检" />
            <QuickAction icon={FileText} text="✍️ 创制温饱/发烧阶梯式内容矩阵" />
          </div>
        </div>

        {/* Chat Thread Mock */}
        <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
          {/* User Message */}
          <div className="flex justify-end w-full">
            <div className="bg-primary text-on-primary text-[14px] rounded-2xl rounded-tr-sm px-5 py-3 max-w-[75%] shadow-sm">
              我想对我的本地品牌『成都行乐音改』进行GEO生成式引擎优化，目前我们在豆包和DeepSeek里几乎搜索不到，应该怎么开始？
            </div>
          </div>

          {/* Agent Reply */}
          <div className="flex justify-start w-full relative pl-8">
            <div className="absolute left-0 top-0 w-4 h-4 rounded-full bg-secondary shadow-[0_0_8px_rgba(113,42,226,0.6)]" />
            
            <div className="flex flex-col gap-3 max-w-[85%]">
              
              {/* Reasoning Block */}
              <div className="backdrop-blur-md bg-surface-container-lowest/80 border border-outline-variant/30 rounded-xl px-4 py-2 inline-flex items-center gap-4 self-start cursor-pointer hover:bg-surface-container-lowest shadow-sm transition-all">
                <div className="flex items-center gap-2 text-secondary">
                  <Brain className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">意图识别: geo_optimization • 已匹配 RAG 引擎</span>
                </div>
                <span className="font-mono text-[13px] text-on-surface-variant border-l border-outline-variant/30 pl-4">0.85s</span>
                <ChevronDown className="w-4 h-4 text-on-surface-variant" />
              </div>

              {/* Message Bubble */}
              <div className="backdrop-blur-md bg-surface/90 text-on-surface text-[14px] border border-outline-variant/30 rounded-2xl rounded-tl-sm p-5 shadow-sm">
                <p className="mb-4 text-[15px] leading-relaxed">
                  您好！我已经为您加载了 **鲸杉GEO-Agent** 本地服务优化流。我们将通过 **RAG管线 & state-machine 驱动的 7 阶段 GEO 优化流程** 全面重组您品牌在两大主流模型中的推荐和召回权重。
                </p>
                
                <p className="mb-4 text-[15px] leading-relaxed">
                  <strong>当前就绪的项目执行路径规划如下：</strong>
                </p>

                <ul className="list-disc pl-5 space-y-2 mb-4 text-[14px] text-on-surface-variant leading-relaxed">
                  <li><strong>阶段一：建立自建知识库与词条重塑</strong> — 提取您的德国彩虹代理资质、IASCA 认证案例及 1200+ 字公司背书，将原始词『成都汽车音响』演进为带有地区标识的预设核心词。</li>
                  <li><strong>阶段二：大模型白盒现状自查（体检）</strong> — 双通道并行诊断『豆包』和『DeepSeek』中无法召回品牌的原因，截获 AI 原生偏好的标题范本与其推荐排行高权重外链。</li>
                  <li><strong>阶段三：三元组图谱重构</strong> — 切片结构化生成『门店库、方案库、改装案例库、咨询QA问答库』。</li>
                </ul>

                {/* Data Bento inside chat */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">知识库就绪状态</span>
                    <span className="font-mono text-[13px] text-secondary font-semibold tracking-tight">已导入 3 大源文件 • EEAT 锚点就绪</span>
                  </div>
                  <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">候选关键词探测线</span>
                    <span className="font-mono text-[13px] text-emerald-600 font-semibold tracking-tight">行乐音改汽车音响、成都专业隔音降噪</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full p-lg bg-gradient-to-t from-background via-background to-transparent z-20 pb-8">
        <div className="max-w-4xl mx-auto relative">
          <div className="backdrop-blur-xl bg-surface/90 border border-outline-variant/40 shadow-xl p-2 flex items-end gap-3 transition-all rounded-2xl focus-within:ring-2 focus-within:ring-secondary/20">
            <div className="flex items-center gap-2 pl-2 pb-2 shrink-0">
              <button className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors">
                <PlusCircle className="w-6 h-6" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors">
                <Mic className="w-6 h-6" />
              </button>
            </div>
            
            <textarea 
              className="flex-1 bg-transparent border-none outline-none resize-none text-[15px] text-on-surface placeholder:text-on-surface-variant/50 py-3 max-h-[120px] focus:ring-0 leading-relaxed" 
              placeholder="指示 鲸杉GEO-Agent..." 
              rows={1}
            />
            
            <div className="flex items-center gap-3 pr-1 pb-1 shrink-0">
              <div className="relative">
                <button 
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center gap-2 bg-transparent px-3 py-2 rounded-xl hover:bg-surface-container-low transition-colors cursor-pointer font-mono text-[11px] text-on-surface-variant hover:text-primary uppercase tracking-wider font-bold"
                >
                  {selectedModel}
                  <ChevronDown className={cn("w-4 h-4 text-on-surface-variant/60 transition-transform", isModelDropdownOpen && "rotate-180")} />
                </button>
                
                {isModelDropdownOpen && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-lg overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200">
                    {models.map(model => (
                      <button
                        key={model}
                        onClick={() => {
                          setSelectedModel(model);
                          setIsModelDropdownOpen(false);
                        }}
                        className={cn(
                          "px-4 py-2.5 text-left font-mono text-[11px] uppercase tracking-wider transition-colors",
                          selectedModel === model 
                            ? "bg-secondary/10 text-secondary font-bold" 
                            : "text-on-surface hover:bg-surface-container-low hover:text-primary font-medium"
                        )}
                      >
                        {model}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="w-10 h-10 rounded-xl bg-secondary text-white flex items-center justify-center hover:brightness-110 shadow-md shadow-secondary/30 transition-all">
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="text-center mt-4">
            <span className="font-mono text-[10px] text-on-surface-variant/50 tracking-widest uppercase font-bold">
              鲸杉GEO-Agent Studio • 安全处理空间数据
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <button className="backdrop-blur-md bg-surface-container-lowest/70 border border-outline-variant/30 rounded-xl px-5 py-3 shadow-sm hover:border-secondary hover:shadow-md transition-all text-[14px] text-on-surface flex items-center gap-3">
      <Icon className="text-secondary w-5 h-5" />
      {text}
    </button>
  );
}
