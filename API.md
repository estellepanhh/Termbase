# API 接口文档

Base URL: `http://127.0.0.1:5000`

所有响应均为 JSON 格式，统一结构：

```json
{ "code": 200, "data": "...", "total": 100, "msg": "..." }
```

- `code`: 状态码，200 成功，400/404/500 异常
- `data`: 响应数据
- `total`: 分页总条数（列表接口）
- `msg`: 错误描述（非 200 时）

---

## 术语 CRUD

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

### POST /api/terms

新增术语。请求体 JSON：

```json
{
  "术语名称": "一带一路",
  "术语层级": "核心层",
  "文化分类": "社会主义先进文化",
  "场景分类": "国际交流",
  "筛选标签": "经济,合作",
  "官方译法（英文）": "Belt and Road Initiative",
  "官方译法（小语种）": "",
  "文化内涵": "丝绸之路经济带和21世纪海上丝绸之路的简称",
  "来源": "2013年习近平主席出访中亚和东南亚时提出"
}
```

**响应**

```json
{ "code": 200, "msg": "添加成功" }
```

---

### PUT /api/terms/{id}

更新术语。请求体格式同新增，字段可选（只传要更新的字段）。

```
PUT /api/terms/1
```

**响应**

```json
{ "code": 200, "msg": "更新成功" }
```

若 id 不存在返回 `{ "code": 404, "msg": "术语不存在" }`。

---

### DELETE /api/terms/{id}

删除术语。

```
DELETE /api/terms/1
```

**响应**

```json
{ "code": 200, "msg": "删除成功" }
```

---

### POST /api/import-excel

从 `data/terms.xlsx` 全量导入术语表（无需请求体）。

```
POST /api/import-excel
```

**响应**

```json
{ "code": 200, "data": { "count": 731 } }
```

> 文件不存在时返回 `{ "code": 400, "msg": "文件不存在: ..." }`。

---

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
| 500 | 服务器内部错误 |
| 503 | AI 服务未配置 |
