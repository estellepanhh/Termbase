# 跨文化表达实验室 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一个以已发布术语知识为依据、面向英语外译的跨文化表达实验室，提供结构化方案比较、文化风险、合法来源引用和无持久化导出。

**Architecture:** 前端 `/lab` 以“选择术语—设置传播任务—查看结构化报告”组织交互；后端新建独立的知识包、DeepSeek结构化生成和响应净化服务，通过一个受限 POST 接口交付。系统不写入分析案例、不引入向量数据库，所有模型引用必须由服务端知识包白名单验证并重新填充。

**Tech Stack:** Python 3.9+、Flask 3、Flask-SQLAlchemy、Pydantic 2、Flask-Limiter、OpenAI兼容DeepSeek客户端、React 19、TypeScript 6、Vite 8、Ant Design 6、Vitest、Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-19-expression-lab-design.md`

## Global Constraints

- 第一版目标语言只接受英语 `en`，但请求和领域类型保留 `target_language`。
- 每次分析必须选择 1–5 个已发布术语；不得读取或发送未发布内容。
- 中文原文去除首尾空白后必须为 10–1000 个字符。
- 第一版每次请求只调用一次DeepSeek；仅在输出结构异常时允许一次格式修复重试。
- 不保存用户原文、分析结果、模型原始响应或内部提示词到数据库。
- 模型提供的 `term_id`、`translation_id`、`source_id` 必须属于本次知识包，否则删除并产生警告。
- 来源标题、机构和URL必须由后端依据合法 `source_id` 重新填充，不信任模型生成的来源元数据。
- 所有成功响应必须由服务端设置 `review_status: ai_unreviewed`，不得展示百分比置信度。
- 分析接口默认按客户端IP限制为每分钟5次；单机内存限流仅用于当前部署形态，多实例部署前必须改用共享存储。
- API Key只从被Git忽略的 `term-backend/.env` 读取；响应和日志不得包含密钥、完整原文、知识包或供应商内部异常。
- 前端不能直接调用DeepSeek；导出只基于后端已验证响应，不执行模型生成的HTML。
- 现有DeepSeek SSE、公共术语API、旧只读兼容接口和数据库迁移必须保持通过。

---

## 文件结构

### 后端新增

```text
term-backend/termbase_app/
  expression_lab/
    __init__.py                 # 对外导出领域类型和服务
    contracts.py                # 请求枚举、Pydantic模型与领域异常
    knowledge.py                # 已发布术语知识包查询和裁剪
    generator.py                # DeepSeek调用、JSON解析、一次格式修复
    sanitizer.py                # ID白名单校验、来源回填和警告
  routes/expression_lab.py      # POST /api/v1/expression-lab/analyze
  extensions.py                # 新增Limiter扩展
  tests/
```

后端测试仍位于：

```text
term-backend/tests/
  test_expression_lab_contracts.py
  test_expression_lab_knowledge.py
  test_expression_lab_generator.py
  test_expression_lab_api.py
```

### 后端修改

```text
term-backend/requirements.txt
term-backend/termbase_app/config.py
term-backend/termbase_app/extensions.py
term-backend/termbase_app/__init__.py
API.md
README.md
```

### 前端新增

```text
term-frontend/src/
  types/expressionLab.ts
  services/expressionLabApi.ts
  services/expressionLabApi.test.ts
  features/expression-lab/
    ExpressionLabPage.tsx
    ExpressionLabPage.test.tsx
    TermSelector.tsx
    KnowledgePack.tsx
    CommunicationTaskForm.tsx
    GenerationStatus.tsx
    ExpressionReport.tsx
    AlternativeComparison.tsx
    CulturalRiskPanel.tsx
    ReferenceList.tsx
    exportExpressionReport.ts
    exportExpressionReport.test.ts
    expression-lab.css
```

### 前端修改

```text
term-frontend/src/app/routes.tsx
```

---

### Task 1: 建立表达实验室领域契约和配置

**Files:**
- Create: `term-backend/termbase_app/expression_lab/__init__.py`
- Create: `term-backend/termbase_app/expression_lab/contracts.py`
- Create: `term-backend/tests/test_expression_lab_contracts.py`
- Modify: `term-backend/requirements.txt`
- Modify: `term-backend/termbase_app/config.py`

**Interfaces:**
- Consumes: Flask配置覆盖机制和DeepSeek模型配置。
- Produces: `ExpressionTask`、`ModelExpressionReport`、`ValidatedExpressionReport`、固定枚举、`ExpressionLabError`异常族和表达实验室配置项。

- [ ] **Step 1: 添加直接依赖和失败契约测试**

在 `requirements.txt` 明确加入：

```text
pydantic>=2.8,<3
flask-limiter>=3.8,<5
```

创建测试，覆盖合法输入规范化、非法目标语言、术语数量、原文长度、非法枚举和输出模式：

```python
import unittest
from pydantic import ValidationError

