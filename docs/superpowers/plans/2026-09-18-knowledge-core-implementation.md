# 多语知识核心与公共门户 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不破坏现有数据的前提下，建立规范化多语知识模型、可重复迁移流程、v1 公共读取 API，以及新的首页、术语探索和术语知识档案页面。

**Architecture:** 采用绞杀式迁移：旧表继续保留，新知识表统一使用 `kb_` 前缀；迁移服务从旧表幂等导入，前端逐页切换到 `/api/v1`。后端新增 `termbase_app` 应用包以避免与现有 `app.py` 冲突，最终由 `app.py` 作为兼容启动入口创建新应用并注册必要的旧接口。

**Tech Stack:** Python 3.9+、Flask 3、Flask-SQLAlchemy、Flask-Migrate/Alembic、MySQL 5.7+、SQLite 测试数据库、React 19、TypeScript 6、Vite 8、Ant Design 6、Vitest、Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-18-termbase-rebuild-design.md`

## Global Constraints

- 保留 React、Flask 和 MySQL，不引入 MongoDB、Neo4j、微服务或向量数据库。
- 新知识表必须与旧表共存，未经备份与验证不得删除或覆盖旧表。
- 所有密钥只来自被 Git 忽略的 `term-backend/.env`，不得进入源码、测试、日志或提交记录。
- 公共知识页面只读取已发布内容；本计划尚未交付审核工作台，因此迁移内容统一标记为 `published`，同时保留 `legacy_unreviewed` 数据质量标记。
- AI 不属于本计划的交付范围；现有 DeepSeek 流式接口必须继续工作且测试保持通过。
- 所有生产代码遵循测试先行：先观察目标测试因缺少行为而失败，再实现最小代码使其通过。
- 前端视觉使用深海军蓝、克制朱砂、暖白和浅灰，不采用娱乐化国潮、3D 地球或装饰性图谱。
- 现有 Excel 文件和旧数据库数据不得被修改；迁移只读取旧数据并写入 `kb_` 表。

## 子项目拆分

本计划只实现第一个独立子项目。后续单独编写：

1. `expression-lab`：场景化表达、来源上下文、结构化 DeepSeek 输出和降级。
2. `research-workspace`：登录、角色、编辑、提交、复核、发布和修订历史。
3. `topics-and-insights`：专题编辑、淮河展示深化、概念关系和成果驾驶舱。

---

## 文件结构

### 后端新增

```text
term-backend/
  termbase_app/
    __init__.py              # create_app 工厂与蓝图注册
    config.py                # 环境配置与测试覆盖
    extensions.py            # db 与 migrate 扩展
    models/
      __init__.py
      knowledge.py           # kb_ 核心知识实体
    routes/
      __init__.py
      public_terms.py        # v1 列表、筛选与详情
      health.py              # 健康检查
    services/
      __init__.py
      public_terms.py        # 公共查询与详情组装
      legacy_import.py       # 幂等旧数据导入
    schemas/
      __init__.py
      public_terms.py        # 稳定响应结构
  migrations/               # Alembic 迁移
  scripts/
    migrate_legacy_knowledge.py
  tests/
    test_app_factory.py
    test_knowledge_models.py
    test_legacy_import.py
    test_public_terms_api.py
```

### 后端修改

```text
term-backend/app.py          # 保留兼容启动入口与 DeepSeek 路由注册
term-backend/requirements.txt
term-backend/models.py       # 保留旧模型，仅增加明确的 legacy 注释
```

### 前端新增

```text
term-frontend/src/
  app/AppShell.tsx
  app/routes.tsx
  features/home/HomePage.tsx
  features/discovery/DiscoveryPage.tsx
  features/discovery/DiscoveryFilters.tsx
  features/discovery/TermResultItem.tsx
  features/term-profile/TermProfilePage.tsx
  features/term-profile/TranslationPanel.tsx
  features/term-profile/EvidencePanel.tsx
  services/knowledgeApi.ts
  types/knowledge.ts
  styles/tokens.css
  styles/app.css
  test/setup.ts
```

### 前端修改

```text
term-frontend/package.json
term-frontend/src/App.tsx
term-frontend/src/main.tsx
term-frontend/src/styles/global.css
term-frontend/vite.config.ts
```

---

### Task 0: 固化 DeepSeek 基线

**Files:**
- Commit existing: `.env.example`
- Commit existing: `API.md`
- Commit existing: `README.md`
- Commit existing: `term-backend/app.py`
- Commit existing: `term-backend/requirements.txt`
- Commit existing: `term-backend/tests/test_chat_stream.py`
- Commit existing: `term-frontend/src/pages/AboutPage.tsx`

**Interfaces:**
- Consumes: 当前工作区中已完成且验证过的 DeepSeek 迁移。
- Produces: 一个干净、可创建工作树的基线提交；`POST /api/chat/stream` 的 SSE 契约保持不变。

- [ ] **Step 1: 重新运行现有验证**

Run:

```powershell
cd D:\Termbase\term-backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
.\venv\Scripts\python.exe -m py_compile app.py models.py tests\test_chat_stream.py
cd D:\Termbase\term-frontend
npm run build
npm run lint
```

Expected: 后端 2 个测试通过，语法检查和前端构建退出码为 0；ESLint 只允许记录中已存在的 Hook 警告。

- [ ] **Step 2: 验证密钥没有进入跟踪文件**

Run:

```powershell
cd D:\Termbase
git grep -En "sk-[A-Za-z0-9]{20,}" -- .
git check-ignore -v term-backend/.env
```

Expected: 第一条无匹配并返回 1；第二条显示 `.gitignore` 的 `.env` 规则。

- [ ] **Step 3: 提交已完成的提供商切换**

```powershell
git add .env.example API.md README.md term-backend/app.py term-backend/requirements.txt term-backend/tests/test_chat_stream.py term-frontend/src/pages/AboutPage.tsx
git commit -m "feat: switch AI provider to DeepSeek"
```

Expected: 只提交以上文件，`term-backend/.env` 不在提交中。

---

### Task 1: 建立可测试的 Flask 应用工厂

**Files:**
- Create: `term-backend/termbase_app/__init__.py`
- Create: `term-backend/termbase_app/config.py`
- Create: `term-backend/termbase_app/extensions.py`
- Create: `term-backend/termbase_app/routes/__init__.py`
- Create: `term-backend/termbase_app/routes/health.py`
- Create: `term-backend/tests/test_app_factory.py`
- Modify: `term-backend/requirements.txt`

**Interfaces:**
- Consumes: `.env` 中 `DB_USER`、`DB_PASSWORD`、`DB_HOST`、`DB_NAME`。
- Produces: `create_app(config_overrides: dict | None = None) -> Flask`、共享扩展 `db` 和 `migrate`、`GET /api/v1/health`。

- [ ] **Step 1: 写应用工厂红灯测试**

```python
# tests/test_app_factory.py
import unittest

