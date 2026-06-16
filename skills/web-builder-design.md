---
name: web-builder-design
description: 企业门户网站的视觉设计、交互规范与设计系统，确保生成网页具备专业视觉效果和一致的用户体验。
visibility: internal
platforms: [openai]
task_type: website_generation
network_mode: none
output_contract: website_plan
---

# 企业门户网站视觉与交互设计规范

## 设计原则

生成网页时必须遵循以下原则：

- **移动优先**：默认样式针对移动设备，再用 `min-width` 媒体查询扩展到大屏。
- **渐进增强**：核心内容和功能在无动画、无脚本环境下可用。
- **视觉服务于信息**：排版、色彩、动效必须强化内容层级，而非喧宾夺主。
- **全站一致**：同一网站的所有页面共享同一套颜色、字体、间距、圆角、阴影、动画节奏。
- **拒绝廉价默认**：禁止使用未经设计的默认蓝色（如链接默认蓝）、纯黑 `#000000` 作为正文、以及未加处理的灰色背景。

## 色彩系统

使用 CSS 自定义属性（`:root`）集中管理颜色，禁止在组件中硬编码原始 hex。

### 品牌色

- **主色（primary）**：必须使用用户提供的 `brand_color`。用于：主按钮背景、重点标题强调、链接、悬停状态、关键装饰线、当前导航指示。
- **辅助色（secondary）**：由主色派生，降低 15%–25% 饱和度并调整亮度。用于：次要按钮、标签、背景点缀、图标容器、引用块边框。
- **强调色（accent）**：可选高亮色，用于成功状态、促销标签、重点数据。可与主色形成 30°–60° 色相差。

### 中性色

使用 slate 系列定义界面中性层次：

- `--text-primary`: `#1e293b`（slate-800）
- `--text-secondary`: `#475569`（slate-600）
- `--text-muted`: `#94a3b8`（slate-400）
- `--bg-body`: `#ffffff`
- `--bg-surface`: `#f8fafc`（slate-50）
- `--bg-elevated`: `#ffffff`
- `--border`: `#e2e8f0`（slate-200）

### 语义色

- `--success`: `#22c55e`
- `--error`: `#ef4444`
- `--warning`: `#f59e0b`
- `--info`: `#3b82f6`

### 深色模式

使用 `@media (prefers-color-scheme: dark)` 或 `html.dark` 类切换：

- `--bg-body`: `#0f172a`（slate-900）
- `--bg-surface`: `#1e293b`（slate-800）
- `--bg-elevated`: `#334155`（slate-700）
- `--text-primary`: `#f8fafc`（slate-50）
- `--text-secondary`: `#cbd5e1`（slate-300）
- `--text-muted`: `#64748b`（slate-500）
- `--border`: `#334155`（slate-700）
- 主色/辅助色使用降低饱和度的变体，禁止简单反色。
- 所有文本与背景对比度必须 ≥ 4.5:1。

## 排版系统

### 字体栈

- 默认：`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans SC", sans-serif`
- 如使用自定义字体，必须声明 `@font-face` 并设置 `font-display: swap`。

### 字号层级

| Token | 桌面 | 移动 | 用途 |
|---|---|---|---|
| `--text-xs` | 12px | 12px | 辅助说明、标签、时间戳 |
| `--text-sm` | 14px | 14px | 二级正文、按钮文字 |
| `--text-base` | 16px | 16px | 正文段落（禁止移动端小于 16px，避免 iOS 自动缩放） |
| `--text-lg` | 18px | 18px | 引导段落、大段正文 |
| `--text-xl` | 24px | 20px | 小节标题 |
| `--text-2xl` | 32px | 24px | 页面分区标题 |
| `--text-3xl` | 48px | 32px | 首页 Hero 主标题 |

### 行高

- 标题：`1.2`
- 正文：`1.6–1.75`
- 小字/标签：`1.5`

### 字重

- 页面/分区标题：`600–700`
- 小节标题：`600`
- 正文：`400`
- 标签/按钮：`500`

### 行长度

- 移动端：每行 35–60 个汉字。
- 桌面端：每行 60–75 个汉字或 75–90 个拉丁字符。
- 长文本容器最大宽度 `65ch`。

## 间距与布局

### 间距系统

使用 4px 基准的间距阶梯：`4, 8, 12, 16, 24, 32, 48, 64, 96`。禁止出现 13px、27px、41px 等随机值。

### 容器

- 最大宽度：`1200px`。
- 水平内边距：移动端 `16px`、平板 `24px`、桌面 `32px`。
- 居中对齐：`margin-left: auto; margin-right: auto`。

### 断点

- `sm`: 375px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1440px

使用移动优先写法：
```css
.section { padding: 48px 16px; }
@media (min-width: 768px) { .section { padding: 64px 24px; } }
@media (min-width: 1024px) { .section { padding: 80px 32px; } }
```

