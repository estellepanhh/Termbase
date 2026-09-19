# Task 9 — 术语知识档案页报告

## 交付内容

- 新增 `/terms/:id` 术语知识档案页，调用既有 `getTerm(id)` 与 `TermProfile` 合同。
- 将译法、适用场景、跨文化提示、来源与证据、相关概念及专题按资料存在情况展示；缺少可选数据时不输出空区块。
- 在标题区显示 `legacy_unreviewed` 的“历史数据待复核”提示；未审核译法仅显示审核状态，不使用“官方”标签。
- 提供加载、网络失败重试、404/无效 ID 返回术语探索入口，并为外部来源链接添加 `target="_blank"`、`rel="noreferrer noopener"`。
- 添加响应式、语义化页面样式与 4 个页面行为测试。

## TDD 记录

- 红灯：`npm test -- src/features/term-profile/TermProfilePage.test.tsx` 在页面模块不存在时失败。
- 绿灯：实现后同一套件通过（4 tests）。

## 验证

- `npm test`：5 个测试文件、32 个测试通过。
- `npm run build`：通过。
- `npm run lint`：退出码 0；本功能无 lint error。现有 `src/pages/HomePage.tsx` 与 `src/pages/HuaihePage.tsx` 仍各有两条无关的 hooks 警告。
- `git diff --check`：通过。

## 自检

- 路由已从占位页改为真实的 `TermProfilePage`。
- 页面仅依赖 Task 5 提供的 `TermProfile` 字段，并避免对缺失可选内容输出“暂无”。
- 证据外链仅接受 HTTP(S) URL，且具备安全的新窗口属性。
- 未修改或纳入已有的 `term-frontend/.npm-task5-cache/` 未跟踪目录。