from termbase_app import create_app


class AppFactoryTests(unittest.TestCase):
    def test_health_route_uses_test_database_without_mysql(self):
        app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        response = app.test_client().get("/api/v1/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {
            "code": 200,
            "data": {"status": "ok"},
        })
```

- [ ] **Step 2: 运行测试确认因模块缺失而失败**

Run:

```powershell
cd D:\Termbase\term-backend
.\venv\Scripts\python.exe -m unittest tests.test_app_factory -v
```

Expected: FAIL/ERROR，原因是 `termbase_app` 尚不存在。

- [ ] **Step 3: 添加应用依赖**

在 `requirements.txt` 增加：

```text
flask-sqlalchemy
flask-migrate
```

Run:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

- [ ] **Step 4: 实现配置和扩展**

```python
# termbase_app/config.py
import os
from pathlib import Path
from urllib.parse import quote_plus
from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def database_uri() -> str:
    user = quote_plus(os.environ.get("DB_USER", "root"))
    password = quote_plus(os.environ.get("DB_PASSWORD", ""))
    host = os.environ.get("DB_HOST", "localhost")
    name = os.environ.get("DB_NAME", "term_database")
    return f"mysql+pymysql://{user}:{password}@{host}/{name}?charset=utf8mb4"


class Config:
    SQLALCHEMY_DATABASE_URI = database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_AS_ASCII = False
```

```python
# termbase_app/extensions.py
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)
migrate = Migrate()
```

- [ ] **Step 5: 实现健康蓝图与工厂**

```python
# termbase_app/routes/health.py
from flask import Blueprint, jsonify

bp = Blueprint("health", __name__)


@bp.get("/api/v1/health")
def health():
    return jsonify({"code": 200, "data": {"status": "ok"}})
```

```python
# termbase_app/__init__.py
from flask import Flask
from flask_cors import CORS

from .config import Config
from .extensions import db, migrate
from .routes.health import bp as health_bp


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": app.config.get(
        "CORS_ORIGINS", ["http://localhost:5173"]
    )}})
    app.register_blueprint(health_bp)
    return app
```

- [ ] **Step 6: 运行测试确认通过**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_app_factory -v`

Expected: 1 test PASS。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/requirements.txt term-backend/termbase_app term-backend/tests/test_app_factory.py
git commit -m "refactor: add testable Flask application factory"
```

---

### Task 2: 建立规范化知识模型

**Files:**
- Create: `term-backend/termbase_app/models/__init__.py`
- Create: `term-backend/termbase_app/models/knowledge.py`
- Create: `term-backend/tests/test_knowledge_models.py`
- Modify: `term-backend/termbase_app/__init__.py`

**Interfaces:**
- Consumes: Task 1 的 `db` 与 `create_app`。
- Produces: `Term`、`TermName`、`Language`、`Translation`、`Source`、`TermEvidence`、`Context`、`TermContext`、`TranslationContext`、`CulturalNote`、`TermRelation`、`Topic`、`TopicItem` 模型。

- [ ] **Step 1: 写模型关系红灯测试**

```python
# tests/test_knowledge_models.py
import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Language, Source, Term, Translation


class KnowledgeModelTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()

    def tearDown(self):
        db.drop_all()
        self.context.pop()

    def test_term_keeps_multiple_translations_and_sources(self):
        term = Term(
            preferred_name_zh="和而不同",
            definition_zh="承认差异并追求和谐共处",
            term_level="本源层",
            culture_category="中华优秀传统文化",
            status="published",
            data_quality="legacy_unreviewed",
        )
        language = Language(code="en", name_zh="英语", name_en="English")
        source = Source(title="中华思想文化术语", source_type="book")
        translation = Translation(
            term=term,
            language=language,
            text="harmony in diversity",
            translation_type="recommended",
            review_status="unreviewed",
        )
        term.sources.append(source)
        db.session.add_all([term, language, translation])
        db.session.commit()

        saved = db.session.get(Term, term.id)
        self.assertEqual(saved.translations[0].text, "harmony in diversity")
        self.assertEqual(saved.sources[0].title, "中华思想文化术语")
```

- [ ] **Step 2: 运行测试确认模型导入失败**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_knowledge_models -v`

Expected: FAIL/ERROR，原因是知识模型尚未定义。

- [ ] **Step 3: 实现模型枚举约束和核心关系**

在 `knowledge.py` 中实现以下固定表名与关系：

```python
term_sources = db.Table(
    "kb_term_sources",
    db.Column("term_id", db.ForeignKey("kb_terms.id"), primary_key=True),
    db.Column("source_id", db.ForeignKey("kb_sources.id"), primary_key=True),
)


class Term(db.Model):
    __tablename__ = "kb_terms"
    __table_args__ = (
        db.UniqueConstraint("legacy_table", "legacy_id", name="uq_kb_term_legacy"),
    )

    id = db.Column(db.Integer, primary_key=True)
    preferred_name_zh = db.Column(db.String(255), nullable=False, index=True)
    definition_zh = db.Column(db.Text, nullable=False, default="")
    cultural_connotation = db.Column(db.Text, nullable=False, default="")
    term_level = db.Column(db.String(50), nullable=False, default="")
    culture_category = db.Column(db.String(100), nullable=False, default="")
    status = db.Column(db.String(30), nullable=False, default="draft", index=True)
    data_quality = db.Column(db.String(30), nullable=False, default="curated")
    legacy_table = db.Column(db.String(50))
    legacy_id = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now(), onupdate=db.func.now())

    translations = db.relationship("Translation", back_populates="term", cascade="all, delete-orphan")
    names = db.relationship("TermName", back_populates="term", cascade="all, delete-orphan")
    sources = db.relationship("Source", secondary=term_sources, back_populates="terms")
```

