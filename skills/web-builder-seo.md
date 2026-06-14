---
name: web-builder-seo
description: 基于企业知识库数据生成 SEO 优化的多页企业门户网站。优先确保网站符合搜索引擎和 AI 抓取规范，生成结构化、语义化、可被大模型索引的静态 HTML 页面。
visibility: internal
platforms: [openai]
task_type: website_generation
network_mode: none
output_contract: website_plan
---

# SEO 优先的企业门户网站生成

## 任务目标

基于企业知识库（画像、条目、资产），生成一个完整的企业门户网站。网站的第一优先级是**符合 SEO 规范**，确保网站中的标题、描述、结构化数据等能被搜索引擎和 AI 系统高效抓取和索引。

## 输入

必须读取以下输入：

| 输入 | 用途 |
|---|---|
| 企业知识库画像 | 公司名称、行业、地区、服务、品牌、联系方式、目标关键词 |
| 知识库条目 | 产品服务详情、案例、技术能力、资质证书 |
| 用户需求描述 | 网站用途、目标受众、特殊要求 |
| 品牌配置 | 主色调、字体偏好（可选） |

## 生成流程

### Phase 1：站点规划

首先输出一个 JSON 站点规划，定义网站的整体结构：

```json
{
  "site_name": "网站名称",
  "tagline": "一句话描述",
  "brand_color": "#1a73e8",
  "font_family": "system-ui, -apple-system, sans-serif",
  "pages": [
    {
      "id": "home",
      "slug": "index",
      "title": "首页标题（<30字符）",
      "meta_description": "首页描述（<160字符）",
      "h1": "首页主标题",
      "purpose": "页面功能描述"
    }
  ],
  "navigation": [
    { "label": "首页", "slug": "index", "is_primary": true },
    { "label": "关于我们", "slug": "about", "is_primary": true }
  ],
  "seo_defaults": {
    "language": "zh-CN",
    "locale": "zh_CN",
    "site_type": "LocalBusiness"
  }
}
```

**典型页面结构（5-8 页）：**

| 页面 | slug | 说明 |
|---|---|---|
| 首页 | index | 品牌形象、核心服务、信任背书、行动号召 |
| 关于我们 | about | 企业历史、团队、资质、荣誉 |
| 服务/产品 | services | 服务列表、技术优势、价格参考 |
| 案例展示 | cases | 客户案例、项目成果、数据指标 |
| 新闻/资讯 | news | 行业洞察、企业动态、技术分享 |
| 联系我们 | contact | 地址、电话、地图、在线表单 |

### Phase 2：逐页生成

对规划中的每个页面，生成完整的独立 HTML 文件。每页必须包含以下 SEO 要素：

#### HTML 结构要求

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>页面标题（<30字符，包含核心关键词）</title>
  <meta name="description" content="页面描述（<160字符，自然包含目标关键词）">
  
  <!-- Open Graph -->
  <meta property="og:title" content="页面标题">
  <meta property="og:description" content="页面描述">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://example.com/slug.html">
  <meta property="og:site_name" content="网站名称">
  
  <!-- JSON-LD 结构化数据 -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "企业名称",
    "description": "企业描述",
    "address": { "@type": "PostalAddress", ... },
    "telephone": "联系电话",
    "url": "https://example.com"
  }
  </script>
  
  <!-- Canonical -->
  <link rel="canonical" href="https://example.com/slug.html">
  
  <style>
    /* 内联 CSS：品牌色、响应式、暗色模式 */
  </style>
</head>
<body>
  <header>
    <nav><!-- 共享导航栏，当前页 aria-current="page" --></nav>
  </header>
  <main>
    <article>
      <section><!-- 内容区块 --></section>
    </article>
  </main>
  <footer><!-- 共享页脚：公司信息、联系方式、版权 --></footer>
  
  <!-- 主题同步脚本（放 body 末尾，不阻塞渲染） -->
  <script>
    // 同步父窗口暗色/亮色模式
  </script>
</body>
</html>
```

## SEO 硬性约束

以下规则必须严格遵守：

### 标题与描述

- 每页**唯一一个 `<h1>`**，与 `<title>` 一致或高度相关
- `<title>` 不超过 30 个字符
- `<meta name="description">` 不超过 160 个字符
- 标题层级不跳级：`<h1>` → `<h2>` → `<h3>`，禁止 `<h1>` 直接到 `<h3>`

### 结构化数据

- 每页必须包含 JSON-LD 结构化数据
- 使用 schema.org 的 `LocalBusiness`、`Organization` 或 `WebPage` 类型
- 包含 `name`、`description`、`address`、`telephone`、`url` 等关键属性

### 语义化 HTML

- 使用 HTML5 语义标签：`<header>`、`<nav>`、`<main>`、`<article>`、`<section>`、`<footer>`
- 所有 `<img>` 必须有 `alt` 属性
- 图片使用 `loading="lazy"` 延迟加载
- 内部链接使用相对路径（`href="about.html"`）

### 内容质量

- 每页可见文本不少于 300 字
- 企业核心关键词自然分布在标题、描述和正文中
- 禁止 `<meta name="robots" content="noindex">`
- 联系信息必须出现在页脚和联系我们页面

### 技术规范

- 内联 CSS，不依赖外部样式表
- 响应式设计：使用 CSS Flexbox/Grid + `@media (max-width: 768px)` 断点
- 支持暗色模式：`@media (prefers-color-scheme: dark)` 或 JS 主题切换
- 每页共享相同的导航栏和页脚 HTML 结构
- 导航栏当前页面使用 `aria-current="page"` 标记
- 页脚包含：公司名称、地址、电话、邮箱、版权信息

### 禁止事项

- 禁止使用 `<iframe>`、`<embed>`、`<object>` 标签
- 禁止内联 JavaScript 执行复杂逻辑（仅允许主题同步等轻量脚本）
- 禁止使用框架（React、Vue 等），只输出原生 HTML/CSS
- 禁止硬编码不存在的企业信息（电话、地址等），使用知识库中的真实数据
- 禁止使用 placeholder 文本（如"Lorem ipsum"）

## 输出格式

### Phase 1 输出（站点规划）

只输出合法 JSON：

```json
{
  "site_name": "企业名称",
  "tagline": "一句话品牌描述",
  "brand_color": "#主色调hex",
  "font_family": "字体栈",
  "pages": [
    {
      "id": "home",
      "slug": "index",
      "title": "首页标题",
      "meta_description": "首页描述",
      "h1": "首页主标题",
      "purpose": "页面用途说明"
    }
  ],
  "navigation": [
    { "label": "导航文字", "slug": "页面slug", "is_primary": true }
  ],
  "seo_defaults": {
    "language": "zh-CN",
    "locale": "zh_CN",
    "site_type": "LocalBusiness"
  }
}
```

### Phase 2 输出（页面 HTML）

对每个页面，输出完整的 HTML 字符串。HTML 必须是自包含的（所有 CSS 内联），不依赖外部资源。

```html
<!DOCTYPE html>
<html lang="zh-CN">
...完整 HTML...
</html>
```
