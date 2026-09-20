# 中国特色话语多语术语库

面向中华文化术语的知识管理平台，提供可追溯术语检索、分类筛选、多语翻译、来源证据、AI 智能问答、跨文化表达实验室和人工评审案例工作台。

当前系统同时保留旧版管理/淮河兼容路由，并以 `kb_` 规范化知识核心承载新的公共只读体验。迁移只读旧表，不删除或改写旧数据；旧路由用于兼容，公共用户界面和 `/api/v1` 使用新模型。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Ant Design 6 |
| 后端 | Flask + SQLAlchemy ORM + pandas |
| 数据库 | MySQL |
| AI | DeepSeek API 流式对话 |
| 国际化 | i18next（中文 / English） |

## 项目结构

```
Termbase/
├── term-backend/
│   ├── app.py              # Flask 主应用
│   ├── termbase_app/       # Flask 应用、知识模型、服务和路由
│   ├── requirements.txt    # Python 依赖
│   ├── data/               # Excel 数据文件
│   │   ├── terms.xlsx
│   │   ├── huaihe_terms.xlsx
│   │   └── huaihe_figures.xlsx
│   ├── scripts/            # 数据导入和知识迁移脚本
│   │   ├── import_terms.py
│   │   ├── import_huaihe_terms.py
│   │   ├── import_figures.py
│   │   └── import_child_explain.py
│   └── .env                # 环境变量（不入 Git）
├── term-frontend/
│   └── src/
│       ├── api/            # API 请求层（axios）
│       ├── components/     # ChatAI / FloatingTools / ErrorBoundary / ThoughtMap
│       ├── context/        # React Context（儿童模式）
│       ├── locales/        # 中英文国际化
│       ├── pages/          # HomePage / HuaihePage / UserGuidePage / AboutPage
│       ├── types/          # TypeScript 类型定义
│       └── utils/          # axios 实例配置
├── .gitignore
├── .env.example
├── API.md                  # 接口文档
└── README.md
```

## 快速启动

### 环境要求

- Node.js 18+
- Python 3.9+
- MySQL 5.7+

### 1. 数据库

```sql
CREATE DATABASE IF NOT EXISTS term_database
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 2. 后端

```bash
cd term-backend

# 创建虚拟环境并安装依赖
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入数据库密码和 DeepSeek API Key

# 创建/升级规范化知识表（迁移前先完成备份，详见 docs/migration-guide.md）
$env:FLASK_APP='termbase_app:create_app'
venv\Scripts\flask.exe db upgrade

# 启动
venv\Scripts\python.exe app.py # 默认 http://127.0.0.1:5000
```

### 3. 前端

```bash
cd term-frontend
npm install
npm run dev                    # 默认 http://localhost:5173
```

前端已配置 Vite 代理，`/api/*` 请求自动转发至后端。浏览器打开 `http://localhost:5173` 即可使用。

### 4. 迁移旧数据

```powershell
cd term-backend
venv\Scripts\python.exe scripts\migrate_legacy_knowledge.py
```

脚本可重复执行；第二次执行不会重复创建术语、译法、来源或专题条目。完整备份、核对和回滚流程见 [docs/migration-guide.md](docs/migration-guide.md)。

### 5. 导入旧版 Excel 数据（兼容维护流程）

```bash
cd term-backend
venv\Scripts\python scripts\import_terms.py
venv\Scripts\python scripts\import_huaihe_terms.py
venv\Scripts\python scripts\import_figures.py
venv\Scripts\python scripts\import_child_explain.py
```

导入为全量替换。修改 Excel 文件后重新执行脚本即可更新数据库。

## 公共路由

- `GET /api/v1/terms`：分页搜索和筛选已发布术语。
- `GET /api/v1/terms/{id}`：术语详情，含多译法、来源、证据、场景和文化提示。
- `POST /api/chat/stream`：DeepSeek SSE 对话。
- `POST /api/v1/expression-lab/analyze`：基于1—5个已发布术语生成英语跨文化表达研究报告。
- `/api/v1/review-cases`：保存表达报告、追加人工修订、执行审核流转并导出研究案例。
- `/api/term-list`、`/api/search`、`/api/filter`、`/api/huaihe/*`：旧版兼容读取路由；旧版写入/Excel 导入端点已移除。

请求参数和完整 JSON 示例见 [API.md](API.md)。

## 功能特性

全站采用“新中式学术编辑部 + 数字人文”视觉体系，以墨青、朱砂和宣纸色统一首页、术语档案、表达实验室与人工评审工作台，并覆盖移动端、儿童模式和大字模式。

- 🔍 术语名称模糊搜索，多条件组合筛选（文化分类 / 场景分类 / 术语层级）
- 📖 术语详情弹窗，含中英文官方译法、文化内涵、来源
- 🤖 AI 智能助手（右下角悬浮按钮），DeepSeek 大模型流式对话
- 🧭 跨文化表达实验室：组合术语知识、受众、场景与风格，输出首选/备选表达、文化风险和可追溯引用
- 📝 人工评审工作台：固化 AI 原始快照，沉淀人工定稿、问题标签、版本历史和审核状态
- 🌾 淮河文化专区，垂落式名人图谱
- 👶 儿童模式（一键切换儿童友好解释）
- 🌐 中英文国际化界面切换
- 🧒 儿童模式：优先展示通俗儿童解释，并切换为更友好的阅读界面
- 🔠 大字模式：全站增大正文、表单与点击区域，可与儿童模式同时使用并自动记忆
- 🔒 旧版写入/Excel 导入端点已移除，避免匿名修改遗留数据

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_USER` | MySQL 用户名 | root |
| `DB_PASSWORD` | MySQL 密码 | — |
| `DB_HOST` | MySQL 主机 | localhost |
| `DB_NAME` | 数据库名 | term_database |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | — |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | https://api.deepseek.com |
| `DEEPSEEK_MODEL` | DeepSeek 模型名称 | deepseek-flash |
| `EXPRESSION_LAB_RATE_LIMIT` | 表达分析单 IP 限流 | 5 per minute |
| `EXPRESSION_LAB_MAX_KNOWLEDGE_CHARS` | 知识包字符上限 | 18000 |
| `EXPRESSION_LAB_PROVIDER_TIMEOUT` | AI 请求超时（秒） | 45 |
| `EXPRESSION_LAB_MAX_BODY_BYTES` | 分析请求体上限 | 16384 |
| `REVIEW_WORKSPACE_MAX_BODY_BYTES` | 评审案例写请求体上限 | 131072 |
| `RATELIMIT_STORAGE_URI` | 限流存储；多实例须换共享存储 | memory:// |
| `FLASK_HOST` | Flask 监听地址 | 127.0.0.1 |
| `FLASK_PORT` | Flask 端口 | 5000 |
| `FLASK_DEBUG` | 调试模式 | true |

## 接口文档

详见 [API.md](API.md)；表达实验室使用与复核规则见 [docs/expression-lab-guide.md](docs/expression-lab-guide.md)；人工评审流程见 [docs/review-workspace-guide.md](docs/review-workspace-guide.md)；知识实体关系见 [docs/knowledge-model.md](docs/knowledge-model.md)。

## 许可证

MIT