from termbase_app.expression_lab.contracts import ExpressionTask


class ExpressionLabContractTests(unittest.TestCase):
    def test_task_normalizes_ids_and_source_text(self):
        task = ExpressionTask.model_validate({
            "term_ids": [3, 1, 3],
            "source_text": "  中华文明倡导和而不同。  ",
            "target_language": "en",
            "audience": "overseas_youth",
            "scenario": "cultural_exhibition",
            "style": "explanatory",
            "locale": "general_english",
        })
        self.assertEqual(task.term_ids, [3, 1])
        self.assertEqual(task.source_text, "中华文明倡导和而不同。")

    def test_task_rejects_non_english_target(self):
        with self.assertRaises(ValidationError):
            ExpressionTask.model_validate({
                "term_ids": [1], "source_text": "这是一个满足长度要求的中文表达",
                "target_language": "fr", "audience": "general_public",
                "scenario": "news_media", "style": "concise",
                "locale": "general_english",
            })
```

- [ ] **Step 2: 运行红灯测试**

Run:

```powershell
cd term-backend
.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_contracts -v
```

Expected: FAIL，原因是 `termbase_app.expression_lab` 尚不存在。

- [ ] **Step 3: 实现固定枚举和请求模型**

在 `contracts.py` 定义：

```python
from enum import StrEnum
from pydantic import BaseModel, ConfigDict, Field, field_validator


class Audience(StrEnum):
    ACADEMIC = "academic"
    INTERNATIONAL_MEDIA = "international_media"
    OVERSEAS_YOUTH = "overseas_youth"
    GENERAL_PUBLIC = "general_public"


class Scenario(StrEnum):
    ACADEMIC_PAPER = "academic_paper"
    POLICY_TEXT = "policy_text"
    NEWS_MEDIA = "news_media"
    CULTURAL_EXHIBITION = "cultural_exhibition"
    SOCIAL_MEDIA = "social_media"


class ExpressionStyle(StrEnum):
    FORMAL = "formal"
    EXPLANATORY = "explanatory"
    CONCISE = "concise"
    ACCESSIBLE = "accessible"


class EnglishLocale(StrEnum):
    GENERAL = "general_english"
    BRITISH = "british_english"
    AMERICAN = "american_english"


class ExpressionTask(BaseModel):
    model_config = ConfigDict(extra="forbid")
    term_ids: list[int] = Field(min_length=1, max_length=5)
    source_text: str = Field(min_length=10, max_length=1000)
    target_language: str = Field(pattern="^en$")
    audience: Audience
    scenario: Scenario
    style: ExpressionStyle
    locale: EnglishLocale

    @field_validator("term_ids")
    @classmethod
    def normalize_term_ids(cls, value):
        normalized = list(dict.fromkeys(value))
        if any(item <= 0 for item in normalized) or len(normalized) > 5:
            raise ValueError("term_ids must contain 1-5 positive unique ids")
        return normalized

    @field_validator("source_text")
    @classmethod
    def normalize_source_text(cls, value):
        value = value.strip()
        if not 10 <= len(value) <= 1000:
            raise ValueError("source_text must contain 10-1000 characters")
        return value
```

- [ ] **Step 4: 实现模型输出和服务端响应类型**

定义 `RecommendedExpression`、`AlternativeExpression`、`TermUsage`、`CulturalRisk`、`ModelReference`、`ModelExpressionReport`。所有模型使用 `extra="forbid"`；列表设置明确数量；风险和复核优先级使用枚举。`ValidatedExpressionReport` 在模型结构之外增加后端回填的 `ReferenceDetail` 和 `warnings`。

领域异常固定为：

```python
class ExpressionLabError(Exception):
    status_code = 500
    public_message = "表达分析暂时不可用"

class KnowledgeTermNotFound(ExpressionLabError):
    status_code = 404
    public_message = "部分术语不存在或尚未发布"

class ProviderUnavailable(ExpressionLabError):
    status_code = 503
    public_message = "AI服务暂时不可用，请稍后重试"

class ProviderBadResponse(ExpressionLabError):
    status_code = 502
    public_message = "AI服务返回了不可用结果，请稍后重试"

class InvalidModelOutput(ExpressionLabError):
    status_code = 422
    public_message = "生成结果结构异常，请重试"
