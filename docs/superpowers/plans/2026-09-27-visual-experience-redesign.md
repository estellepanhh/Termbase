# 视觉体验与术语管理重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付文化图谱、完整阅读主题、全局 AI 助手和可用术语 CRUD 管理台。

**Architecture:** 在现有 React 功能模块中新增图谱和管理模块，不引入大型可视化依赖；后端管理 API 与公开 API 分离。全局阅读模式由应用壳 data 属性驱动，页面局部样式补齐固定字号覆盖。

**Tech Stack:** React 19, TypeScript, CSS, Vitest, Flask, SQLAlchemy, pytest

**Spec:** `docs/superpowers/specs/2026-09-27-visual-experience-redesign.md`

## Global Constraints

- 不把 API 密钥写入前端、测试、文档或 Git。
- 动效必须支持 `prefers-reduced-motion`。
- 公共 API 仍只返回 published 术语。
- 公网部署前管理 API 需要接入认证，当前仅为项目演示端。

## Review Focus

- 图谱在空专题、未知条目类型和移动端仍可读。
- 儿童与大字模式组合开启时不溢出。
- AI 流式响应为空或失败时能恢复输入状态。
- 删除有关联数据的术语必须安全失败。
- 管理表单对空名称、非法状态和不存在的术语返回明确错误。

### Task 1: 阅读模式与项目页修复

**Files:** `src/features/about/*`, `src/app/AppShell.tsx`, `src/styles/app.css`

- [ ] 运行已有失败测试确认四项回归。
- [ ] 实现儿童文案、严格模式单次请求、移动端语言按钮和大字覆盖。
- [ ] 运行聚焦测试并提交。

### Task 2: 淮河文化交互图谱与视觉层次

**Files:** `src/features/topics/CulturalKnowledgeMap.tsx`, `src/features/topics/TopicDetailPage.tsx`, `src/features/topics/topics.css`, topic tests

- [ ] 先写图谱节点、链接、儿童提示与空状态测试并观察失败。
- [ ] 实现无依赖 SVG/CSS 图谱和节点定位。
- [ ] 重构专题首屏、概览和内容卡片视觉，补齐响应式与减弱动效。
- [ ] 运行专题测试并提交。

### Task 3: 全局阅读主题和 AI 助手

**Files:** `src/components/ChatAI.tsx`, `src/app/AppShell.tsx`, `src/styles/app.css`, component tests

- [ ] 写 AI 入口可访问性与面板开启测试并观察失败。
- [ ] 将 AI 助手接入应用壳，重构为 class 驱动样式。
- [ ] 扩展儿童主题与大字模式的全局覆盖。
- [ ] 运行组件测试并提交。

### Task 4: 术语管理 CRUD

**Files:** backend admin route/service tests, frontend `features/term-management/*`, API/types/routes/shell tests

- [ ] 写后端 CRUD 成功、校验、404 和关联删除冲突测试并观察失败。
- [ ] 实现管理 API。
- [ ] 写管理页列表、创建、编辑、删除交互测试并观察失败。
- [ ] 实现管理客户端与页面，加入 `/manage` 导航。
- [ ] 运行前后端聚焦测试并提交。

### Task 5: 全量验证与集成

- [ ] 运行 pytest、Vitest、build、lint 和 secret scan。
- [ ] 以桌面及移动视口检查关键页面。
- [ ] 合并功能分支到主分支并再次验证。