### 区块间距

- 页面区块之间：移动端 `48px`，桌面端 `80px–96px`。
- 卡片内部内边距：移动端 `16px`，桌面端 `24px`。
- 组件之间：使用 `16px`、`24px`、`32px` 三档。

### z-index 层级

定义统一层级：`0` 内容、`10` 粘性元素、`20` 下拉菜单、`40` 模态框、`100` 通知、`1000` 全屏覆盖。

## 组件规范

### 按钮

- **主按钮**：实心主色背景，白色文字，圆角 `8px`，内边距 `12px 24px`。
- **次按钮**：透明背景 + 主色边框，悬停时背景填充主色 5%–10%。
- **幽灵按钮**：透明背景，主色文字，用于低优先级操作。
- 每屏/每卡片原则上只有一个主按钮作为核心 CTA。
- 禁用状态：`opacity: 0.5`，`cursor: not-allowed`。

### 卡片

- 圆角统一：`12px` 或 `16px`。
- 阴影层级：
  - 默认：`0 1px 3px rgba(0,0,0,0.1)`
  - 悬停：`0 8px 24px rgba(0,0,0,0.12)`
- 背景：`var(--bg-elevated)`，与页面背景形成区分。
- 悬停反馈：轻微上移 `translateY(-4px)` 或阴影加深。

### 导航

- 固定顶部导航：高度 `64px–72px`，背景带轻微模糊（`backdrop-filter: blur(8px)`）。
- 当前页链接：使用 `aria-current="page"`，并用主色下划线或背景高亮标识。
- 移动端：折叠为汉堡菜单，菜单全宽展开。

### 图标

- 使用内联 SVG，禁止用 emoji 替代图标。
- 统一 stroke-width（推荐 `1.5` 或 `2`）。
- 图标尺寸：`16px`、`20px`、`24px` 三档。
- 纯图标按钮必须带 `aria-label`。

### 表单

- 每个输入框必须有可见的 `<label>`，禁止仅用 `placeholder` 作为标签。
- 输入框高度 ≥ `44px`。
- 错误信息紧邻相关字段，使用 `aria-live="polite"` 通知读屏软件。
- 聚焦状态：`2px` 主色 outline，`2px` offset。

## 交互与动画

### 动画原则

- 动画必须服务于状态理解，禁止纯装饰性大动画。
- 尊重 `prefers-reduced-motion: reduce`，在该偏好下禁用非必要动画。

### 时长与缓动

- 微交互（悬停、按压）：`150–200ms`。
- 状态切换（展开、模态）：`250–300ms`。
- 复杂过渡：不超过 `400ms`。
- 进入使用 `ease-out`，退出使用 `ease-in`。

### 可动画属性

- 优先使用 `transform` 和 `opacity`。
- 禁止动画 `width`、`height`、`top`、`left`、`margin`、`padding`，避免重排和卡顿。

### 常见交互模式

- 按钮悬停：`opacity: 0.9` 或 `translateY(-2px)`。
- 按钮按压：`scale(0.98)` 或 `opacity: 0.85`。
- 卡片悬停：`translateY(-4px)` + 阴影加深。
- 链接悬停：下划线从左到右展开动画。
- 滚动触发：元素进入视口时 `opacity 0→1` + `translateY(24px)→0`，stagger `30–50ms`。
- 页面加载：骨架屏或渐进式内容显示，避免长时间空白。

## 无障碍

- 焦点环：所有交互元素必须有可见焦点样式（`outline: 2px solid var(--primary)`，`outline-offset: 2px`）。
- 标题层级：页面唯一 `<h1>`，层级顺序不跳级（`h1→h2→h3`）。
- 图片：所有 `<img>` 必须带 `alt`。
- 颜色：不单独用颜色传达信息，必须配合图标或文本。
- 跳过链接：页面顶部提供「跳转到主内容」链接。
- 触摸目标：最小 `44×44px`，相邻目标间距 ≥ `8px`。
- 对比度：正文 ≥ 4.5:1，大文本/图标 ≥ 3:1。

## 性能

- 图片优先使用 WebP/AVIF，声明 `width`/`height` 或 `aspect-ratio` 防止 CLS。
- 非首屏图片使用 `loading="lazy"`。
- 字体使用 `font-display: swap`。
- 首屏关键 CSS 内联，避免渲染阻塞。
- 避免布局抖动（layout thrashing），动画使用 transform/opacity。

## 禁止事项

- 禁止使用 emoji 作为图标或装饰。
- 禁止在组件中直接写死 hex 颜色，必须使用 CSS 变量。
- 禁止使用 `!important` 覆盖样式。
- 禁止动画 width/height/top/left/margin/padding。
- 禁止使用系统默认蓝色作为链接或按钮颜色而不加覆盖。
- 禁止使用纯装饰性、循环播放的大型背景动画。