```

- [ ] **Step 5: 添加表达实验室配置**

在 `Config` 中增加：

```python
EXPRESSION_LAB_RATE_LIMIT = os.environ.get("EXPRESSION_LAB_RATE_LIMIT", "5 per minute")
EXPRESSION_LAB_MAX_KNOWLEDGE_CHARS = int(os.environ.get("EXPRESSION_LAB_MAX_KNOWLEDGE_CHARS", "18000"))
EXPRESSION_LAB_PROVIDER_TIMEOUT = float(os.environ.get("EXPRESSION_LAB_PROVIDER_TIMEOUT", "45"))
EXPRESSION_LAB_MAX_BODY_BYTES = int(os.environ.get("EXPRESSION_LAB_MAX_BODY_BYTES", "16384"))
```

- [ ] **Step 6: 运行契约测试和完整后端测试**

Run:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_contracts -v
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Expected: 新契约测试和现有31个后端测试全部PASS。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/requirements.txt term-backend/termbase_app/config.py term-backend/termbase_app/expression_lab term-backend/tests/test_expression_lab_contracts.py
git commit -m "feat: define expression lab contracts"
```

---

### Task 2: 构造只包含已发布内容的编号知识包

**Files:**
- Create: `term-backend/termbase_app/expression_lab/knowledge.py`
- Create: `term-backend/tests/test_expression_lab_knowledge.py`
- Modify: `term-backend/termbase_app/expression_lab/contracts.py`
- Modify: `term-backend/termbase_app/expression_lab/__init__.py`

**Interfaces:**
- Consumes: `ExpressionTask.term_ids`和Task 1领域类型。
- Produces: `build_knowledge_pack(term_ids: list[int], max_chars: int) -> KnowledgePack`；`KnowledgePack`提供 `prompt_text`、`summary`、合法ID集合和来源映射。

- [ ] **Step 1: 写知识包红灯测试**

测试数据库创建一个已发布术语和一个草稿术语，为已发布术语添加两条英语译文、来源证据、概念语境、译法语境和文化说明。断言：

```python
pack = build_knowledge_pack([published.id], max_chars=18000)
self.assertIn("TERM-1", pack.prompt_text)
self.assertIn("SOURCE-1", pack.prompt_text)
self.assertEqual(pack.allowed_term_ids, {published.id})
self.assertEqual(pack.allowed_source_ids, {source.id})
self.assertEqual(pack.summary.term_count, 1)

with self.assertRaises(KnowledgeTermNotFound):
    build_knowledge_pack([published.id, draft.id], max_chars=18000)
```

同时测试请求顺序保持稳定、相同输入生成相同编号、裁剪不会删除推荐英语译法、知识包不包含 `legacy_payload` 和未发布内容。

- [ ] **Step 2: 运行红灯测试**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_knowledge -v`

Expected: FAIL，原因是 `build_knowledge_pack` 尚不存在。

- [ ] **Step 3: 定义知识包类型**

在 `contracts.py` 增加：

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class KnowledgeSummary:
    term_count: int
    translation_count: int
    source_count: int
    context_count: int
    truncated: bool

@dataclass(frozen=True)
class KnowledgePack:
    prompt_text: str
    summary: KnowledgeSummary
    allowed_term_ids: set[int]
    allowed_translation_ids: set[int]
    allowed_source_ids: set[int]
    source_details: dict[int, dict]
```

- [ ] **Step 4: 实现一次查询和稳定编号**

`knowledge.py` 使用 `db.select(Term).where(Term.id.in_(term_ids), Term.status == "published")`，并通过 `selectinload` 一次加载英语译法、语言、来源证据、术语/译法语境、文化说明和已发布关系。查询后按请求 `term_ids` 顺序重排；任意ID缺失即抛出 `KnowledgeTermNotFound`。

编号规则按术语顺序及数据库ID稳定排序：

```text
TERM-1, TERM-2
TRANSLATION-1, TRANSLATION-2
SOURCE-1, SOURCE-2
CONTEXT-1, NOTE-1
```

每一段使用明确分隔符，用户原文不会进入知识包。

- [ ] **Step 5: 实现确定性裁剪**

当 `prompt_text` 超过 `max_chars`，依次保留：

1. 术语名称、定义、层级和数据质量
2. 推荐英语译法
3. 直接来源证据
4. 文化说明
5. 概念和译法语境
6. 相关术语

禁止从字符串中间截断JSON或编号项；按完整块丢弃低优先级项目，并设置 `summary.truncated=True`。

- [ ] **Step 6: 运行测试**

Run:

```powershell
.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_knowledge -v
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Expected: 知识包测试及完整后端测试PASS。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/termbase_app/expression_lab term-backend/tests/test_expression_lab_knowledge.py
git commit -m "feat: build grounded expression knowledge packs"
```

