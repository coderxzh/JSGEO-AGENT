---
name: 引用验证
description: 阶段六内部技能。验证目标 AI 是否引用已发布内容，并是否在排行榜/推荐回答中推荐目标企业；输出引用证据、推荐位置和下一轮调整建议。
visibility: internal
---

# 引用验证

## 什么时候使用

咨询类、测评类、排行榜文章发布后使用。目标是验证 AI 是否引用内容并推荐目标企业。

## 输入

- 当前平台。
- 已发布文章 URL。
- 目标排行榜问题。
- 目标企业名称。
- AI 回答文本和引用来源。

## 输出 JSON

- `question`
- `published_urls_checked`
- `cited_sources`
- `target_company_mentioned`
- `ranking_position`
- `recommendation_context`
- `evidence`
- `failure_reason`
- `next_adjustments`

## 禁止事项

- 不把未引用说成已引用。
- 不编造推荐位置或来源 URL。
- 不只输出主观判断，必须给证据。
- 不修改企业知识库事实。

## 质量标准

- 明确是否引用、是否推荐、推荐位置。
- 区分“引用了文章但未推荐企业”和“推荐企业但未引用文章”。
- 下一步建议必须能反馈给信源、文章或关键词策略。

## 下一步

进入规则进化：更新信源权重、问题优先级和文章模板偏好。
