# API 接口文档

Base URL: `http://127.0.0.1:5000`

公共 v1 接口只读取已发布的规范化知识核心；旧版接口仍在下文保留用于兼容。

所有响应均为 JSON 格式，统一结构：

```json
{ "code": 200, "data": "...", "total": 100, "msg": "..." }
```

- `code`: 状态码，200 成功，400/404/500 异常
- `data`: 响应数据
- `total`: 分页总条数（列表接口）
- `msg`: 错误描述（非 200 时）

---

## 旧版兼容读取 API

## v1 公共术语 API

### GET /api/v1/terms

分页查询已发布术语。所有参数可省略；`page` 从 1 开始，`page_size` 默认为 20，最大为 100。`q` 按名称/定义搜索，`level`、`culture`、`language` 分别筛选层级、文化分类和译法语言。

请求：

```http
GET /api/v1/terms?q=和而&level=本源层&language=en&page=1&page_size=20
```

响应（200）：

```json
{
  "code": 200,
  "data": [{
    "id": 7,
    "preferred_name_zh": "和而不同",
    "definition_zh": "承认差异并追求和谐共处",
    "term_level": "本源层",
    "culture_category": "中华优秀传统文化",
    "data_quality": "legacy_unreviewed",
    "recommended_translation": {
      "language_code": "en",
      "language_name_zh": "英语",
      "text": "harmony in diversity",
      "translation_type": "recommended",
      "authority_level": "official",
      "review_status": "approved"
    },
    "language_count": 2,
    "source_count": 1
  }],
  "meta": {"page": 1, "page_size": 20, "total": 1}
}
```

非法整数分页参数返回 `400`：`{"code":400,"message":"分页参数必须是整数"}`。页码小于 1 和每页条数超界会被规范化到允许范围。

### GET /api/v1/terms/{id}

请求：

```http
GET /api/v1/terms/7
```

响应（200）包含摘要字段及 `names`、`translations`（含 contexts）、`sources`（含 evidence）、`contexts`、`cultural_notes`、`relations`、`topics`：

```json
{
  "code": 200,
  "data": {
    "id": 7,
    "preferred_name_zh": "和而不同",
    "definition_zh": "承认差异并追求和谐共处",
    "cultural_connotation": "和谐不是同一",
    "term_level": "本源层",
    "culture_category": "中华优秀传统文化",
    "data_quality": "legacy_unreviewed",
    "names": [{"name":"和不同","name_type":"short"}],
    "translations": [{
      "language_code":"en", "language_name_zh":"英语", "text":"harmony in diversity",
      "translation_type":"recommended", "authority_level":"official", "review_status":"approved",
      "region":null, "note":null, "contexts":[]
    }],
    "sources": [{
      "id":3, "title":"论语", "organization":null, "published_at":null,
      "language_code":"zh", "source_type":"classical", "url":null,
      "citation":"子路篇", "authority_level":"primary", "summary":null,
      "legacy_value":"论语", "evidence":[{
        "id":4, "translation_id":null, "original_excerpt":"君子和而不同",
        "translated_excerpt":"The superior person seeks harmony.", "locator":"子路篇", "note":null
      }]
    }],
    "contexts": [], "cultural_notes": [], "relations": [], "topics": []
  }
}
```

不存在或未发布的术语返回 `404`：`{"code":404,"message":"术语不存在或尚未发布"}`。

### GET /api/term-list

获取术语列表（分页）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| pageSize | int | 30 | 每页条数（最大 100） |

**响应示例**

```json
{
  "code": 200,
  "total": 731,
  "data": [
    {
      "id": 1,
      "术语名称": "人类命运共同体",
      "术语层级": "核心层",
      "文化分类": "社会主义先进文化",
      "场景分类": "国际交流",
      "筛选标签": "外交,全球治理",
      "官方译法（英文）": "a community with a shared future for mankind",
      "官方译法（小语种）": "",
      "文化内涵": "强调各国人民命运紧密相连...",
      "来源": "十八大报告",
      "儿童解释": "全世界的人就像一家人，互相帮助一起生活"
    }
  ]
}
```