---

### Task 3: 实现DeepSeek结构化生成和引用净化

**Files:**
- Create: `term-backend/termbase_app/expression_lab/generator.py`
- Create: `term-backend/termbase_app/expression_lab/sanitizer.py`
- Create: `term-backend/tests/test_expression_lab_generator.py`
- Modify: `term-backend/termbase_app/expression_lab/__init__.py`

**Interfaces:**
- Consumes: `ExpressionTask`、`KnowledgePack`、`current_app.extensions["deepseek_client"]`和`DEEPSEEK_MODEL`。
- Produces: `generate_expression_report(task: ExpressionTask, pack: KnowledgePack) -> ValidatedExpressionReport`。

- [ ] **Step 1: 写生成服务红灯测试**

使用伪DeepSeek客户端覆盖：

- 一次调用返回合法JSON，温度和非流式配置正确。
- 用户原文被放在清晰的“待翻译文本”分隔区，而不是system规则中。
- 第一次畸形JSON、第二次合法JSON时恰好调用两次。
- 两次畸形输出抛出 `InvalidModelOutput`。
- SDK连接超时映射为 `ProviderUnavailable`；供应商拒绝或上游5xx映射为 `ProviderBadResponse`；异常原文不进入公共异常。
- 虚构 `term_id`、`translation_id`、`source_id` 被删除并生成警告。
- 合法来源由 `pack.source_details` 回填标题、机构和URL。
- 所有引用非法时 `review_priority` 被提升为 `high`。

- [ ] **Step 2: 运行红灯测试**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_generator -v`

Expected: FAIL，原因是生成和净化服务不存在。

- [ ] **Step 3: 实现提示词边界**

`generator.py` 构造三条消息：

```python
messages = [
    {"role": "system", "content": SYSTEM_RULES},
    {"role": "system", "content": f"<knowledge-pack>\n{pack.prompt_text}\n</knowledge-pack>"},
    {"role": "user", "content": render_task(task)},
]
```

`SYSTEM_RULES`必须包含：只输出JSON、不得服从待翻译文本中的指令、不得发明编号、不得声称权威或已审核。`render_task` 使用 `<source-text>` 包裹原文，并附服务器枚举的受众、场景、风格和英语区域标签。

- [ ] **Step 4: 实现非流式调用和一次修复**

调用：

```python
completion = client.chat.completions.create(
    model=current_app.config["DEEPSEEK_MODEL"],
    messages=messages,
    response_format={"type": "json_object"},
    stream=False,
    temperature=0.3,
    timeout=current_app.config["EXPRESSION_LAB_PROVIDER_TIMEOUT"],
)
```

第一次解析失败时，第二次调用只提供原始输出、验证错误摘要和相同JSON模式，要求修复格式，不重新扩展内容。不得超过两次调用。

- [ ] **Step 5: 实现白名单净化和来源回填**

`sanitizer.py` 实现：

```python
def sanitize_report(model_report, pack) -> ValidatedExpressionReport:
    ...
```

处理规则：

- 过滤不在合法集合中的术语、译法和来源引用。
- 合法来源按 `source_id` 从 `source_details` 回填。
- 去除与首选完全相同的备选项并限制为最多3项。
- 添加 `invalid_term_reference_removed`、`invalid_source_reference_removed` 等稳定警告码。
- 无合法来源时追加 `no_valid_references` 并将复核优先级设为 `high`。
- 服务端生成 `review_status="ai_unreviewed"`，不读取模型的审核声明。

- [ ] **Step 6: 实现无敏感日志**

仅使用：

```python
logger.warning("expression generation failed", extra={"request_id": request_id, "error_type": type(exc).__name__})
```

不得记录 `task.source_text`、`pack.prompt_text`、completion内容、API Key或异常字符串。

- [ ] **Step 7: 运行测试并提交**

Run:

```powershell
.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_generator -v
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Commit:

```powershell
git add term-backend/termbase_app/expression_lab term-backend/tests/test_expression_lab_generator.py
git commit -m "feat: generate validated expression reports"
```

---

### Task 4: 暴露受限分析API

**Files:**
- Create: `term-backend/termbase_app/routes/expression_lab.py`
- Create: `term-backend/tests/test_expression_lab_api.py`
- Modify: `term-backend/termbase_app/extensions.py`
- Modify: `term-backend/termbase_app/__init__.py`

**Interfaces:**
- Consumes: Tasks 1–3 的契约、知识包和生成服务。
- Produces: `POST /api/v1/expression-lab/analyze`稳定API。

- [ ] **Step 1: 写API红灯测试**

测试通过应用工厂注入伪生成服务或伪DeepSeek客户端，覆盖：