同一文件继续实现：

- `TermName(kb_term_names)`：`term_id`、`name`、`name_type`。
- `Language(kb_languages)`：唯一 `code`、`name_zh`、`name_en`、`enabled`。
- `Translation(kb_translations)`：`term_id`、`language_id`、`text`、`translation_type`、`authority_level`、`region`、`review_status`、`note`。
- `Source(kb_sources)`：`title`、`organization`、`published_at`、`language_code`、`source_type`、`url`、`citation`、`authority_level`、`summary`、`legacy_value`。
- `TermEvidence(kb_term_evidence)`：`term_id`、可空 `translation_id`、`source_id`、`original_excerpt`、`translated_excerpt`、`locator`、`note`。
- `Context(kb_contexts)`：唯一 `code`、`name_zh`、`audience`、`style`、`description`。
- `TermContext(kb_term_contexts)`：复合主键 `term_id/context_id`、`explanation`、`example`、`note`，承载儿童解释等概念级场景内容。
- `TranslationContext(kb_translation_contexts)`：复合主键 `translation_id/context_id`、`recommendation_level`、`example`、`note`。
- `CulturalNote(kb_cultural_notes)`：`term_id`、`target_culture`、`difference_summary`、`literal_risk`、`misconception`、`recommendation`。
- `TermRelation(kb_term_relations)`：复合主键 `source_term_id/target_term_id/relation_type`。
- `Topic(kb_topics)`：唯一 `slug`、`title`、`summary`、`status`。
- `TopicItem(kb_topic_items)`：`topic_id`、可空 `term_id`、`entry_type`、`title`、JSON `payload`、`legacy_table`、`legacy_id`。

所有外键建立索引；所有父子内容关系使用 `cascade="all, delete-orphan"`；公共内容不得依赖数据库专属 JSON 查询。

`Source` 必须定义 `terms = db.relationship("Term", secondary=term_sources, back_populates="sources")`，确保 Task 2 测试中的双向关系成立。

- [ ] **Step 4: 在工厂中导入模型元数据**

在 `create_app` 中初始化扩展前后加入明确模型导入：

```python
from . import models  # noqa: F401
```

- [ ] **Step 5: 运行模型与应用工厂测试**

Run:

```powershell
.\venv\Scripts\python.exe -m unittest tests.test_app_factory tests.test_knowledge_models -v
```

Expected: 全部 PASS。

- [ ] **Step 6: 生成并检查初始迁移**

Run:

```powershell
$env:FLASK_APP='termbase_app:create_app'
.\venv\Scripts\flask.exe db init
.\venv\Scripts\flask.exe db migrate -m "add knowledge core tables"
```

检查迁移只创建 `kb_` 表，不删除或修改 `terms`、`huaihe_terms`、`huaihe_figures`、`huaihe_herbs`。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/termbase_app/models term-backend/termbase_app/__init__.py term-backend/tests/test_knowledge_models.py term-backend/migrations
git commit -m "feat: add normalized terminology knowledge model"
```

---

### Task 3: 实现幂等旧数据迁移

**Files:**
- Create: `term-backend/termbase_app/services/legacy_import.py`
- Create: `term-backend/scripts/migrate_legacy_knowledge.py`
- Create: `term-backend/tests/test_legacy_import.py`

**Interfaces:**
- Consumes: Task 2 的知识模型；旧表 `terms`、`huaihe_terms`、`huaihe_figures`、`huaihe_herbs`。
- Produces: `import_legacy_knowledge(session) -> ImportReport`，其中 `ImportReport` 包含 `terms_created`、`translations_created`、`sources_created`、`topic_items_created`、`skipped`。

- [ ] **Step 1: 写幂等迁移红灯测试**

```python
# tests/test_legacy_import.py
import unittest
from sqlalchemy import text

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Term, Topic, Translation
from termbase_app.services.legacy_import import import_legacy_knowledge


class LegacyImportTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        db.session.execute(text('''
            CREATE TABLE terms (
                id INTEGER PRIMARY KEY,
                "术语名称" TEXT,
                "术语层级" TEXT,
                "文化分类" TEXT,
                "场景分类" TEXT,
                "官方译法（英文）" TEXT,
                "官方译法（小语种）" TEXT,
                "文化内涵" TEXT,
                "来源" TEXT,
                "儿童解释" TEXT
            )
        '''))
        db.session.execute(text('''
            INSERT INTO terms VALUES
            (1, '和而不同', '本源层', '中华优秀传统文化', '国际交流',
             'harmony in diversity', '', '尊重差异、追求和谐', '论语', '大家可以不一样')
        '''))
        db.session.commit()

    def tearDown(self):
        db.session.remove()
        self.context.pop()

    def test_import_is_idempotent_and_preserves_translation_and_source(self):
        first = import_legacy_knowledge(db.session)
        second = import_legacy_knowledge(db.session)

        self.assertEqual(first.terms_created, 1)
        self.assertEqual(second.terms_created, 0)
        self.assertEqual(db.session.query(Term).count(), 1)
        self.assertEqual(db.session.query(Translation).one().text, "harmony in diversity")
        self.assertEqual(db.session.query(Term).one().sources[0].legacy_value, "论语")
```

- [ ] **Step 2: 运行测试确认导入服务缺失**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_legacy_import -v`

Expected: FAIL/ERROR，原因是 `legacy_import` 尚不存在。

- [ ] **Step 3: 实现导入报告和公共清洗函数**

