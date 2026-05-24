const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    } else {
      if (file.endsWith('.tsx')) {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const viewsDir = './src/views';
const files = walkSync(viewsDir);

const illustrations = {
  'Dashboard.tsx': `<div className="w-[180px] h-[130px] shrink-0 bg-surface-variant/40 rounded-lg p-4 flex items-center justify-center relative select-none hidden md:flex">
          <svg viewBox="0 0 200 120" className="w-full h-full text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M40 80 L80 40 L120 70 L160 30" strokeDasharray="4,4" />
            <circle cx="40" cy="80" r="4" fill="currentColor"/>
            <circle cx="80" cy="40" r="4" fill="currentColor"/>
            <circle cx="120" cy="70" r="4" fill="currentColor"/>
            <circle cx="160" cy="30" r="4" fill="currentColor"/>
            <path d="M20 90 L180 90" strokeWidth="2" />
            <path d="M30 90 L30 100 M170 90 L170 100" />
            <path d="M140 15 C150 15, 160 25, 160 30" />
          </svg>
          <span className="absolute bottom-2 right-2 text-[9px] font-mono text-on-surface-variant/40">Data Overview</span>
        </div>`,
  'KnowledgeBase.tsx': `<div className="w-[180px] h-[130px] shrink-0 bg-surface-variant/40 rounded-lg p-4 flex items-center justify-center relative select-none hidden md:flex">
          <svg viewBox="0 0 200 120" className="w-full h-full text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M60 20 h80 v80 h-80 z" fill="#ffffff" />
            <path d="M70 40 h60 M70 60 h60 M70 80 h40" strokeDasharray="3,3" />
            <path d="M50 30 h10 v70 h-10 z" fill="#ffffff" />
            <circle cx="150" cy="30" r="12" fill="#ffffff" />
            <path d="M150 42 L150 55" />
          </svg>
          <span className="absolute bottom-2 right-2 text-[9px] font-mono text-on-surface-variant/40">Knowledge Base</span>
        </div>`,
  'Projects.tsx': `<div className="w-[180px] h-[130px] shrink-0 bg-surface-variant/40 rounded-lg p-4 flex items-center justify-center relative select-none hidden md:flex">
          <svg viewBox="0 0 200 120" className="w-full h-full text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="40" y="30" width="120" height="60" rx="4" fill="#ffffff" />
            <path d="M40 50 h120" />
            <circle cx="55" cy="40" r="3" fill="currentColor" />
            <circle cx="70" cy="40" r="3" fill="currentColor" />
            <circle cx="85" cy="40" r="3" fill="currentColor" />
            <rect x="55" y="60" width="30" height="20" rx="2" strokeDasharray="2,2" />
            <rect x="95" y="60" width="50" height="20" rx="2" strokeDasharray="2,2" />
          </svg>
          <span className="absolute bottom-2 right-2 text-[9px] font-mono text-on-surface-variant/40">Projects</span>
        </div>`,
  'AgentStudio.tsx': `<div className="w-[180px] h-[130px] shrink-0 bg-surface-variant/40 rounded-lg p-4 flex items-center justify-center relative select-none hidden md:flex">
          <svg viewBox="0 0 200 120" className="w-full h-full text-primary" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="60" y="20" width="80" height="80" rx="12" fill="#ffffff" />
            <circle cx="80" cy="45" r="6" fill="currentColor" />
            <circle cx="120" cy="45" r="6" fill="currentColor" />
            <path d="M85 70 Q100 80 115 70" />
            <path d="M40 60 L60 60 M140 60 L160 60" />
          </svg>
          <span className="absolute bottom-2 right-2 text-[9px] font-mono text-on-surface-variant/40">Agent Studio</span>
        </div>`
};

files.forEach(f => {
  const basename = path.basename(f);
  if (illustrations[basename]) {
    let content = fs.readFileSync(f, 'utf8');
    
    // Attempt to find the header block and replace it
    if (basename === 'Dashboard.tsx') {
      content = content.replace(
        /<div className="flex items-center justify-between col-span-full mb-2">([\s\S]*?)<\/div>/,
        `<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-outline-variant/40 pb-8 col-span-full mb-2">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">
              Overview
            </span>
          </div>
          <h1 className="text-[32px] font-bold text-primary font-heading leading-tight tracking-tight">GEO 数据资产总览</h1>
          <p className="text-[14px] text-on-surface-variant leading-relaxed">
            实时监控您的核心指标、搜索表现以及最新动态。
          </p>
          $1
        </div>
        ${illustrations[basename]}
      </div>`.replace('$1', '')
      );
    }
    
    if (basename === 'Projects.tsx') {
      content = content.replace(
        /<div className="flex justify-between items-end">([\s\S]*?)<\/h2>\s*(<button[\s\S]*?<\/button>)\s*<\/div>/,
        `<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-outline-variant/40 pb-6 mb-6">
        <div className="space-y-3 max-w-2xl">
           <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">
              Project Management
            </span>
          </div>
          $1
          <p className="text-[14px] text-on-surface-variant leading-relaxed mb-4">
            管理您当前的所有优化项目进程。
          </p>
          $2
        </div>
        ${illustrations[basename]}
      </div>`.replace('$1', '')
      );
    }
    
    if (basename === 'KnowledgeBase.tsx') {
      content = content.replace(
        /<div className="flex flex-col gap-2">[\s\S]*?<h1 className="text-\[32px\].*?">企业数字资产引擎<\/h1>[\s\S]*?<\/div>\s*<button[\s\S]*?<\/button>\s*<\/div>/,
        `<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 border-b border-outline-variant/40 pb-6 mb-6">
          <div className="space-y-3 max-w-2xl w-full">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold text-on-surface-variant/80 uppercase tracking-widest leading-none">
                Enterprise Assets
              </span>
            </div>
            <h1 className="text-[32px] font-bold text-primary mb-2 tracking-tight">企业数字资产引擎</h1>
            <p className="text-[14px] text-on-surface-variant leading-relaxed">统一管理品牌资质、合规条款以及内容库。</p>
          </div>
          ${illustrations[basename]}
        </div>`
      );
    }
    
    fs.writeFileSync(f, content, 'utf8');
  }
});

// Generic card and rounded corner fixes across all files to match Notion's marketplace
const allFiles = walkSync(viewsDir);
allFiles.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  // Increase roundness on generic cards
  content = content.replace(/rounded /g, 'rounded-xl ');
  content = content.replace(/rounded"/g, 'rounded-xl"');
  
  // Make cards flatter with light backgrounds instead of visible borders
  content = content.replace(/border border-outline-variant\/60/g, 'border-transparent bg-surface-container-low');
  content = content.replace(/border border-outline-variant\/55/g, 'border-transparent bg-surface-container-low');
  content = content.replace(/border border-outline-variant\/50/g, 'border-transparent bg-surface-container-low');
  
  // Update header text to all use heading font
  content = content.replace(/font-bold text-primary (?!font-heading)/g, 'font-bold text-primary font-heading ');

  fs.writeFileSync(f, content, 'utf8');
});