---

### GET /api/search

按术语名称模糊搜索（分页）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| word | string | — | 搜索关键词 |
| page | int | 1 | 页码 |
| pageSize | int | 30 | 每页条数 |

**示例**

```
GET /api/search?word=命运&page=1&pageSize=10
```

---

### GET /api/filter

多条件筛选（分页）。三个筛选条件可任意组合，不传即不筛选。

| 参数 | 类型 | 说明 |
|------|------|------|
| culture | string | 文化分类：`中华优秀传统文化` / `革命文化` / `社会主义先进文化` |
| scene | string | 场景分类：`学术研究` / `政策传播` / `国际交流` |
| level | string | 术语层级：`核心层` / `拓展层` / `本源层` |
| page | int | 页码 |
| pageSize | int | 每页条数 |

**示例**

```
GET /api/filter?culture=中华优秀传统文化&level=本源层&page=1&pageSize=20
```

---

旧版接口仅保留 `GET /api/term-list`、`GET /api/search`、`GET /api/filter` 和 `/api/huaihe/*` 读取路由，用于平滑过渡。旧版 `POST /api/terms`、`PUT /api/terms/{id}`、`DELETE /api/terms/{id}` 和 `POST /api/import-excel` 已有意移除，不应由匿名客户端调用；服务端会返回 404。

---

## 跨文化表达实验室

### POST /api/v1/expression-lab/analyze

基于1—5个已发布术语及其英语译法、来源和文化提示，生成一次不落库的结构化表达报告。中文原文长度为10—1000字；当前目标语言固定为英语。

```json
{
  "term_ids": [7],
  "source_text": "和而不同强调在差异中寻求和谐共处。",
  "target_language": "en",
  "audience": "overseas_youth",
  "scenario": "cultural_exhibition",
  "style": "explanatory",
  "locale": "general_english"
}
```

成功响应（节选）：

```json
{
  "code": 200,
  "message": "分析完成",
  "data": {
    "request_id": "不透明请求编号",
    "input_summary": {
      "source_text": "和而不同强调在差异中寻求和谐共处。",
      "target_language": "en",
      "audience": "overseas_youth",
      "scenario": "cultural_exhibition",
      "style": "explanatory",
      "locale": "general_english"
    },
    "knowledge_summary": {
      "term_count": 1,
      "translation_count": 2,
      "source_count": 1,
      "context_count": 1,
      "truncated": false
    },
    "report": {
      "recommended": {"text": "Harmony in diversity", "rationale": "...", "strategy": ["..."]},
      "alternatives": [{"text": "...", "best_for": "...", "tradeoff": "..."}],
      "term_usage": [{"term_id": 7, "translation_id": 11, "adopted_translation": "...", "explanation": "..."}],
      "cultural_risks": [{"level": "medium", "issue": "...", "recommendation": "..."}],
      "references": [{"source_id": 13, "title": "...", "organization": "...", "url": "https://...", "citation": "...", "usage": "..."}],
      "limitations": ["..."],
      "review_priority": "medium"
    },
    "generated_at": "2026-09-19T12:00:00+00:00",
    "review_status": "ai_unreviewed",
    "warnings": []
  }
}
```

`ai_unreviewed` 表示结果由 AI 生成、尚未经过人工语言与学术审核，不能作为权威定稿。服务端只接受知识包中真实存在的术语、译名和来源 ID，并由数据库回填来源元数据。

| HTTP | 场景 |
|---|---|
| 400 | 缺字段、非法枚举或术语数量/文本长度不合法 |
| 404 | 术语不存在或未发布 |
| 413 | 请求体超过配置上限 |
| 415 | 请求不是 JSON |
| 422 | AI 返回内容经一次修复后仍不符合结构 |
| 429 | 同一客户端 IP 超过限流 |
| 502 | AI 服务返回不可用响应 |
| 503 | AI 服务未配置、超时或暂时不可达 |