```python
response = client.post("/api/v1/expression-lab/analyze", json=valid_payload)
self.assertEqual(response.status_code, 200)
self.assertEqual(response.get_json()["data"]["review_status"], "ai_unreviewed")
```

并覆盖：非JSON、请求体超限、缺字段、非法枚举、0/6个术语、未发布术语、供应商不可用、畸形输出、非法引用警告、成功响应不含内部提示词和原始供应商响应。

记录请求前后的 `Term`、`Translation`、`Source`、`TopicItem` 数量，断言分析成功和失败都不会写入知识表或新增案例表。

- [ ] **Step 2: 写限流红灯测试**

测试应用配置：

```python
{
    "TESTING": True,
    "RATELIMIT_ENABLED": True,
    "EXPRESSION_LAB_RATE_LIMIT": "2 per minute",
    "RATELIMIT_STORAGE_URI": "memory://",
}
```

同一IP第三次请求返回429，不同IP使用独立配额。测试显式设置 `REMOTE_ADDR`，不默认信任任意 `X-Forwarded-For`。

- [ ] **Step 3: 运行红灯测试**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_api -v`

Expected: FAIL，原因是路由和Limiter尚未注册。

- [ ] **Step 4: 注册Limiter扩展**

`extensions.py`：

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
```

在 `create_app` 中 `limiter.init_app(app)`。测试默认可通过 `RATELIMIT_ENABLED=False`关闭，限流专项测试显式开启。

- [ ] **Step 5: 实现路由和错误信封**

路由顺序：

1. 检查 `request.content_length` 不超过配置。
2. 要求 `request.is_json`。
3. `ExpressionTask.model_validate(request.get_json())`。
4. `build_knowledge_pack`。
5. `generate_expression_report`。
6. 返回 `{code, message, data}`。

Pydantic错误返回400并只列出稳定的字段级中文说明。`ExpressionLabError`按自身状态码返回。未知异常只记录请求ID和类型，返回500通用消息。

路由使用 `uuid.uuid4()` 生成不透明 `request_id`，使用UTC时间生成 `generated_at`，并由服务器组装：

```python
{
    "request_id": request_id,
    "input_summary": {
        "source_text": task.source_text,
        "target_language": "en",
        "audience": task.audience.value,
        "scenario": task.scenario.value,
        "style": task.style.value,
        "locale": task.locale.value,
    },
    "knowledge_summary": asdict(pack.summary),
    "report": validated_report.model_dump(),
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "review_status": "ai_unreviewed",
    "warnings": validated_report.warnings,
}
```

为Limiter的429异常注册JSON错误处理器，返回相同 `{code, message, data}` 信封，不返回默认HTML页面。

使用：

```python
@bp.post("/api/v1/expression-lab/analyze")
@limiter.limit(lambda: current_app.config["EXPRESSION_LAB_RATE_LIMIT"])
def analyze_expression():
    ...
```

- [ ] **Step 6: 注册蓝图并运行回归测试**

Run:

```powershell
.\venv\Scripts\python.exe -m unittest tests.test_expression_lab_api -v
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

额外运行现有 `tests.test_chat_stream`，确认旧SSE契约未变化。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/termbase_app/extensions.py term-backend/termbase_app/__init__.py term-backend/termbase_app/routes/expression_lab.py term-backend/tests/test_expression_lab_api.py
git commit -m "feat: expose protected expression analysis API"
```

---

### Task 5: 建立前端类型、API客户端和安全导出

**Files:**
- Create: `term-frontend/src/types/expressionLab.ts`
- Create: `term-frontend/src/services/expressionLabApi.ts`
- Create: `term-frontend/src/services/expressionLabApi.test.ts`
- Create: `term-frontend/src/features/expression-lab/exportExpressionReport.ts`
- Create: `term-frontend/src/features/expression-lab/exportExpressionReport.test.ts`

**Interfaces:**
- Consumes: Task 4 API信封和现有Axios `request`实例。
- Produces: `analyzeExpression(input: ExpressionTaskInput): Promise<ExpressionAnalysis>`、`toExpressionMarkdown`、`downloadExpressionJson`。

- [ ] **Step 1: 定义与后端完全一致的类型**

`types/expressionLab.ts` 定义字面量联合：

```typescript
export type Audience = 'academic' | 'international_media' | 'overseas_youth' | 'general_public'
export type Scenario = 'academic_paper' | 'policy_text' | 'news_media' | 'cultural_exhibition' | 'social_media'
export type ExpressionStyle = 'formal' | 'explanatory' | 'concise' | 'accessible'
export type EnglishLocale = 'general_english' | 'british_english' | 'american_english'
export type ReviewPriority = 'low' | 'medium' | 'high'
```

