# 知识核心模型

知识核心把一个术语从“表格中的一行”拆成可追溯的概念、译法、来源和使用信息。迁移保留旧值与来源标记，后续审核可以逐项提升数据质量。

## 核心实体

- **Term（术语概念）**：中文首选名、定义、层级、文化分类、发布状态和数据质量。它表示概念本身，不等同于某一种语言的字符串。
- **Term.legacy_payload（旧行快照）**：完整 JSON-safe 的旧表行，保存尚未提升为一等字段的标签和其他原始列；不在公共 v1 响应中暴露。
- **TermName（名称）**：首选名、别名等名称变体。
- **Translation（译法）**：关联 Term 和 Language，记录文本、译法类型、权威级别、审核状态、地区和备注。一个术语可以有多种译法，详情接口按审核和推荐信息返回。
- **Source（来源）**：书籍、标准、报告或旧表来源值。一个来源可被多个术语复用。
- **TermEvidence（证据）**：把术语/译法与来源中的原文摘录、译文摘录、定位信息连接起来。
- **Context（场景）**：受众、文体和使用说明；`TermContext` 或 `TranslationContext` 表示概念或译法在该场景中的解释、例句和推荐级别。
- **CulturalNote（文化提示）**：目标文化、直译风险、常见误解和跨文化表达建议。
- **Topic / TopicItem（专题）**：专题是编辑组织层；条目可以引用术语，也可以保留淮河人物、中药材等非术语遗留记录的原始 payload。
- **TermRelation（关系）**：术语之间的相关、上下位等关系，用于知识网络和后续专题能力。

## 关系与读取边界

```text
Term ──< TermName
     ──< Translation >── Language
     ──< TermEvidence >── Source
     ──< TermContext >── Context
     ──< CulturalNote
     ──< TermRelation >── Term
Topic ──< TopicItem >── Term（可为空，保留遗留条目）
```

`GET /api/v1/terms` 返回已发布 Term 的摘要和推荐译法；`GET /api/v1/terms/{id}` 才展开全部译法、来源、证据、场景、文化提示、关系和专题。草稿术语、草稿专题和未发布条目不进入公共列表。

## 迁移语义

旧表中的非空英文译法进入 `Language(code="en")`；非空小语种但没有语言代码的值进入 `und`，等待后续识别。非空“来源”创建或复用 `Source(legacy_value=...)`。旧场景和儿童解释分别进入 Context/TermContext。所有迁移实体标记 `legacy_unreviewed` 或 `unreviewed`，表示可公开读取但仍需研究者复核。
