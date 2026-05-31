---
name: 知识库录入
description: 引导用户建立、补充或编辑企业 GEO 知识库。用户上传企业资料、Word/PDF/Markdown/TXT 附件，或表达“建立知识库/录入企业资料/补充企业信息”时使用；这是唯一面向用户手动选择的技能。
visibility: user
---

# 知识库录入

## 什么时候使用

用户要建立新企业知识库、补充现有企业资料、编辑企业事实，或上传企业相关附件时使用。

## 输入

- 用户文本说明。
- 附件解析文本。
- 可选的当前企业 `project_id`。
- 可选意图：`create`、`update`。

## 输出 JSON

只输出企业事实草稿，字段与企业知识库编辑页一致：

- `project_id`
- `company_name`
- `short_name`
- `industry`
- `main_business`
- `official_website`
- `official_media`
- `detailed_intro`
- `brand_story`
- `products_services`
- `product_features`
- `user_pain_points`
- `trust_endorsements`
- `brand_authorization_pricing`
- `cases`
- `business_regions`
- `customer_service_phone`
- `current_pain_points`
- `core_advantages`
- `extra_info`
- `image_notes`
- `target_keywords`

缺失字段返回空字符串，不要写“待补充”。

## 禁止事项

- 不编造资质、授权、案例、电话、报价、起订量、服务承诺。
- 不生成营销文案、排行榜文章、测评文章。
- 确认前不写入正式知识库。
- 不把附件原文整段塞进单个字段。

## 质量标准

- 公司名称必须来自资料或用户明确表达。
- 产品/服务、用户痛点、信任背书、业务区域要拆分清楚。
- `target_keywords` 用用户真实会搜索的问题或关键词，保持精简。
- 对无法核验的信息放入缺失项，不污染正式字段。

## 下一步

生成“企业知识库草稿预览”，等待用户确认。用户确认后再正式入库、生成知识条目和本地索引。