```python
from dataclasses import dataclass
import math


@dataclass
class ImportReport:
    terms_created: int = 0
    translations_created: int = 0
    sources_created: int = 0
    topic_items_created: int = 0
    skipped: int = 0


def clean(value) -> str:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return ""
    text_value = str(value).strip()
    return "" if text_value.lower() == "nan" else text_value
```

- [ ] **Step 4: 实现术语导入规则**

`import_legacy_knowledge` 使用 SQLAlchemy Inspector 判断旧表是否存在。对每条旧术语：

1. 使用 `(legacy_table, legacy_id)` 查询，存在则跳过。
2. 创建 `Term`，状态为 `published`，质量为 `legacy_unreviewed`。
3. 英文译法写入语言 `en`；混合小语种字段写入语言 `und`，译法状态为 `unreviewed`。
4. 非空来源创建或复用 `Source(legacy_value=原值, source_type="legacy_text", authority_level="unverified")`。
5. 场景分类创建或复用 `Context(code="legacy-" + slug, name_zh=原值)`，并创建 `TermContext` 关联。
6. 儿童解释写入 `Context(code="children")` 对应的 `TermContext.explanation`，不丢弃原值。

导入 `huaihe_terms` 时同时创建/复用 `Topic(slug="huaihe-culture")` 并写入 `TopicItem(entry_type="term")`。人物和中药材每条写入 `TopicItem(entry_type="person"|"herb")`，全部旧字段保存在 `payload`，以保证第一阶段不丢失数据。

- [ ] **Step 5: 实现命令行脚本**

```python
# scripts/migrate_legacy_knowledge.py
from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.services.legacy_import import import_legacy_knowledge

app = create_app()
with app.app_context():
    report = import_legacy_knowledge(db.session)
    print(report)
```

脚本不得打印数据库连接串、密码或 API Key。

- [ ] **Step 6: 运行迁移测试两次**

Run:

```powershell
.\venv\Scripts\python.exe -m unittest tests.test_legacy_import -v
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Expected: 幂等测试和全部后端测试 PASS。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/termbase_app/services term-backend/scripts/migrate_legacy_knowledge.py term-backend/tests/test_legacy_import.py
git commit -m "feat: add idempotent legacy knowledge importer"
```

---

### Task 4: 建立 v1 公共术语 API

**Files:**
- Create: `term-backend/termbase_app/schemas/__init__.py`
- Create: `term-backend/termbase_app/schemas/public_terms.py`
- Create: `term-backend/termbase_app/services/public_terms.py`
- Create: `term-backend/termbase_app/routes/public_terms.py`
- Create: `term-backend/tests/test_public_terms_api.py`
- Modify: `term-backend/termbase_app/__init__.py`

**Interfaces:**
- Consumes: Task 2 模型和 Task 3 导入数据。
- Produces: `GET /api/v1/terms` 与 `GET /api/v1/terms/<id>`；响应键使用英文稳定标识，内容允许中文。

- [ ] **Step 1: 写列表和详情红灯测试**

```python
# tests/test_public_terms_api.py
import unittest

from termbase_app import create_app
from termbase_app.extensions import db
from termbase_app.models import Language, Source, Term, Translation


class PublicTermsApiTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        self.context = self.app.app_context()
        self.context.push()
        db.create_all()
        en = Language(code="en", name_zh="英语", name_en="English")
        term = Term(
            preferred_name_zh="和而不同",
            definition_zh="承认差异并追求和谐共处",
            term_level="本源层",
            culture_category="中华优秀传统文化",
            status="published",
        )
        term.translations.append(Translation(
            language=en,
            text="harmony in diversity",
            translation_type="recommended",
            review_status="reviewed",
        ))
        term.sources.append(Source(title="论语", source_type="classic"))
        db.session.add(term)
        db.session.commit()
        self.term_id = term.id
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        self.context.pop()

    def test_list_filters_published_terms_and_returns_summary(self):
        response = self.client.get("/api/v1/terms?q=和而&page=1&page_size=20")
        payload = response.get_json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(payload["meta"], {"page": 1, "page_size": 20, "total": 1})
        self.assertEqual(payload["data"][0]["preferred_name_zh"], "和而不同")
        self.assertEqual(payload["data"][0]["recommended_translation"]["text"], "harmony in diversity")

    def test_detail_includes_translations_and_sources(self):
        response = self.client.get(f"/api/v1/terms/{self.term_id}")
        payload = response.get_json()["data"]
        self.assertEqual(payload["translations"][0]["language_code"], "en")
        self.assertEqual(payload["sources"][0]["title"], "论语")
```

- [ ] **Step 2: 运行测试确认路由 404**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_public_terms_api -v`

Expected: FAIL，接口返回 404。

- [ ] **Step 3: 定义稳定响应结构**

在 `schemas/public_terms.py` 定义 TypedDict：

```python
class TranslationSummary(TypedDict):
    language_code: str
    language_name_zh: str
    text: str
    translation_type: str
    authority_level: str
    review_status: str


class TermSummary(TypedDict):
    id: int
    preferred_name_zh: str
    definition_zh: str
    term_level: str
    culture_category: str
    data_quality: str
    recommended_translation: TranslationSummary | None
    language_count: int
    source_count: int
```

详情结构在摘要基础上增加 `cultural_connotation`、`names`、`translations`、`sources`、`contexts`、`cultural_notes`、`relations` 和 `topics`。

- [ ] **Step 4: 实现查询服务**

```python
def list_published_terms(*, q="", level="", culture="", language="", page=1, page_size=20):
    page = max(1, page)
    page_size = min(100, max(1, page_size))
    stmt = db.select(Term).where(Term.status == "published")
    if q:
        stmt = stmt.where(Term.preferred_name_zh.like(f"%{q}%"))
    if level:
        stmt = stmt.where(Term.term_level == level)
    if culture:
        stmt = stmt.where(Term.culture_category == culture)
    if language:
        stmt = stmt.join(Term.translations).join(Translation.language).where(
            Language.code == language
        ).distinct()
    return db.paginate(stmt.order_by(Term.id), page=page, per_page=page_size, error_out=False)
