import React, { useState } from 'react';
import { Compass, GraduationCap, FileText, Plus, SlidersHorizontal, Mic, ChevronDown, ArrowUp, Brain, Globe } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function AgentStudio() {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("鲸杉GEO-Agent 1.8");
  const models = ["鲸杉GEO-Agent 1.8", "DeepSeek-V3", "Llama-3"];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] relative w-full pt-8 overflow-hidden">
      
      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 lg:px-xl pb-[140px] z-10 scroll-smooth">
        
        {/* Intro */}
        <div className="flex flex-col items-center justify-center mb-12 mt-8">
          <h1 className="text-[32px] font-bold text-primary font-heading leading-tight tracking-tight">
            鲸杉GEO-Agent
          </h1>
          
          {/* Quick Actions */}
          <div className="flex flex-wrap justify-center gap-4 mt-12 max-w-3xl">
            <QuickAction icon={Compass} text="📥 补全成都行乐音改资质 (EEAT基建码)" />
            <QuickAction icon={Globe} text="✨ 一键生成智能托管官网 (AI Web Builder)" />
            <QuickAction icon={GraduationCap} text="🔍 启动豆包/DeepSeek现状并查体检" />
            <QuickAction icon={FileText} text="✍️ 创制温饱/发烧阶梯式内容矩阵" />
          </div>
        </div>

        {/* Chat Thread Mock */}
        <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
          {/* User Message */}
          <div className="flex justify-end w-full">
            <div className="bg-surface-container-high text-on-surface text-[14px] rounded-2xl rounded-tr-sm px-5 py-3 max-w-[75%] ">
              我想对我的本地品牌『成都行乐音改』进行GEO生成式引擎优化，目前我们在豆包和DeepSeek里几乎搜索不到，应该怎么开始？
            </div>
          </div>

          {/* Agent Reply */}
          <div className="flex justify-start w-full">
            
            <div className="flex flex-col gap-3 max-w-[85%]">
              
              {/* Reasoning Block */}
              <div className="backdrop-blur-md bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl px-4 py-2 inline-flex items-center gap-4 self-start cursor-pointer hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-all">
                <div className="flex items-center gap-2 text-secondary">
                  <Brain className="w-4 h-4" />
                  <span className="text-[11px] font-bold uppercase tracking-wider">意图识别: geo_optimization • 已匹配 RAG 引擎</span>
                </div>
                <span className="font-mono text-[13px] text-on-surface-variant border-l border-outline-variant/60 pl-4">0.85s</span>
                <ChevronDown className="w-4 h-4 text-on-surface-variant" />
              </div>

              {/* Message Bubble */}
              <div className="backdrop-blur-md bg-[#f7f7f5] dark:bg-surface-variant/45 text-on-surface text-[14px] border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl rounded-tl-sm p-6 leading-relaxed">
                <p className="mb-4 text-[15px] leading-relaxed">
                  您好！我已经为您加载了 **鲸杉GEO-Agent** 本地服务优化流。我们将通过 **RAG管线 & state-machine 驱动的 7 阶段 GEO 优化流程** 全面重组您品牌在两大主流模型中的推荐 and 召回权重。
                </p>
                
                <p className="mb-4 text-[13px] leading-relaxed">
                  <strong>当前就绪的项目执行路径规划如下：</strong>
                </p>

                <ul className="list-disc pl-5 space-y-2 mb-4 text-[14px] text-on-surface-variant leading-relaxed">
                  <li><strong>阶段一：建立自建知识库与词条重塑</strong> — 提取您的德国彩虹代理资质、IASCA 认证案例及 1200+ 字公司背书，将原始词『成都汽车音响』演进为带有地区标识的预设核心词。</li>
                  <li><strong>阶段二：大模型白盒现状自查（体检）</strong> — 双通道并行诊断『豆包』和『DeepSeek』中无法召回品牌的原因，截获 AI 原生偏好的标题范本与其推荐排行高权重外链。</li>
                  <li><strong>阶段三：三元组图谱重构</strong> — 切片结构化生成『门店库、方案库、改装案例库、咨询QA问答库』。</li>
                </ul>

                {/* Data Bento inside chat */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 border border-outline-variant/20 rounded-2xl p-4">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-2">知识库就绪状态</span>
                    <span className="font-mono text-[13px] text-secondary font-semibold tracking-tight">已导入 3 大源文件 • EEAT 锚点就绪</span>
                  </div>
                  <div className="bg-[#f7f7f5] dark:bg-surface-variant/45 border border-outline-variant/20 rounded-2xl p-4">
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
        <div className="max-w-4xl mx-auto relative2">
          <div className="backdrop-blur-xl bg-[#f7f7f5] dark:bg-surface-variant/45  hover: focus-within: p-4 pb-3 flex flex-col transition-all rounded-2xl">
            {/* Top row: Text area for premium layout */}
            <textarea 
              className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-on-surface placeholder:text-on-surface-variant/40 px-2 py-1 min-h-[50px] max-h-[160px] focus:ring-0 leading-relaxed" 
              placeholder="Do anything with AI..." 
              rows={2}
            />
            
            {/* Bottom row: Operational Bar */}
            <div className="flex items-center justify-between mt-3 pt-1 border-t border-outline-variant/5">
              {/* Left group: Add and Settings Sliders */}
              <div className="flex items-center gap-1">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-colors" 
                  title="添加/附件"
                >
                  <Plus className="w-5 h-5" />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-colors" 
                  title="配置选项"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </motion.button>
              </div>
              
              {/* Right group: Model select dropdown, microphone, and submit button */}
              <div className="flex items-center gap-2.5">
                {/* Model dropdown */}
                <div className="relative">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    className="flex items-center gap-1.5 bg-transparent px-3 py-1.5 rounded-2xl hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-colors cursor-pointer font-sans text-[12px] text-on-surface-variant/75 hover:text-primary font-medium"
                  >
                    {selectedModel === "鲸杉GEO-Agent 1.8" ? "Auto" : selectedModel}
                    <ChevronDown className={cn("w-3.5 h-3.5 text-on-surface-variant/50 transition-transform", isModelDropdownOpen && "rotate-180")} />
                  </motion.button>
                  
                  <AnimatePresence>
                    {isModelDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full right-0 mb-2 w-48 bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl  overflow-hidden flex flex-col py-1.5 z-50"
                      >
                        {models.map(model => (
                          <button
                            key={model}
                            onClick={() => {
                              setSelectedModel(model);
                              setIsModelDropdownOpen(false);
                            }}
                            className={cn(
                              "px-4 py-2 text-left font-mono text-[11px] uppercase tracking-wider transition-colors",
                              selectedModel === model 
                                ? "bg-secondary/10 text-secondary font-bold" 
                                : "text-on-surface hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 hover:text-primary font-medium"
                            )}
                          >
                            {model}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Microphone / Voice button */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 transition-colors" 
                  title="语音输入"
                >
                  <Mic className="w-4 h-4" />
                </motion.button>

                {/* Circular Send Arrow button */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-8 h-8 rounded-full bg-surface-container-high/60 text-on-surface-variant hover:text-primary hover:bg-surface-container-high flex items-center justify-center transition-all" 
                  title="发送"
                >
                  <ArrowUp className="w-4 h-4" />
                </motion.button>
              </div>
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
    <motion.button 
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="backdrop-blur-md bg-[#f7f7f5] dark:bg-surface-variant/70 border-transparent bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl px-5 py-3  hover:border-secondary hover: transition-all text-[14px] text-on-surface flex items-center gap-3 cursor-pointer"
    >
      <Icon className="text-secondary w-5 h-5" />
      {text}
    </motion.button>
  );
}