请求固定 `target_language: 'en'`；响应定义 `RecommendedExpression`、`AlternativeExpression`、`TermUsage`、`CulturalRisk`、`ReferenceDetail`、`ExpressionReport`和`ExpressionAnalysis`，字段名逐项对应后端。

- [ ] **Step 2: 写客户端红灯测试**

使用真实Axios适配器或对 `request.post` 的边界mock，断言请求路径和完整载荷；用契约形状fixture断言响应解包；429、422、503保持拒绝且错误消息由现有拦截器显示。

- [ ] **Step 3: 实现客户端**

```typescript
export async function analyzeExpression(
  input: ExpressionTaskInput,
): Promise<ExpressionAnalysis> {
  const response = await request.post<ExpressionAnalysisResponse>(
    '/api/v1/expression-lab/analyze',
    input,
    { timeout: 60_000 },
  )
  return (response as unknown as ExpressionAnalysisResponse).data
}
```

只为该长请求覆盖超时，不修改其他API的15秒默认值。

- [ ] **Step 4: 写导出红灯测试**

断言Markdown包含任务条件、原文、首选/备选、术语采用、风险、真实来源、局限、生成时间和AI未复核声明；JSON不包含提示词、API Key或供应商响应字段；包含 `<script>` 的模型文本保持普通文本，不注入DOM。

- [ ] **Step 5: 实现纯函数导出**

```typescript
export function toExpressionMarkdown(analysis: ExpressionAnalysis): string
export function toExpressionJson(analysis: ExpressionAnalysis): string
export function downloadTextFile(content: string, extension: 'md' | 'json'): void
```

文件名使用服务器 `request_id` 的安全字符子集和UTC时间，不使用用户原文作为路径或文件名。Blob MIME分别为 `text/markdown;charset=utf-8` 和 `application/json;charset=utf-8`。

- [ ] **Step 6: 运行测试并提交**

Run:

```powershell
cd term-frontend
npm test -- --run src/services/expressionLabApi.test.ts src/features/expression-lab/exportExpressionReport.test.ts
npm run build
```

Commit:

```powershell
git add term-frontend/src/types/expressionLab.ts term-frontend/src/services/expressionLabApi.ts term-frontend/src/services/expressionLabApi.test.ts term-frontend/src/features/expression-lab/exportExpressionReport.ts term-frontend/src/features/expression-lab/exportExpressionReport.test.ts
git commit -m "feat: add expression lab client contracts"
```

---

### Task 6: 实现术语选择和传播任务表单

**Files:**
- Create: `term-frontend/src/features/expression-lab/ExpressionLabPage.tsx`
- Create: `term-frontend/src/features/expression-lab/ExpressionLabPage.test.tsx`
- Create: `term-frontend/src/features/expression-lab/TermSelector.tsx`
- Create: `term-frontend/src/features/expression-lab/KnowledgePack.tsx`
- Create: `term-frontend/src/features/expression-lab/CommunicationTaskForm.tsx`
- Create: `term-frontend/src/features/expression-lab/GenerationStatus.tsx`
- Create: `term-frontend/src/features/expression-lab/expression-lab.css`
- Modify: `term-frontend/src/app/routes.tsx`

**Interfaces:**
- Consumes: `listTerms`、`getTerm`、`analyzeExpression`、Task 5类型。
- Produces: `/lab`完整输入和生成状态工作流；结果区域暂以可替换的语义容器显示。

- [ ] **Step 1: 写路由和输入红灯测试**

通过 `AppRoutes` 在 `/lab` 渲染，mock术语API与分析API。断言：

- 页面不再显示阶段占位符。
- 可搜索术语并选择，最多5个。
- 已选术语显示推荐英语译法、层级、分类、质量和来源摘要。
- 未选择术语、少于10字、超过1000字均不能提交并显示字段错误。
- 固定下拉值映射到API枚举，目标语言始终为 `en`。
- 提交显示知识摘要和三阶段等待文案。
- 失败保留表单和已选术语，重试发送相同载荷。

- [ ] **Step 2: 运行红灯测试**

Run: `npm test -- --run src/features/expression-lab/ExpressionLabPage.test.tsx`

Expected: FAIL，原因是页面组件尚不存在且路由仍为占位页。

- [ ] **Step 3: 实现TermSelector**

使用显式搜索按钮或300毫秒防抖调用：

```typescript
listTerms({ q, language: 'en', page: 1, pageSize: 8 })
```

搜索结果必须支持键盘选择；选择重复项无效；达到5个时禁用其他添加按钮。每次选择后用 `getTerm(id)` 获取完整知识摘要并缓存于当前页面状态，不写浏览器持久化存储。