```

详情查询必须使用 eager loading 避免逐项 N+1，并对非 `published` 内容返回 404。

- [ ] **Step 5: 实现蓝图和参数错误响应**

列表接受 `q`、`level`、`culture`、`language`、`page`、`page_size`。无法转换的页码返回：

```json
{"code": 400, "message": "分页参数必须是整数"}
```

成功响应：

```json
{"code": 200, "data": [], "meta": {"page": 1, "page_size": 20, "total": 0}}
```

详情不存在：

```json
{"code": 404, "message": "术语不存在或尚未发布"}
```

- [ ] **Step 6: 注册蓝图并运行全部后端测试**

Run: `.\venv\Scripts\python.exe -m unittest discover -s tests -v`

Expected: 全部 PASS。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/termbase_app/schemas term-backend/termbase_app/services/public_terms.py term-backend/termbase_app/routes/public_terms.py term-backend/termbase_app/__init__.py term-backend/tests/test_public_terms_api.py
git commit -m "feat: add public terminology knowledge API"
```

---

### Task 5: 建立前端测试基线和 v1 客户端

**Files:**
- Create: `term-frontend/src/test/setup.ts`
- Create: `term-frontend/src/types/knowledge.ts`
- Create: `term-frontend/src/services/knowledgeApi.ts`
- Create: `term-frontend/src/services/knowledgeApi.test.ts`
- Modify: `term-frontend/package.json`
- Modify: `term-frontend/vite.config.ts`

**Interfaces:**
- Consumes: Task 4 的 v1 API 响应。
- Produces: `listTerms(query: TermQuery): Promise<PaginatedTerms>` 与 `getTerm(id: number): Promise<TermProfile>`。

- [ ] **Step 1: 安装测试依赖并配置脚本**

Run:

```powershell
cd D:\Termbase\term-frontend
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

在 `package.json` 增加：

```json
"test": "vitest run"
```

将 `vite.config.ts` 的 `defineConfig` 改为从 `vitest/config` 导入，再增加测试配置，确保 TypeScript 能识别 `test` 字段：

```ts
import { defineConfig } from 'vitest/config'

test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
  globals: true,
},
```

- [ ] **Step 2: 写 API 客户端红灯测试**

```ts
// src/services/knowledgeApi.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from '../utils/request'
import { getTerm, listTerms } from './knowledgeApi'

vi.mock('../utils/request', () => ({
  default: { get: vi.fn() },
}))

describe('knowledgeApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends stable discovery query parameters', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: [], meta: { page: 1, page_size: 20, total: 0 } })
    await listTerms({ q: '和', level: '本源层', page: 1, pageSize: 20 })
    expect(request.get).toHaveBeenCalledWith('/api/v1/terms', {
      params: { q: '和', level: '本源层', page: 1, page_size: 20 },
    })
  })

  it('requests a term profile by id', async () => {
    vi.mocked(request.get).mockResolvedValue({ data: { id: 7 } })
    await getTerm(7)
    expect(request.get).toHaveBeenCalledWith('/api/v1/terms/7')
  })
})
```

- [ ] **Step 3: 运行测试确认模块缺失**

Run: `npm test -- src/services/knowledgeApi.test.ts`

Expected: FAIL，原因是 `knowledgeApi` 尚不存在。

- [ ] **Step 4: 定义类型并实现客户端**

`knowledge.ts` 必须定义：

```ts
export interface TranslationSummary {
  language_code: string
  language_name_zh: string
  text: string
  translation_type: 'recommended' | 'acceptable' | 'historical' | 'discouraged'
  authority_level: string
  review_status: string
}

export interface TermSummary {
  id: number
  preferred_name_zh: string
  definition_zh: string
  term_level: string
  culture_category: string
  data_quality: 'curated' | 'legacy_unreviewed'
  recommended_translation: TranslationSummary | null
  language_count: number
  source_count: number
}

export interface TermQuery {
  q?: string
  level?: string
  culture?: string
  language?: string
  page?: number
  pageSize?: number
}

export interface PageMeta {
  page: number
  page_size: number
  total: number
}

export interface PaginatedTerms {
  data: TermSummary[]
  meta: PageMeta
}

export interface TermProfile extends TermSummary {
  cultural_connotation: string
  names: Array<{ name: string; name_type: string }>
  translations: TranslationSummary[]
  sources: Array<{ id: number; title: string; organization: string; citation: string; url: string }>
  contexts: Array<{ code: string; name_zh: string; audience: string; style: string; explanation: string; example: string }>
  cultural_notes: Array<{ target_culture: string; difference_summary: string; literal_risk: string; recommendation: string }>
  relations: Array<{ id: number; name: string; relation_type: string }>
  topics: Array<{ slug: string; title: string }>
}
```

`knowledgeApi.ts` 将前端 `pageSize` 映射成后端 `page_size`，并返回拦截器已经解包后的 `data` 与 `meta`。

- [ ] **Step 5: 运行测试、类型检查并提交**

Run:

```powershell
npm test -- src/services/knowledgeApi.test.ts
npm run build
```

Expected: 测试和构建 PASS。

```powershell
git add term-frontend/package.json term-frontend/package-lock.json term-frontend/vite.config.ts term-frontend/src/test term-frontend/src/types/knowledge.ts term-frontend/src/services
git commit -m "test: add frontend knowledge API foundation"
```

---

### Task 6: 建立新视觉系统和应用外壳

**Files:**
- Create: `term-frontend/src/styles/tokens.css`
- Create: `term-frontend/src/styles/app.css`
- Create: `term-frontend/src/app/AppShell.tsx`
- Create: `term-frontend/src/app/AppShell.test.tsx`
- Create: `term-frontend/src/app/routes.tsx`
- Modify: `term-frontend/src/App.tsx`
- Modify: `term-frontend/src/main.tsx`
- Modify: `term-frontend/src/styles/global.css`

**Interfaces:**
- Consumes: 现有国际化初始化和 React Router。
- Produces: 公共布局、主导航、移动端导航和统一设计令牌。

- [ ] **Step 1: 写导航红灯测试**

```tsx
// src/app/AppShell.test.tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppShell from './AppShell'

