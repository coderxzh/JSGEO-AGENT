import React, { useEffect, useMemo, useState } from 'react';
import { FolderOpen, MoreVertical, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

const STAGE_SHORT_LABELS: Record<number, string> = {
  1: '知识库',
  2: '问题池',
  3: '信源发现',
  4: '内容生成',
  5: '发布管理',
  6: '可见性检测',
  7: '反思优化',
};

const STAGE_DESCRIPTIONS: Record<number, string> = {
  1: '企业知识库已建立',
  2: '基于企业画像生成 AI 问题池',
  3: '使用豆包助手联网发现真实信源',
  4: '生成支撑文章与排行榜文章草稿',
  5: '稿件校对、预览、发布与订单同步',
  6: '检测 AI 推荐可见性与排名变化',
  7: '基于可见性结果生成并确认优化规则',
};

const GRADIENTS = [
  'from-pink-100 to-pink-200',
  'from-indigo-100 to-indigo-200',
  'from-emerald-100 to-emerald-200',
  'from-amber-100 to-amber-200',
  'from-sky-100 to-sky-200',
  'from-rose-100 to-rose-200',
  'from-violet-100 to-violet-200',
  'from-teal-100 to-teal-200',
];

const PLATFORM_LABELS: Record<string, string> = {
  doubao: '豆包',
  deepseek: 'DeepSeek',
};

export function Projects() {
  const [projects, setProjects] = useState<GeoAgentProjectSummaryWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = async () => {
    if (!window.geoAgent?.getProjectSummaries) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await window.geoAgent.getProjectSummaries();
      setProjects(response.projects ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    const handleRefresh = () => loadProjects();
    window.addEventListener('geo-agent-enterprises-refresh', handleRefresh);
    return () => window.removeEventListener('geo-agent-enterprises-refresh', handleRefresh);
  }, []);

  const handleToggleReflection = async (projectId: string, enabled: boolean) => {
    if (!window.geoAgent?.setReflectionEnabled) return;

    try {
      await window.geoAgent.setReflectionEnabled(projectId, enabled);
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, reflection_enabled: enabled } : p))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

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

      {/* Toolbar */}
      <div className="flex items-center justify-end">
        <button
          onClick={loadProjects}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          刷新
        </button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 text-[13px] text-red-700 dark:text-red-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6 h-[280px] animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-outline-variant/70 bg-surface/70 p-12 text-center">
          <FolderOpen className="mx-auto size-8 text-on-surface-variant" />
          <h3 className="mt-3 text-[16px] font-bold text-primary">暂无企业项目</h3>
          <p className="mt-2 text-[13px] text-on-surface-variant">
            请先在知识库中录入企业资料，录入后此处会自动展示项目进度。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <div key={project.id}>
              <ProjectCard
                project={project}
                index={index}
                onToggleReflection={(enabled) => handleToggleReflection(project.id, enabled)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  index,
  onToggleReflection,
}: {
  project: GeoAgentProjectSummaryWithProgress;
  index: number;
  onToggleReflection: (enabled: boolean) => void;
}) {
  const letter = useMemo(() => {
    const name = project.company_name || project.name || '';
    return name.charAt(0).toUpperCase();
  }, [project.company_name, project.name]);

  const gradient = GRADIENTS[index % GRADIENTS.length];
  const reachedReflection =
    project.platforms.doubao.stage_7.status !== 'not_started' ||
    project.platforms.deepseek.stage_7.status !== 'not_started';

  const tag = useMemo(() => {
    if (project.overall_progress >= 90) return '长期进化中';
    if (project.overall_progress >= 60) return '豆包/DeepSeek 并行';
    if (project.overall_progress >= 30) return '自查与自检阶段';
    return '新建基建阶段';
  }, [project.overall_progress]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)' }}
      className="bg-[#f7f7f5] dark:bg-surface-variant/45 rounded-2xl p-6 relative overflow-hidden group flex flex-col"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn('w-12 h-12 rounded-full border border-outline-variant/10 flex items-center justify-center bg-gradient-to-br', gradient)}>
          <span className="text-[24px] font-extrabold text-slate-800 opacity-75">{letter}</span>
        </div>
        <span className="text-on-surface-variant font-mono text-[11px] px-2.5 py-1 rounded-md border border-outline-variant/10 bg-white/60 dark:bg-surface-variant/60 font-medium">
          {tag}
        </span>
      </div>

      <h3 className="text-[20px] font-bold text-primary font-heading mb-1 group-hover:text-secondary transition-colors cursor-pointer">
        {project.company_name || project.name}
      </h3>
      <p className="text-[12px] text-on-surface-variant/70 mb-4">
        {project.industry_category || '未填写行业'}
      </p>

      <div className="space-y-3 mb-5">
        {(['doubao', 'deepseek'] as const).map((platform) => (
          <div key={platform}>
            <StageTimeline
              platform={platform}
              stage1={project.stage_1}
              stages={project.platforms[platform]}
            />
          </div>
        ))}
      </div>

      {reachedReflection && (
        <div className="flex items-center justify-between mb-5 px-3 py-2 rounded-lg bg-surface-container/50 border border-outline-variant/10">
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-primary">反思优化</span>
            <span className="text-[10px] text-on-surface-variant">
              {project.reflection_enabled ? '自动学习调度器会处理该企业' : '自动学习调度器会忽略该企业'}
            </span>
          </div>
          <ReflectionToggle enabled={project.reflection_enabled} onChange={onToggleReflection} />
        </div>
      )}

      <div className="mt-auto">
        <div className="flex justify-between font-mono text-[11px] text-on-surface-variant mb-2 font-medium">
          <span>优化进度</span>
          <span>{project.overall_progress}%</span>
        </div>
        <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${project.overall_progress}%` }}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.08, ease: 'circOut' }}
            className="h-full bg-primary"
          />
        </div>
      </div>

      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="text-on-surface-variant hover:text-primary p-2 hover:bg-[#f7f7f5] dark:hover:bg-surface-variant/45 rounded-md">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function StageTimeline({
  platform,
  stage1,
  stages,
}: {
  platform: 'doubao' | 'deepseek';
  stage1: GeoAgentProjectStageStatus;
  stages: GeoAgentProjectPlatformStages;
}) {
  const stageList = [
    stage1,
    stages.stage_2,
    stages.stage_3,
    stages.stage_4,
    stages.stage_5,
    stages.stage_6,
    stages.stage_7,
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-medium text-on-surface-variant w-14 shrink-0">
          {PLATFORM_LABELS[platform]}
        </span>
        <div className="flex items-center flex-1">
          {stageList.map((stage, idx) => (
            <React.Fragment key={stage.key}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 cursor-pointer">
                    <StageDot status={stage.status} pendingRules={stage.pending_rules} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[11px]">
                  <div className="font-medium">{stage.label}</div>
                  <div className="text-on-background/70">{STAGE_DESCRIPTIONS[stage.stage]}</div>
                  {stage.pending_rules !== undefined && stage.pending_rules > 0 && (
                    <div className="mt-1 text-amber-300">待确认规则：{stage.pending_rules} 条</div>
                  )}
                </TooltipContent>
              </Tooltip>
              {idx < stageList.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 min-w-[8px] mx-0.5',
                    stage.status === 'completed' ? 'bg-primary' : 'bg-outline-variant/30'
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function StageDot({ status, pendingRules }: { status: string; pendingRules?: number }) {
  if (status === 'completed') {
    return (
      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === 'pending' || pendingRules && pendingRules > 0) {
    return (
      <div className="relative w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
        <span className="relative text-[9px] font-bold text-white">{pendingRules || ''}</span>
      </div>
    );
  }

  if (status === 'ready' || status === 'in_progress') {
    return (
      <div className="w-5 h-5 rounded-full border-2 border-primary bg-surface" />
    );
  }

  return (
    <div className="w-5 h-5 rounded-full border-2 border-outline-variant/40 bg-surface" />
  );
}

function ReflectionToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        enabled ? 'bg-primary' : 'bg-surface-container border border-outline-variant'
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
          enabled ? 'translate-x-4.5' : 'translate-x-0.5'
        )}
        style={{ marginTop: '1.5px' }}
      />
    </button>
  );
}