- [ ] **Step 4: 实现KnowledgePack和表单**

`KnowledgePack`展示所选术语及可展开依据。`CommunicationTaskForm`使用受控字段，选项值来自Task 5联合类型，中文标签与枚举值分离。原文计数实时显示 `当前/1000`。

提交摘要基于当前已选术语详情计算译文和来源数量，不伪造未知数量。

- [ ] **Step 5: 实现页面状态机**

页面状态限定为：

```typescript
type LabState = 'editing' | 'generating' | 'success' | 'error'
```

生成时禁用重复提交但允许用户取消前端等待显示；取消只忽略迟到响应，不声称已经取消供应商调用。使用请求序号避免旧响应覆盖新请求。

三个等待阶段按时间切换文案但不显示百分比；响应到达即进入success，失败进入error且保留输入。

- [ ] **Step 6: 替换路由占位并实现响应式样式**

将：

```tsx
<Route path="lab" element={<StagedPage title="表达实验室" />} />
```

替换为：

```tsx
<Route path="lab" element={<ExpressionLabPage />} />
```

桌面双栏、移动端单栏；所有表单控件有可见label；错误区使用 `role="alert"`；加载状态使用 `aria-live`和`aria-busy`。

- [ ] **Step 7: 运行测试和提交**

Run:

```powershell
npm test -- --run src/features/expression-lab/ExpressionLabPage.test.tsx
npm test -- --run
npm run build
```

Commit:

```powershell
git add term-frontend/src/features/expression-lab term-frontend/src/app/routes.tsx
git commit -m "feat: build expression lab workflow"
```

---

### Task 7: 实现结构化研究报告和导出交互

**Files:**
- Create: `term-frontend/src/features/expression-lab/ExpressionReport.tsx`
- Create: `term-frontend/src/features/expression-lab/AlternativeComparison.tsx`
- Create: `term-frontend/src/features/expression-lab/CulturalRiskPanel.tsx`
- Create: `term-frontend/src/features/expression-lab/ReferenceList.tsx`
- Create: `term-frontend/src/features/expression-lab/ExpressionReport.test.tsx`
- Modify: `term-frontend/src/features/expression-lab/ExpressionLabPage.tsx`
- Modify: `term-frontend/src/features/expression-lab/expression-lab.css`

**Interfaces:**
- Consumes: Task 5 `ExpressionAnalysis`与导出函数、Task 6 success状态。
- Produces: 完整可比较、可复制、可下载且明显未复核的报告UI。

- [ ] **Step 1: 写报告红灯测试**

使用完整fixture断言：

- 首选译文、理由、策略和1–3个备选方案。
- 每个备选显示 `best_for` 和 `tradeoff`。
- 术语采用显示真实术语名称/链接、采用译法和解释。
- 文化风险按low/medium/high映射稳定中文标签和非纯颜色提示。
- 引用只显示后端回填标题、机构、证据用途和安全HTTP(S)链接。
- warnings、limitations、review_priority显示。
- 页面顶部和导出内容均包含“AI生成、尚未人工复核”。
- Markdown/JSON按钮调用对应导出函数，复制失败显示可理解错误。
- 含HTML的模型文本按React文本节点显示，不能创建脚本或任意HTML节点。

- [ ] **Step 2: 运行红灯测试**

Run: `npm test -- --run src/features/expression-lab/ExpressionReport.test.tsx`

Expected: FAIL，原因是报告组件尚不存在。

- [ ] **Step 3: 实现报告组件边界**

`ExpressionReport`只做章节组织；对照、风险和来源由独立组件处理。来源URL复用知识档案页的HTTP(S)校验思路：

```typescript
function safeHttpUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}
```

- [ ] **Step 4: 实现复制和导出**

复制首选译文使用 `navigator.clipboard.writeText`，失败时保留内容并提示手动选择。下载按钮调用Task 5纯函数。任何按钮都不得重新调用分析接口。

- [ ] **Step 5: 补齐可访问性和视觉对照**

- 报告使用单一 `h1` 后按 `h2/h3`分层。
- 风险级别同时显示文本和图标/边框，不只依赖颜色。
- 对照表在窄屏变为卡片堆叠。
- 引用链接使用 `target="_blank" rel="noreferrer noopener"`。
- 警告使用 `role="status"`，模型失败才使用 `role="alert"`。

- [ ] **Step 6: 运行测试和提交**

Run:

```powershell
npm test -- --run src/features/expression-lab/ExpressionReport.test.tsx
npm test -- --run
npm run lint
npm run build
```

Commit:

