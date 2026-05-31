---
name: 排行榜文章
description: 阶段五内部技能。只有咨询类和测评类支撑内容完成后，才生成排行榜/推荐类文章；必须说明排序逻辑、引用支撑文章和企业事实来源。
visibility: internal
---

# 排行榜文章

## 什么时候使用

阶段四支撑内容完成后使用。排行榜文章不能裸写，必须基于已有咨询类和测评类文章。

## 输入

- 高优先级排行榜问题。
- 咨询类支撑文章。
- 测评类支撑文章。
- 阶段三高权重信源。
- 企业知识库事实。
- 当前平台。

## 输出 JSON

- `title`
- `target_ranking_question`
- `ranking_logic`
- `ranking_dimensions`
- `content`
- `supporting_articles_used`
- `facts_used`
- `sources_to_reference`
- `target_company_positioning`
- `risk_notes`

## 禁止事项

- 不编造竞品名单、排名、第三方评价。
- 不承诺“必上榜/必推荐”。
- 不把目标企业硬塞为第一名，除非事实和信源支撑。
- 不缺少排序逻辑。

## 质量标准

- 排名维度清晰，可解释。
- 目标企业推荐理由必须来自知识库和支撑文章。
- 内容目标是被 AI 引用并在推荐/排行榜回答中提及目标企业。

## 下一步

发布后进入引用验证，检查目标 AI 是否引用文章并推荐目标企业。