it('presents the new public navigation and research identity', () => {
  render(<MemoryRouter><AppShell /></MemoryRouter>)
  expect(screen.getByRole('link', { name: '术语探索' })).toHaveAttribute('href', '/discover')
  expect(screen.getByRole('link', { name: '表达实验室' })).toHaveAttribute('href', '/lab')
  expect(screen.getByRole('link', { name: '文化专题' })).toHaveAttribute('href', '/topics')
  expect(screen.getByText('中国特色话语多语知识平台')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认组件缺失**

Run: `npm test -- src/app/AppShell.test.tsx`

Expected: FAIL，原因是 `AppShell` 尚不存在。

- [ ] **Step 3: 建立设计令牌**

`tokens.css` 定义并实际使用：

```css
:root {
  --color-ink: #132238;
  --color-navy: #17365d;
  --color-vermilion: #a63d32;
  --color-paper: #fbfaf7;
  --color-surface: #ffffff;
  --color-muted: #667085;
  --color-border: #d9dde5;
  --shadow-soft: 0 16px 40px rgba(19, 34, 56, 0.08);
  --radius-sm: 8px;
  --radius-md: 14px;
  --content-width: 1200px;
}
```

`global.css` 移除模板默认样式，设置暖白背景、正文高对比度、可见焦点和 `prefers-reduced-motion` 降级。

- [ ] **Step 4: 实现语义化应用外壳和路由**

`AppShell` 使用 `<header>`、`<nav>`、`<main>`、`<footer>`；桌面导航包含首页、术语探索、表达实验室、文化专题、研究工作台。移动端使用 Ant Design Drawer，所有交互元素有可访问名称。

`routes.tsx` 先注册：

```tsx
<Route element={<AppShell />}>
  <Route path="/" element={<HomePage />} />
  <Route path="/discover" element={<DiscoveryPage />} />
  <Route path="/terms/:id" element={<TermProfilePage />} />
</Route>
```

尚未交付的 `/lab`、`/topics`、`/workspace` 使用明确的阶段说明页，不链接回旧 CRUD 页面。

- [ ] **Step 5: 运行导航测试、构建和提交**

Run:

```powershell
npm test -- src/app/AppShell.test.tsx
npm run build
```

Expected: PASS。

```powershell
git add term-frontend/src/app term-frontend/src/styles term-frontend/src/App.tsx term-frontend/src/main.tsx
git commit -m "feat: introduce research platform application shell"
```

---

### Task 7: 重做首页

**Files:**
- Create: `term-frontend/src/features/home/HomePage.tsx`
- Create: `term-frontend/src/features/home/HomePage.test.tsx`
- Modify: `term-frontend/src/app/routes.tsx`

**Interfaces:**
- Consumes: Task 6 的 `AppShell` 和 Task 5 的 `listTerms`。
- Produces: 新首页，展示研究定位、统一搜索、三层体系、精选术语和核心入口。

- [ ] **Step 1: 写首页信息层级红灯测试**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import HomePage from './HomePage'
import * as api from '../../services/knowledgeApi'

vi.spyOn(api, 'listTerms').mockResolvedValue({
  data: [],
  meta: { page: 1, page_size: 6, total: 0 },
})

it('explains the research platform before presenting content', async () => {
  render(<MemoryRouter><HomePage /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: '让中国特色概念被准确理解与表达' })).toBeInTheDocument()
  expect(screen.getByRole('searchbox', { name: '搜索术语' })).toBeInTheDocument()
  expect(screen.getByText('核心层')).toBeInTheDocument()
  expect(screen.getByText('拓展层')).toBeInTheDocument()
  expect(screen.getByText('本源层')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认新首页缺失**

Run: `npm test -- src/features/home/HomePage.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 实现首页**

首页按以下顺序实现：

1. 项目名称、研究问题和搜索框。
2. 三层术语体系解释，不使用装饰性金字塔。
3. 跨文化表达实验室预告与入口。
4. 6 条精选术语；API 失败时显示重试按钮，不阻塞其他区块。
5. 淮河文化示范专题入口。
6. 数据成果摘要；当前没有真实指标 API 时只显示可以由现有响应证明的术语总数，不伪造语种或审核数量。

搜索提交跳转 `/discover?q=<encoded>`。

- [ ] **Step 4: 运行测试、构建和提交**

Run:

```powershell
npm test -- src/features/home/HomePage.test.tsx
npm run build
```

Expected: PASS。

```powershell
git add term-frontend/src/features/home term-frontend/src/app/routes.tsx
git commit -m "feat: redesign public research homepage"
```

---

### Task 8: 建设术语探索页

**Files:**
- Create: `term-frontend/src/features/discovery/DiscoveryPage.tsx`
- Create: `term-frontend/src/features/discovery/DiscoveryFilters.tsx`
- Create: `term-frontend/src/features/discovery/TermResultItem.tsx`
- Create: `term-frontend/src/features/discovery/DiscoveryPage.test.tsx`
- Modify: `term-frontend/src/app/routes.tsx`

**Interfaces:**
- Consumes: `listTerms(TermQuery)`。
- Produces: URL 驱动的搜索、筛选和分页；结果链接到 `/terms/:id`。

- [ ] **Step 1: 写 URL 搜索红灯测试**

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import DiscoveryPage from './DiscoveryPage'
import * as api from '../../services/knowledgeApi'

const listTerms = vi.spyOn(api, 'listTerms').mockResolvedValue({
  data: [{
    id: 1,
    preferred_name_zh: '和而不同',
    definition_zh: '承认差异并追求和谐共处',
    term_level: '本源层',
    culture_category: '中华优秀传统文化',
    data_quality: 'legacy_unreviewed',
    recommended_translation: null,
    language_count: 1,
    source_count: 2,
  }],
  meta: { page: 1, page_size: 20, total: 1 },
})

it('loads filters from the URL and renders semantic result links', async () => {
  render(<MemoryRouter initialEntries={['/discover?q=和而&level=本源层']}><DiscoveryPage /></MemoryRouter>)
  await waitFor(() => expect(listTerms).toHaveBeenCalledWith(expect.objectContaining({ q: '和而', level: '本源层' })))
  expect(screen.getByRole('link', { name: /和而不同/ })).toHaveAttribute('href', '/terms/1')
  expect(screen.getByText('2 个来源')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认页面缺失**

Run: `npm test -- src/features/discovery/DiscoveryPage.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 实现筛选和结果组件**

- 所有筛选条件写入 URLSearchParams，刷新和分享链接后状态不丢失。
- 搜索、筛选和分页均调用 `listTerms`，请求期间保留已有结果并显示局部加载状态。
- 空结果显示调整关键词和筛选条件的建议。
- 请求失败显示错误说明和重试按钮。
- `TermResultItem` 展示名称、定义、推荐译法、层级、语种数和来源数，不提供编辑或删除按钮。`legacy_unreviewed` 内容显示“历史数据待复核”，不得显示“权威审定”。

- [ ] **Step 4: 运行测试、构建和提交**

Run:

```powershell
npm test -- src/features/discovery/DiscoveryPage.test.tsx
npm run build
```

Expected: PASS。

```powershell
git add term-frontend/src/features/discovery term-frontend/src/app/routes.tsx
git commit -m "feat: add URL-driven terminology discovery"
```

---

### Task 9: 建设术语知识档案页

**Files:**
- Create: `term-frontend/src/features/term-profile/TermProfilePage.tsx`
- Create: `term-frontend/src/features/term-profile/TranslationPanel.tsx`
- Create: `term-frontend/src/features/term-profile/EvidencePanel.tsx`
- Create: `term-frontend/src/features/term-profile/TermProfilePage.test.tsx`
- Modify: `term-frontend/src/app/routes.tsx`

**Interfaces:**
- Consumes: `getTerm(id)` 与 `TermProfile`。
- Produces: 可分享的完整术语知识页面。

- [ ] **Step 1: 写知识档案红灯测试**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import TermProfilePage from './TermProfilePage'
import * as api from '../../services/knowledgeApi'

vi.spyOn(api, 'getTerm').mockResolvedValue({
  id: 1,
  preferred_name_zh: '和而不同',
  definition_zh: '承认差异并追求和谐共处',
  cultural_connotation: '强调差异基础上的协调共生',
  term_level: '本源层',
  culture_category: '中华优秀传统文化',
  data_quality: 'curated',
  recommended_translation: null,
  language_count: 1,
  source_count: 1,
  names: [],
  translations: [{ language_code: 'en', language_name_zh: '英语', text: 'harmony in diversity', translation_type: 'recommended', authority_level: 'official', review_status: 'reviewed' }],
  sources: [{ id: 1, title: '论语', organization: '', citation: '子路篇', url: '' }],
  contexts: [],
  cultural_notes: [],
  relations: [],
  topics: [],
})

it('shows translation and evidence as first-class knowledge', async () => {
  render(<MemoryRouter initialEntries={['/terms/1']}><Routes><Route path="/terms/:id" element={<TermProfilePage />} /></Routes></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: '和而不同' })).toBeInTheDocument()
  expect(screen.getByText('harmony in diversity')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '来源与依据' })).toBeInTheDocument()
  expect(screen.getByText('论语')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认页面缺失**

Run: `npm test -- src/features/term-profile/TermProfilePage.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 实现档案页组件**

页面顺序：

1. 术语名称、定义、层级和类别。
   `legacy_unreviewed` 内容在标题区显示“历史数据待复核”。
2. 推荐译法与其他译法对照；未审核译法显示状态，不使用“官方”标签。
3. 文化内涵。
4. 适用场景。
5. 跨文化理解提示。
6. 来源与证据；外链使用安全属性。
7. 相关概念与专题。

缺少某类数据时省略对应区块，不显示大量“暂无”。404 显示返回术语探索的入口；网络失败显示重试。

- [ ] **Step 4: 运行测试、构建和提交**

Run:

```powershell
npm test -- src/features/term-profile/TermProfilePage.test.tsx
npm run build
```

Expected: PASS。

```powershell
git add term-frontend/src/features/term-profile term-frontend/src/app/routes.tsx
git commit -m "feat: add terminology knowledge profiles"
```

---

### Task 10: 切换运行入口并保留必要兼容接口

**Files:**
- Create: `term-backend/termbase_app/routes/legacy.py`
- Create: `term-backend/termbase_app/routes/ai.py`
- Modify: `term-backend/app.py`
- Modify: `term-backend/termbase_app/__init__.py`
- Modify: `term-backend/tests/test_chat_stream.py`
- Create: `term-backend/tests/test_legacy_compat.py`

**Interfaces:**
- Consumes: 新应用工厂、旧只读 API 契约和现有 DeepSeek 客户端。
- Produces: `python app.py` 启动新应用；旧前端所需只读接口和 `/api/chat/stream` 暂时兼容。

- [ ] **Step 1: 写兼容红灯测试**

```python
# tests/test_legacy_compat.py
import unittest
from termbase_app import create_app


class LegacyCompatibilityTests(unittest.TestCase):
    def test_new_app_registers_required_transition_routes(self):
        app = create_app({
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite+pysqlite:///:memory:",
        })
        rules = {rule.rule for rule in app.url_map.iter_rules()}
        self.assertTrue({
            "/api/term-list",
            "/api/search",
            "/api/huaihe/terms",
            "/api/huaihe/figures",
            "/api/huaihe/herbs",
            "/api/chat/stream",
        }.issubset(rules))
```

- [ ] **Step 2: 运行测试确认新工厂未注册兼容路由**

Run: `.\venv\Scripts\python.exe -m unittest tests.test_legacy_compat -v`

Expected: FAIL。

- [ ] **Step 3: 抽取兼容蓝图**

将旧只读路由迁入 `legacy.py`，保持响应结构不变。不要迁移无鉴权的 POST、PUT、DELETE 与全量导入接口；旧首页已由新公共页面替代，不再暴露匿名写能力。

将 DeepSeek 初始化和流式路由迁入 `ai.py`，保留：

```text
POST /api/chat/stream
data: {"content":"..."}
data: [DONE]
```

服务错误继续返回通用提示，不暴露上游异常详情。

- [ ] **Step 4: 将 `app.py` 缩减为兼容启动入口**

```python
import os
from termbase_app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.environ.get("FLASK_HOST", "127.0.0.1"),
        port=int(os.environ.get("FLASK_PORT", "5000")),
        debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true",
    )
```

- [ ] **Step 5: 调整聊天测试导入新应用工厂**

测试继续通过依赖注入替换外部 DeepSeek 客户端，断言 SSE 内容和错误隐藏；不得发起真实网络请求。

- [ ] **Step 6: 运行全部后端和前端验证**

Run:

```powershell
cd D:\Termbase\term-backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
.\venv\Scripts\python.exe -m py_compile app.py models.py scripts\migrate_legacy_knowledge.py
cd D:\Termbase\term-frontend
npm test
npm run build
npm run lint
```

Expected: 测试、语法检查和构建 PASS；不得新增 ESLint 错误。

- [ ] **Step 7: 提交**

```powershell
git add term-backend/app.py term-backend/termbase_app term-backend/tests
git commit -m "refactor: switch runtime to modular application"
```

---

### Task 11: 迁移演练、文档和最终验收

**Files:**
- Modify: `README.md`
- Modify: `API.md`
- Create: `docs/migration-guide.md`
- Create: `docs/knowledge-model.md`

**Interfaces:**
- Consumes: Tasks 1-10 的可运行系统。
- Produces: 可重复的部署与迁移说明、验收证据和下一子项目的稳定基线。

- [ ] **Step 1: 备份并记录旧表数量**

在目标 MySQL 环境执行只读计数并将结果保存到本地验收记录，不提交包含连接信息的文件：

```sql
SELECT COUNT(*) FROM terms;
SELECT COUNT(*) FROM huaihe_terms;
SELECT COUNT(*) FROM huaihe_figures;
SELECT COUNT(*) FROM huaihe_herbs;
```

使用数据库工具创建带时间戳的备份。未确认备份成功前不得执行迁移。

- [ ] **Step 2: 执行迁移和两次导入**

Run:

```powershell
cd D:\Termbase\term-backend
$env:FLASK_APP='termbase_app:create_app'
.\venv\Scripts\flask.exe db upgrade
.\venv\Scripts\python.exe scripts\migrate_legacy_knowledge.py
.\venv\Scripts\python.exe scripts\migrate_legacy_knowledge.py
```

Expected: 第二次导入 `terms_created=0`，所有旧表仍存在。

- [ ] **Step 3: 核对迁移结果**

核对：

- `kb_terms` 数量等于可识别的 `terms + huaihe_terms` 唯一记录数。
- `kb_topic_items` 完整覆盖淮河人物和中药材旧记录。
- 所有非空英文译法都有 `en` 翻译记录。
- 所有非空旧来源都有 Source 关联。
- 随机抽取至少 20 条术语，人工比较名称、层级、类别、译法、文化内涵和来源。

任何差异都必须修正导入器并重新从空 `kb_` 表演练，不手工修补单条迁移结果。

- [ ] **Step 4: 更新文档**

`README.md` 写清：

- 新旧架构关系。
- 安装、迁移、启动和测试命令。
- 新公共路由。
- DeepSeek 配置变量名但不包含真实值。

`API.md` 记录 v1 列表和详情的完整请求与响应示例。

`docs/migration-guide.md` 记录备份、升级、导入、验证和回滚步骤。

`docs/knowledge-model.md` 解释概念、译法、来源、证据、场景和专题的关系。

- [ ] **Step 5: 运行最终验证**

Run:

```powershell
cd D:\Termbase\term-backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
cd D:\Termbase\term-frontend
npm test
npm run build
npm run lint
cd D:\Termbase
git diff --check
git grep -En "sk-[A-Za-z0-9]{20,}" -- .
```

Expected: 所有测试与构建 PASS；无新增 lint 错误；`git diff --check` 通过；密钥扫描无结果。

- [ ] **Step 6: 浏览器验收**

手工验证：

1. 首页在桌面和 390px 宽度下无横向溢出。
2. 首页搜索进入带 URL 参数的探索页。
3. 筛选、翻页和刷新保持状态。
4. 术语详情可显示多译法与来源。
5. API 失败显示重试而非空白页。
6. 键盘可访问主导航、搜索、筛选、分页和详情链接。
7. `/api/chat/stream` 仍能完成真实最小连接检查。

- [ ] **Step 7: 提交文档和验收修正**

```powershell
git add README.md API.md docs/migration-guide.md docs/knowledge-model.md
git commit -m "docs: document knowledge core migration and APIs"
```

---

## 完成定义

本计划完成时应得到一个可独立演示的产品增量：旧数据安全保留并迁入规范化知识模型；公共用户能通过成熟的新界面搜索术语并查看译法、来源和文化信息；后端具备模块化结构、迁移工具和自动化测试；现有 DeepSeek 能力未回退。跨文化表达实验室、研究工作台和成果驾驶舱分别进入后续计划，不在本计划中用空壳逻辑冒充完成。

## 规格覆盖核对

本计划覆盖设计规格中的项目定位、概念与来源优先原则、公共首页、术语探索、术语知识档案、核心知识实体、模块化前后端、v1 公共 API、视觉方向、公共读取错误降级、非破坏性数据迁移、前后端测试和第一阶段数据安全要求。

以下内容是有意拆分而非遗漏：

- 跨文化表达实验室与 AI 结构化输出进入 `expression-lab` 计划。
- 用户、服务端会话、CSRF、编辑和审核状态流转进入 `research-workspace` 计划。
- 专题编辑、概念关系交互和成果统计进入 `topics-and-insights` 计划。
- 小语种扩充、理解度实验、部署监控和研究报告进入成果验证阶段。