```powershell
git add term-frontend/src/features/expression-lab
git commit -m "feat: present expression analysis reports"
```

---

### Task 8: 文档、真实服务冒烟和最终验收

**Files:**
- Modify: `README.md`
- Modify: `API.md`
- Create: `docs/expression-lab-guide.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: Tasks 1–7 完整功能。
- Produces: 可重复启动、配置、限流、使用和故障排查说明，以及最终验收证据。

- [ ] **Step 1: 更新环境变量示例**

在 `.env.example` 增加非敏感默认值：

```dotenv
EXPRESSION_LAB_RATE_LIMIT=5 per minute
EXPRESSION_LAB_MAX_KNOWLEDGE_CHARS=18000
EXPRESSION_LAB_PROVIDER_TIMEOUT=45
EXPRESSION_LAB_MAX_BODY_BYTES=16384
```

不得写入真实DeepSeek Key。

- [ ] **Step 2: 更新API和使用文档**

`API.md`写出完整请求、成功结构、400/404/413/422/429/502/503错误和 `ai_unreviewed`语义。`docs/expression-lab-guide.md`说明：

- 英语首发和1–5个术语限制。
- 数据不保存，刷新即丢失。
- Markdown/JSON导出。
- 单机内存限流限制，多实例需共享存储。
- 反向代理只有在受信任代理配置完成后才处理真实客户端IP。
- AI结果必须人工复核。

- [ ] **Step 3: 执行后端完整验证**

Run:

```powershell
cd term-backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
.\venv\Scripts\python.exe -m compileall -q app.py termbase_app
```

Expected: 全部后端测试PASS，无密钥或供应商异常详情出现在输出。

- [ ] **Step 4: 执行前端完整验证**

Run:

```powershell
cd term-frontend
npm test -- --run
npm run lint
npm run build
```

Expected: 测试与构建PASS，lint无新增错误；记录并区分既有旧页面warning。

- [ ] **Step 5: 执行安全扫描**

Run from repository root:

```powershell
$tracked = git ls-files
$matches = $tracked | ForEach-Object {
  if (Test-Path -LiteralPath $_) {
    Select-String -Path $_ -Pattern 'sk-[A-Za-z0-9]{20,}' -AllMatches -ErrorAction SilentlyContinue
  }
}
if ($matches) { $matches; exit 1 }
git check-ignore -v term-backend/.env
```

Expected: 跟踪文件无Key样式字符串，`.env`仍被忽略。

- [ ] **Step 6: 执行本地真实DeepSeek冒烟**

在不打印请求全文和响应全文的测试脚本或Flask测试客户端中，使用1个已发布术语和短中文表达调用真实接口一次。只记录：HTTP状态、是否含 `review_status=ai_unreviewed`、首选译文是否非空、引用ID是否合法、耗时。若外部服务不可用，记录为外部阻塞，不用伪造成功。

- [ ] **Step 7: 手工浏览器验收**

检查：

- 桌面和移动宽度的术语选择、表单和报告。
- 键盘可完成搜索、选择、提交和导出。
- 请求失败后表单不丢失。
- 生成期间不能重复提交，旧响应不能覆盖新结果。
- Markdown和JSON下载可打开且包含AI未复核声明。
- 页面刷新后没有从服务器恢复旧结果。

- [ ] **Step 8: 提交文档和最终修正**

```powershell
git add .env.example README.md API.md docs/expression-lab-guide.md
git commit -m "docs: document expression lab workflow"
```

---

## 规格覆盖检查

| 规格要求 | 实现任务 |
|---|---|
| 英语首发、固定枚举、1–5术语、10–1000字 | Tasks 1, 4, 6 |
| 已发布术语和编号知识包 | Task 2 |
| 单次DeepSeek结构化生成、一次格式修复 | Task 3 |
| 引用白名单、来源回填、复核标记 | Tasks 3, 4, 7 |
| IP限流、大小限制、错误信封和无敏感日志 | Tasks 3, 4, 8 |
| `/lab`三阶段工作流和无持久化 | Task 6 |
| 方案比较、文化风险、引用和局限 | Task 7 |
| Markdown/JSON安全导出 | Tasks 5, 7 |
| DeepSeek异常、格式异常、虚构引用测试 | Tasks 3, 4 |
| 移动端、可访问性和前端状态回归 | Tasks 6, 7, 8 |
| 配置、文档、真实冒烟和密钥扫描 | Task 8 |

## 有意延期

- 已有译文评估模式。
- 双阶段生成—批评—修订。
- 登录后保存案例、审核和发布。
- 法语、西班牙语、俄语和阿拉伯语。
- 多实例共享限流存储和生产级任务队列。
