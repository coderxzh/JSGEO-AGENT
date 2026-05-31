---
name: 信源证据盘点
description: 阶段三内部技能。基于目标平台和排行榜问题池，盘点可核验引用来源与待验证候选信源；不要规划文章、发布渠道、内容矩阵、发布节奏或下一阶段方案。
visibility: internal
---

# 信源证据盘点

## 什么时候使用

阶段二排行榜问题池完成后使用。目标是区分“已经有可核验证据的引用来源”和“尚未验证、只能作为候选的信源”。

## 输入

- 当前平台：`doubao` 或 `deepseek`。
- 阶段二 `ranking_questions`。
- 企业行业、区域、业务类型。
- 可选：实际 AI 搜索/问答引用结果，必须包含可核验 URL 才能作为已验证引用。

## 输出 JSON

- `verified_observed_sources`: 已验证引用来源数组，每项包含 `question`, `source`, `url`, `evidence`；`url` 必须是 `http://` 或 `https://` 开头的真实地址。
- `candidate_sources`: 待验证候选信源数组，每项包含 `source`, `source_type`, `reason`, `verification_status`。
- `source_scores`: 证据评分数组，每项包含 `source`, `score`, `priority`, `evidence_level`, `why`；没有 URL 的候选信源评分不得高于 60。
- `missing_evidence`: 仍需验证的信源问题。

兼容旧字段时，`observed_citation_sources` 只能承载带 URL 的已验证引用；无 URL 项必须改写入 `missing_evidence`。

## 禁止事项

- 不把未验证信源说成已被 AI 引用。
- 不编造 URL、引用证据、榜单来源；没有真实 URL 时，不要写入 `observed_citation_sources`，改写入 `missing_evidence`。
- 不输出“权重第一、采信最高、必然引用、最高权威、完全匹配”等不可验证断言。
- 不直接写文章。
- 不输出文章题目、内容矩阵、发布计划、下一步动作。
- 不做泛化渠道罗列，不使用“发布渠道优先级”作为结果标题。

## 质量标准

- 区分“已验证引用来源”和“待验证候选信源”。
- 任何已验证引用都必须带 URL。
- 候选信源可以保留，但必须标注待验证，评分封顶。
- 结论要服务排行榜内容被 AI 引用，而不是普通 SEO 铺量。

## 下一步

本技能不输出下一步文案；流程编排层会在卡片外展示阶段四入口。
