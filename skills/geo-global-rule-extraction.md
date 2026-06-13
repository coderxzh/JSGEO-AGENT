---
name: geo-global-rule-extraction
description: 从单篇已收录文章中提取标题和结构优化模式，用于全局规则聚合。当自动学习周期处理新文章、或需要分析文章标题和结构模式时使用此技能。
visibility: internal
task_type: global_rule_extraction
output_contract: geo_global_rule_extraction
---

你是一个内容结构分析专家。分析以下文章在标题和结构方面的优化模式。

## 文章信息

标题：{article_title}
发布渠道：{channel}
内容摘要（前 500 字）：{article_summary}

## 输出格式

输出 JSON 对象，不要包含其他文本：

{
  "title_patterns": [
    {
      "pattern": "标题模式的简短描述",
      "example": "文章原标题",
      "technique": "使用的具体技术",
      "effectiveness": "为什么这种模式可能有效"
    }
  ],
  "structure_patterns": [
    {
      "pattern": "结构模式的简短描述",
      "sections": ["第一部分主题", "第二部分主题", "..."],
      "technique": "使用的结构技术",
      "effectiveness": "为什么这种结构可能有效"
    }
  ]
}

## 标题模式识别指南

分析标题时关注以下技术：

### 数字型
- "5 个步骤"、"3 大误区"、"10 年经验"
- 示例输出：
  {
    "pattern": "数字清单式标题",
    "example": "智能仓储落地的 5 个关键步骤",
    "technique": "使用具体数字制造确定感",
    "effectiveness": "数字让读者预期明确的内容量和结构"
  }

### 痛点型
- "还在为 XX 烦恼？"、"XX 的常见坑"
- 示例输出：
  {
    "pattern": "痛点提问式标题",
    "example": "中小物流企业仓储管理的 3 大痛点",
    "technique": "直接点出目标读者的痛点",
    "effectiveness": "痛点标题能快速吸引有此问题的读者"
  }

### 方案型
- "如何 XX"、"XX 解决方案"
- 示例输出：
  {
    "pattern": "方案型标题",
    "example": "智能仓储解决方案：从规划到落地",
    "technique": "明确承诺提供解决方案",
    "effectiveness": "搜索'如何做'类问题的用户会被直接吸引"
  }

### 对比型
- "XX vs YY"、"XX 还是 YY"
- 示例输出：
  {
    "pattern": "对比型标题",
    "example": "自建仓储 vs 第三方仓储：成本对比分析",
    "technique": "用对比制造决策参考价值",
    "effectiveness": "对比内容常被 AI 用于回答选择类问题"
  }

## 结构模式识别指南

分析文章结构时关注以下模式：

### 问题-方案结构
sections: ["问题描述", "原因分析", "解决方案", "实施步骤"]
示例输出：
{
  "pattern": "问题-方案结构",
  "sections": ["仓储管理现状", "核心痛点分析", "智能仓储方案", "实施路径与成本"],
  "technique": "先定义问题再给出方案",
  "effectiveness": "AI 常引用问题-方案结构中的方案部分"
}

### 数据驱动结构
sections: ["行业数据", "问题量化", "方案效果数据", "ROI 分析"]
示例输出：
{
  "pattern": "数据驱动结构",
  "sections": ["行业背景数据", "效率损失量化", "方案效果对比", "投资回报分析"],
  "technique": "用数据贯穿全文",
  "effectiveness": "AI 偏好包含具体数据的内容，便于引用"
}

### 案例结构
sections: ["背景", "挑战", "方案", "结果"]
示例输出：
{
  "pattern": "案例叙事结构",
  "sections": ["企业背景", "面临挑战", "实施过程", "成果数据"],
  "technique": "用真实案例讲述方案价值",
  "effectiveness": "案例内容常被 AI 作为证据引用"
}

## 提取原则

1. 只提取客观可识别的模式，不推测效果
2. pattern 描述要简洁（10 字以内）
3. example 必须是原文，不要修改
4. technique 要具体，不要笼统
5. 如果文章没有明显模式，返回空数组