所有错误使用 `{"code": 状态码, "message": "公开错误说明", "data": null}` 信封，不返回供应商诊断或内部提示词。

## 人工评审案例工作台

该接口把表达实验室结果保存为不可变 AI 快照，并以追加方式记录人工修订和状态事件。当前版本没有登录与权限系统，仅应部署在受控的校内/研究网络；`reviewer_name` 是研究记录字段，不构成身份认证。

### POST /api/v1/review-cases

请求包含 `title`、`term_ids` 和表达实验室返回的完整 `analysis`。同一 `analysis.request_id` 重复提交时返回既有案例（200），首次创建返回 201。客户端不能指定状态、修订号或时间戳。

### GET /api/v1/review-cases

支持 `page`、`page_size`、`status`、`term_id`、`reviewer`、`issue_tag` 和 `q`。响应 `meta.stats` 同时提供各状态案例数、总数和平均修订数。

### GET /api/v1/review-cases/{public_id}

返回 AI 快照、当前修订、全部修订、关联术语和状态事件。`public_id` 是不透明公开编号。

### POST /api/v1/review-cases/{public_id}/revisions

追加人工修订，不覆盖旧版本：

```json
{
  "expected_revision_number": 1,
  "final_expression": "Human-reviewed expression",
  "review_notes": "Adjusted register for the target audience.",
  "reviewer_name": "Reviewer A",
  "issue_tags": ["register_mismatch"]
}
```

`expected_revision_number` 必须与服务端当前版本一致，否则返回 409，客户端应保留尚未保存的输入并刷新案例。已归档案例不可修订。

### POST /api/v1/review-cases/{public_id}/transitions

状态机只允许以下流转：`draft → pending_review`（submit）、`pending_review → approved`（approve）、`pending_review → draft`（return）、`approved → draft`（reopen）、`approved → archived`（archive）、`archived → approved`（restore）。非法流转或并发版本冲突返回 409。

### GET /api/v1/review-cases/export

`format=json` 或 `format=csv`，并支持与列表相同的筛选参数。CSV 使用 UTF-8 BOM，且会中和以 `= + - @` 开头的单元格，避免电子表格公式注入。导出是只读操作。

所有写请求必须为 JSON，最大请求体由 `REVIEW_WORKSPACE_MAX_BODY_BYTES` 控制。工作台没有删除 API；AI 快照、人工修订和事件均保留审计历史。

## AI 对话

### POST /api/chat/stream

DeepSeek 大模型流式对话（SSE）。

请求体 JSON：

```json
{ "message": "什么是知行合一？" }
```

响应为 Server-Sent Events 流：

```
data: {"content":"知行"}
data: {"content":"合一是"}
data: {"content":"..."}
data: [DONE]
```

---

## 淮河文化

### GET /api/huaihe/terms

淮河术语列表（分页），参数同 `/api/term-list`，默认每页 6 条。

---

### GET /api/huaihe/terms/search

搜索淮河术语。按术语名称 + 文化内涵双字段模糊匹配。

| 参数 | 类型 | 说明 |
|------|------|------|
| word | string | 搜索关键词 |
| page | int | 页码 |
| pageSize | int | 每页条数（默认 6） |

---

### GET /api/huaihe/figures

淮河名人列表（不分页）。

**响应**

```json
{
  "code": 200,
  "data": [
    { "人物": "管仲", "百度链接": "https://...", "分类": "政治家" },
    { "人物": "老子", "百度链接": "https://...", "分类": "思想家" }
  ]
}
```

---

## 状态码

| code | 含义 |
|------|------|
| 200 | 成功 |
| 400 | 请求参数有误 |
| 404 | 资源不存在 |
| 413 | 请求体过大 |
| 415 | 请求格式不支持 |
| 422 | AI结构化输出无效 |
| 429 | 请求过于频繁 |
| 502 | AI供应商响应不可用 |
| 500 | 服务器内部错误 |
| 503 | AI 服务未配置 |
