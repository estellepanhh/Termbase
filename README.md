# 中国特色话语多语术语库

面向中华文化术语的知识管理平台，提供术语检索、分类筛选、多语翻译、AI 智能问答等功能。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Ant Design 6 |
| 后端 | Flask + SQLAlchemy ORM + pandas |
| 数据库 | MySQL |
| AI | 火山方舟 Ark API（豆包大模型）流式对话 |
| 国际化 | i18next（中文 / English） |

## 项目结构

```
Termbase/
├── term-backend/
│   ├── app.py              # Flask 主应用
│   ├── models.py           # SQLAlchemy ORM 模型（Term / HuaiheTerm / HuaiheFigure）
│   ├── requirements.txt    # Python 依赖
│   ├── data/               # Excel 数据文件
│   │   ├── terms.xlsx
│   │   ├── huaihe_terms.xlsx
│   │   └── huaihe_figures.xlsx
│   ├── scripts/            # 数据导入脚本
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
# 编辑 .env，填入数据库密码和豆包 API Key

# 启动
python app.py                  # 默认 http://127.0.0.1:5000
```

### 3. 前端

```bash
cd term-frontend
npm install
npm run dev                    # 默认 http://localhost:5173
```

前端已配置 Vite 代理，`/api/*` 请求自动转发至后端。浏览器打开 `http://localhost:5173` 即可使用。

### 4. 导入数据

```bash
cd term-backend
venv\Scripts\python scripts\import_terms.py
venv\Scripts\python scripts\import_huaihe_terms.py
venv\Scripts\python scripts\import_figures.py
venv\Scripts\python scripts\import_child_explain.py
```

导入为全量替换。修改 Excel 文件后重新执行脚本即可更新数据库。

## 功能特性

- 🔍 术语名称模糊搜索，多条件组合筛选（文化分类 / 场景分类 / 术语层级）
- 📖 术语详情弹窗，含中英文官方译法、文化内涵、来源
- 🤖 AI 智能助手（右下角悬浮按钮），豆包大模型流式对话
- 🌾 淮河文化专区，垂落式名人图谱
- 👶 儿童模式（一键切换儿童友好解释）
- 🌐 中英文国际化界面切换
- ✏️ 术语增删改（管理员功能）

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_USER` | MySQL 用户名 | root |
| `DB_PASSWORD` | MySQL 密码 | — |
| `DB_HOST` | MySQL 主机 | localhost |
| `DB_NAME` | 数据库名 | term_database |
| `DOUBAO_API_KEY` | 豆包 API Key | — |
| `DOUBAO_ENDPOINT_ID` | 豆包 Endpoint ID | — |
| `FLASK_HOST` | Flask 监听地址 | 127.0.0.1 |
| `FLASK_PORT` | Flask 端口 | 5000 |
| `FLASK_DEBUG` | 调试模式 | true |

## 接口文档

详见 [API.md](API.md)。

## 许可证

MIT
