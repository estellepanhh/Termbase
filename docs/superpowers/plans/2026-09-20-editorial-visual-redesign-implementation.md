# 新中式数字人文视觉重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变现有业务流程和 API 的前提下，把全站重构为统一、移动友好、适合国家级大创展示的新中式数字人文研究平台。

**Architecture:** 先建立 CSS token 与少量无业务状态的编辑式基础组件，再按页面逐个替换视觉结构。业务组件继续持有数据和交互状态，展示组件只负责稳定的信息层级与响应式布局；儿童/大字模式通过根节点 data 属性叠加，不复制页面。

**Tech Stack:** React 19、TypeScript 6、React Router、Ant Design 6、CSS custom properties、Vitest、Testing Library、Vite。

**Spec:** `docs/superpowers/specs/2026-09-20-editorial-visual-redesign.md`

## Global Constraints

- 不改变现有 API 契约、数据库模型、表达生成流程和评审状态机。
- 不增加第二套 UI 框架或大面积图片素材依赖。
- 320px 起不得出现非必要横向滚动。
- 可操作控件触控区域不小于 44×44px。
- 正文、按钮与状态标签满足 WCAG AA 对比度。
- 儿童模式不伪造解释；缺失儿童解释时回退普通释义。
- 大字模式采用独立字号与间距规则，禁止整体 `zoom` 或 `transform: scale()`。
- 现有 77 个后端测试和 68 个前端测试必须保持通过。
- 每个页面只保留一个 `h1`，焦点状态不能被移除。
- 中英文内容切换不能破坏页头宽度与移动布局。

---

### Task 1: 建立编辑式设计系统与全局框架

**Files:**
- Create: `term-frontend/src/components/editorial/PageIntro.tsx`
- Create: `term-frontend/src/components/editorial/SectionHeading.tsx`
- Create: `term-frontend/src/components/editorial/StatusBadge.tsx`
- Create: `term-frontend/src/components/editorial/editorial.css`
- Create: `term-frontend/src/components/editorial/EditorialComponents.test.tsx`
- Create: `term-frontend/src/components/ReadingPreferencesMenu.tsx`
- Create: `term-frontend/src/components/ReadingPreferencesMenu.test.tsx`
- Modify: `term-frontend/src/styles/tokens.css`
- Modify: `term-frontend/src/styles/global.css`
- Modify: `term-frontend/src/styles/app.css`
- Modify: `term-frontend/src/app/AppShell.tsx`
- Modify: `term-frontend/src/app/AppShell.test.tsx`
- Modify: `term-frontend/src/components/ReadingPreferenceControls.tsx`

**Interfaces:**
- Consumes: `useChildMode()` 的 `isChildMode`、`isLargeTextMode` 和切换函数；现有 `AppShell` 导航数据。
- Produces: `PageIntroProps`、`SectionHeadingProps`、`StatusBadgeProps`，以及桌面/移动共用的 `ReadingPreferencesMenu`。

- [ ] **Step 1: 写基础组件失败测试**

在 `EditorialComponents.test.tsx` 验证语义层级和可组合接口：

```tsx
render(<PageIntro eyebrow="RESEARCH PLATFORM" title="术语探索" description="查找术语" actions={<button>导出</button>} />)
expect(screen.getByRole('heading', { level: 1, name: '术语探索' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '导出' })).toBeInTheDocument()

render(<SectionHeading index="02" title="文化内涵" description="理解概念" />)
expect(screen.getByRole('heading', { level: 2, name: '文化内涵' })).toBeInTheDocument()

render(<StatusBadge tone="warning">待复核</StatusBadge>)
expect(screen.getByText('待复核')).toHaveClass('status-badge--warning')
```

- [ ] **Step 2: 写页头与移动阅读设置失败测试**

在 `AppShell.test.tsx` 增加：桌面导航当前项、860px 语义菜单入口、阅读设置按钮 `aria-expanded`、抽屉内儿童/大字开关。`ReadingPreferencesMenu.test.tsx` 验证切换后 `aria-pressed` 和持久化值。

```tsx
await user.click(screen.getByRole('button', { name: '打开阅读设置' }))
const panel = screen.getByRole('dialog', { name: '阅读设置' })
await user.click(within(panel).getByRole('button', { name: '开启大字模式' }))
expect(document.querySelector('.app-shell')).toHaveAttribute('data-large-text', 'true')
```

- [ ] **Step 3: 运行测试并确认红灯**

Run:

```powershell
cd term-frontend
npm test -- --run src/components/editorial/EditorialComponents.test.tsx src/components/ReadingPreferencesMenu.test.tsx src/app/AppShell.test.tsx
```

Expected: 新组件导入失败，页头不存在“打开阅读设置”。

- [ ] **Step 4: 实现 token 和基础组件**

在 `tokens.css` 定义并替换现有颜色变量：

```css
:root {
  --ink-950: #18201e;
  --ink-700: #3e4a46;
  --indigo-800: #173b46;
  --indigo-700: #245361;
  --vermilion-600: #a74736;
  --paper-50: #f8f5ed;
  --paper-100: #f1ecdf;
  --paper-200: #dfd7c8;
  --jade-600: #397461;
  --reading-width: 760px;
  --content-width: 1240px;
  --workspace-width: 1480px;
}
```

`PageIntro` 仅输出一个 `h1`；`SectionHeading` 输出 `h2`；`StatusBadge` 的 tone 限定为 `neutral | info | success | warning | danger`。

- [ ] **Step 5: 重构全局页头与阅读设置**

桌面端保留品牌、导航、语言和一个“阅读设置”入口；移动端阅读设置和语言控制放入菜单抽屉。`ReadingPreferenceControls` 作为菜单内部的无弹层按钮组继续复用，避免重复状态。

- [ ] **Step 6: 实现大字与儿童全局规则**

在 `app.css` 使用显式字号规则：

```css
.app-shell[data-large-text] { --body-size: 1.1875rem; --control-min-height: 3rem; }
.app-shell[data-large-text] .app-main p,
.app-shell[data-large-text] .app-main li { font-size: var(--body-size); line-height: 1.8; }
.app-shell[data-large-text] :where(button, input, select) { min-height: var(--control-min-height); }
```

禁止使用全局 `!important`、`zoom` 或缩放变换。

- [ ] **Step 7: 运行测试、构建并提交**

```powershell
npm test -- --run src/components/editorial/EditorialComponents.test.tsx src/components/ReadingPreferencesMenu.test.tsx src/app/AppShell.test.tsx
npm run lint
npm run build
git add src/components/editorial src/components/ReadingPreferencesMenu.tsx src/components/ReadingPreferencesMenu.test.tsx src/components/ReadingPreferenceControls.tsx src/styles src/app
git commit -m "feat: establish editorial design system"
```

---

### Task 2: 重构首页为研究平台入口

**Files:**
- Create: `term-frontend/src/features/home/ResearchFlow.tsx`
- Create: `term-frontend/src/features/home/ResearchFlow.test.tsx`
- Modify: `term-frontend/src/features/home/HomePage.tsx`
- Modify: `term-frontend/src/features/home/HomePage.test.tsx`
- Modify: `term-frontend/src/features/home/home.css`

**Interfaces:**
- Consumes: Task 1 的 `PageIntro`、`SectionHeading`；现有首页术语查询结果与推荐术语数据。
- Produces: `ResearchFlow`，固定四阶段 `terminology → evidence → expression → review`，不持有路由或请求状态。

- [ ] **Step 1: 写首页结构失败测试**

验证页面顺序、唯一主标题、检索入口和研究流程：

```tsx
expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
expect(screen.getByRole('searchbox', { name: '搜索中国特色话语术语' })).toBeInTheDocument()
expect(screen.getByRole('region', { name: '术语生产与评审流程' })).toHaveTextContent('术语知识')
expect(screen.getByRole('region', { name: '术语生产与评审流程' })).toHaveTextContent('人工评审')
```

- [ ] **Step 2: 运行首页测试确认红灯**

Run: `npm test -- --run src/features/home/HomePage.test.tsx src/features/home/ResearchFlow.test.tsx`

Expected: 缺少 `ResearchFlow` 和新的搜索框名称。

- [ ] **Step 3: 实现非对称首页首屏**

保留现有搜索行为，将首屏拆为 `home-hero__editorial` 与 `home-hero__search-panel`。项目概览仅使用现有可证明的内容，不虚构术语数量或合作单位。

- [ ] **Step 4: 实现研究流程与术语层级**

`ResearchFlow` 使用有序列表和四个明确链接：术语检索、术语详情说明、表达实验室、研究工作台。三层术语体系改为编号纵向列表，不改变现有文案含义。

- [ ] **Step 5: 实现响应式样式**

桌面首屏两栏比例 `minmax(0, 1.15fr) minmax(320px, .85fr)`；`760px` 以下变单栏；推荐术语网格在 `980px/640px` 分别变两栏/单栏。

- [ ] **Step 6: 回归并提交**

```powershell
npm test -- --run src/features/home/HomePage.test.tsx src/features/home/ResearchFlow.test.tsx
npm run build
git add src/features/home
git commit -m "feat: redesign research platform home"
```

---

### Task 3: 重构术语检索与移动筛选

**Files:**
- Create: `term-frontend/src/features/discovery/MobileFilterPanel.tsx`
- Create: `term-frontend/src/features/discovery/MobileFilterPanel.test.tsx`
- Modify: `term-frontend/src/features/discovery/DiscoveryPage.tsx`
- Modify: `term-frontend/src/features/discovery/DiscoveryPage.test.tsx`
- Modify: `term-frontend/src/features/discovery/DiscoveryFilters.tsx`
- Modify: `term-frontend/src/features/discovery/TermResultItem.tsx`
- Modify: `term-frontend/src/features/discovery/discovery.css`

**Interfaces:**
- Consumes: Task 1 的 `PageIntro`、`StatusBadge`；现有 URL 查询参数 `q/level/culture/language/page`。
- Produces: `MobileFilterPanel({ activeCount, children })`；筛选值仍由 `DiscoveryPage` 和 URL 管理。

- [ ] **Step 1: 写移动筛选和结果条目失败测试**

```tsx
await user.click(screen.getByRole('button', { name: '筛选条件，已选 2 项' }))
expect(screen.getByRole('region', { name: '术语筛选条件' })).toBeVisible()
expect(screen.getByRole('link', { name: '和而不同' })).toHaveAttribute('href', '/terms/1')
expect(screen.getByText('harmony in diversity')).toBeInTheDocument()
```

同时保留并运行 URL 前进后退、陈旧请求忽略、分页边界和儿童解释测试。

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm test -- --run src/features/discovery/DiscoveryPage.test.tsx src/features/discovery/MobileFilterPanel.test.tsx`

Expected: `MobileFilterPanel` 不存在。

- [ ] **Step 3: 实现编辑式结果列表**

每个条目使用 CSS grid 分成编号/正文/数据三块；DOM 顺序保持标题→释义→推荐译法→来源统计。`legacy_unreviewed` 使用 `StatusBadge tone="warning"`，不改变文字。

- [ ] **Step 4: 实现移动筛选面板**

面板只控制展示，不复制筛选状态。按钮展示非空筛选项数量，展开后焦点移动至第一个控件，Escape 关闭并返回触发按钮。

- [ ] **Step 5: 实现桌面与移动 CSS**

`> 720px` 显示横向筛选工具栏并隐藏移动触发按钮；`<= 720px` 反向处理。结果条目在 `<= 600px` 变单列，数据统计允许换行。

- [ ] **Step 6: 回归并提交**

```powershell
npm test -- --run src/features/discovery/DiscoveryPage.test.tsx src/features/discovery/MobileFilterPanel.test.tsx
npm run build
git add src/features/discovery
git commit -m "feat: redesign terminology discovery"
```

---

### Task 4: 重构术语档案与证据阅读

**Files:**
- Create: `term-frontend/src/features/term-profile/ProfileSectionNav.tsx`
- Create: `term-frontend/src/features/term-profile/ProfileSectionNav.test.tsx`
- Modify: `term-frontend/src/features/term-profile/TermProfilePage.tsx`
- Modify: `term-frontend/src/features/term-profile/TermProfilePage.test.tsx`
- Modify: `term-frontend/src/features/term-profile/TranslationPanel.tsx`
- Modify: `term-frontend/src/features/term-profile/EvidencePanel.tsx`
- Modify: `term-frontend/src/features/term-profile/term-profile.css`

**Interfaces:**
- Consumes: `TermProfile`、Task 1 的 `SectionHeading`/`StatusBadge`、现有安全 URL 过滤逻辑。
- Produces: `ProfileSectionNav({ sections: Array<{id: string; label: string}> })`；所有章节 id 固定且与 `aria-labelledby` 对应。

- [ ] **Step 1: 写术语档案结构失败测试**

```tsx
expect(screen.getByRole('navigation', { name: '术语档案章节' })).toBeInTheDocument()
expect(screen.getByRole('link', { name: '来源证据' })).toHaveAttribute('href', '#evidence')
expect(screen.getByRole('heading', { level: 1, name: '和而不同' })).toBeInTheDocument()
expect(screen.getByText('harmony in diversity')).toBeInTheDocument()
```

儿童模式测试继续要求“给小朋友的话”位于翻译区之前。

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm test -- --run src/features/term-profile/TermProfilePage.test.tsx src/features/term-profile/ProfileSectionNav.test.tsx`

Expected: 缺少章节导航。

- [ ] **Step 3: 实现档案封面与章节导航**

封面同时呈现术语、推荐译法、层级、分类、数据质量；无推荐译法时不渲染空占位。章节导航仅包含实际存在的板块。

- [ ] **Step 4: 重构译法与证据表现**

译法按推荐/其他分组保留；来源改为文献条目，来源元数据使用定义列表 `<dl>`，证据摘录使用 `<blockquote>`。保留 `target="_blank" rel="noreferrer noopener"` 和不安全 URL 拦截。

- [ ] **Step 5: 实现响应式与大字模式**

`>= 1040px` 章节导航粘性定位；更小视口改为可横向滚动的章节链接，但页面主体不得横向溢出。大字模式下粘性导航不覆盖标题。

- [ ] **Step 6: 回归并提交**

```powershell
npm test -- --run src/features/term-profile/TermProfilePage.test.tsx src/features/term-profile/ProfileSectionNav.test.tsx
npm run build
git add src/features/term-profile
git commit -m "feat: redesign terminology dossier"
```

---

### Task 5: 重构跨文化表达实验室

**Files:**
- Create: `term-frontend/src/features/expression-lab/LabProgress.tsx`
- Create: `term-frontend/src/features/expression-lab/LabProgress.test.tsx`
- Modify: `term-frontend/src/features/expression-lab/ExpressionLabPage.tsx`
- Modify: `term-frontend/src/features/expression-lab/ExpressionLabPage.test.tsx`
- Modify: `term-frontend/src/features/expression-lab/ExpressionReport.tsx`
- Modify: `term-frontend/src/features/expression-lab/ExpressionReport.test.tsx`
- Modify: `term-frontend/src/features/expression-lab/AlternativeComparison.tsx`
- Modify: `term-frontend/src/features/expression-lab/CulturalRiskPanel.tsx`
- Modify: `term-frontend/src/features/expression-lab/ReferenceList.tsx`
- Modify: `term-frontend/src/features/expression-lab/expression-lab.css`

**Interfaces:**
- Consumes: 现有 `ExpressionTask`、`ExpressionAnalysis`、生成/重试/导出/保存回调。
- Produces: `LabProgress({ active: 'task' | 'knowledge' | 'report' })`，纯展示且使用有序列表。

- [ ] **Step 1: 写流程和报告结构失败测试**

```tsx
expect(screen.getByRole('list', { name: '表达研究流程' })).toHaveTextContent('任务设置')
expect(screen.getByRole('list', { name: '表达研究流程' })).toHaveTextContent('生成报告')
expect(screen.getByRole('region', { name: '推荐表达' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '保存到研究工作台' })).toBeInTheDocument()
```

原有请求 payload、失败重试、导出和保存测试必须同时运行。

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm test -- --run src/features/expression-lab/LabProgress.test.tsx src/features/expression-lab/ExpressionLabPage.test.tsx src/features/expression-lab/ExpressionReport.test.tsx`

Expected: `LabProgress` 缺失或报告没有命名 region。

- [ ] **Step 3: 实现研究流程与编辑器布局**

任务表单和知识包留在左侧编辑器；报告使用右侧纸张区域。生成中、失败和空状态保持原业务状态，只替换视觉容器和文案层级。

- [ ] **Step 4: 重构报告排版**

按推荐表达→备选表达→术语采用→文化风险→引用→限制排列。所有操作集中在 `report-toolbar`；AI 未审核徽标始终可见。

- [ ] **Step 5: 实现移动流程**

`<= 960px` 单栏，取消 `position: sticky`；流程导航可换行；报告工具栏按钮满宽或两列，不能出现横向滚动。

- [ ] **Step 6: 回归并提交**

```powershell
npm test -- --run src/features/expression-lab
npm run build
git add src/features/expression-lab
git commit -m "feat: redesign expression research lab"
```

---

### Task 6: 重构人工评审工作台

**Files:**
- Create: `term-frontend/src/features/review-workspace/MobileCaseNavigation.tsx`
- Create: `term-frontend/src/features/review-workspace/MobileCaseNavigation.test.tsx`
- Modify: `term-frontend/src/features/review-workspace/ReviewWorkspacePage.tsx`
- Modify: `term-frontend/src/features/review-workspace/ReviewWorkspacePage.test.tsx`
- Modify: `term-frontend/src/features/review-workspace/WorkspaceOverview.tsx`
- Modify: `term-frontend/src/features/review-workspace/CaseFilters.tsx`
- Modify: `term-frontend/src/features/review-workspace/CaseQueue.tsx`
- Modify: `term-frontend/src/features/review-workspace/CaseReviewPanel.tsx`
- Modify: `term-frontend/src/features/review-workspace/RevisionHistory.tsx`
- Modify: `term-frontend/src/features/review-workspace/StateActions.tsx`
- Modify: `term-frontend/src/features/review-workspace/WorkspaceExportActions.tsx`
- Modify: `term-frontend/src/features/review-workspace/review-workspace.css`
- Modify: `term-frontend/src/features/review-workspace/workspace-export.css`

**Interfaces:**
- Consumes: 现有 URL `case` 参数、筛选 query、案例详情、修订与状态回调。
- Produces: `MobileCaseNavigation({ selectedTitle, onBack })`；移动端仅控制队列/详情显隐，不改变 URL 选择模型。

- [ ] **Step 1: 写概览、档案与移动导航失败测试**

```tsx
expect(screen.getByRole('region', { name: '案例状态摘要' })).toHaveTextContent('待审核')
await user.click(screen.getByRole('button', { name: /打开案例/ }))
expect(screen.getByRole('button', { name: '返回案例队列' })).toBeInTheDocument()
expect(screen.getByRole('article', { name: '案例评审档案' })).toBeInTheDocument()
```

保留修订 payload、409 表单保留、合法状态按钮和导出筛选测试。

- [ ] **Step 2: 运行测试确认红灯**

Run: `npm test -- --run src/features/review-workspace`

Expected: 缺少命名区域和移动返回按钮。

- [ ] **Step 3: 简化状态摘要和案例队列**

将五张统计卡改为一条 `workspace-summary`；案例队列用细分隔线与当前项左侧朱砂标记。状态继续使用现有中文标签和 API 值。

- [ ] **Step 4: 重构案例档案**

AI/人工对照、修订表单、历史和状态操作分为四个编号章节。不能把状态流转按钮混入“保存新修订”主操作。

- [ ] **Step 5: 实现移动案例导航**

`<= 820px` 且存在 `case` 参数时隐藏队列、展示详情和“返回案例队列”；返回操作仅删除 `case` 参数并保留所有筛选参数。切换详情后将焦点移动到案例标题。

- [ ] **Step 6: 回归并提交**

```powershell
npm test -- --run src/features/review-workspace
npm run build
git add src/features/review-workspace
git commit -m "feat: redesign human review workspace"
```

---

### Task 7: 完成移动端、组合模式和视觉验收

**Files:**
- Create: `term-frontend/src/test/ResponsiveShell.test.tsx`
- Modify: `term-frontend/src/styles/global.css`
- Modify: `term-frontend/src/styles/app.css`
- Modify: `term-frontend/src/components/ReadingPreferenceControls.test.tsx`
- Modify: `README.md`
- Create: `docs/visual-system-guide.md`

**Interfaces:**
- Consumes: Tasks 1—6 的最终页面结构和 CSS 类。
- Produces: 可重复的视觉验收清单与设计系统维护指南。

- [ ] **Step 1: 写组合模式与溢出防护测试**

测试儿童+大字同时启用、设置持久化、移动页头操作仍可达：

```tsx
localStorage.setItem('termbase-reading-preferences', JSON.stringify({ childMode: true, largeTextMode: true }))
render(<App />)
expect(document.querySelector('.app-shell')).toHaveAttribute('data-child-mode', 'true')
expect(document.querySelector('.app-shell')).toHaveAttribute('data-large-text', 'true')
expect(screen.getByRole('button', { name: '打开导航菜单' })).toBeVisible()
```

- [ ] **Step 2: 运行组合测试确认状态**

Run: `npm test -- --run src/test/ResponsiveShell.test.tsx src/components/ReadingPreferenceControls.test.tsx`

Expected: 新测试文件首次导入失败；实现后必须通过。

- [ ] **Step 3: 补齐全局移动规则**

检查并修复长英文译法、URL、案例标题、状态工具栏和表单在 320px 下的换行。仅对确实可能出现的连续字符串使用：

```css
.translation-text, .source-url, .case-title { overflow-wrap: anywhere; }
```

不得对正文整体设置 `word-break: break-all`。

- [ ] **Step 4: 编写视觉系统维护指南**

`docs/visual-system-guide.md` 记录颜色 token、字体、容器宽度、组件使用场景、断点、儿童/大字规则和禁止事项。README 更新为新视觉特性，但不宣称未经测试的浏览器支持。

- [ ] **Step 5: 完整自动化验证**

```powershell
cd term-frontend
npm test -- --run
npm run lint
npm run build
cd ..\term-backend
.\venv\Scripts\python.exe -m pytest -q
```

Expected: 前端全部测试通过；lint 0 errors（可注明两个旧页面已有的 exhaustive-deps warnings）；生产构建成功；后端全部测试通过。

- [ ] **Step 6: 逐视口人工验收**

在 320、375、390、430、768、1024、1440px 检查 `/`、`/discover`、一个 `/terms/{id}`、`/lab` 和 `/workspace`。每个页面检查标准、儿童、大字、儿童+大字四种组合；记录并修复：横向溢出、遮挡、标题断裂、不可见焦点、低对比和小于 44px 的关键触控目标。

- [ ] **Step 7: 仓库与安全检查**

```powershell
git diff --check
$secretCount = 0
git ls-files | ForEach-Object {
  if (Test-Path -LiteralPath $_) {
    $secretCount += @(Select-String -LiteralPath $_ -Pattern 'sk-[A-Za-z0-9]{20,}' -AllMatches -ErrorAction SilentlyContinue).Count
  }
}
if ($secretCount -ne 0) { exit 1 }
git status --short
```

- [ ] **Step 8: 提交最终文档与验收修复**

```powershell
git add README.md docs/visual-system-guide.md term-frontend/src
git commit -m "docs: complete editorial visual system"
```

---

## Spec Coverage Check

| 设计要求 | 实施任务 |
|---|---|
| 墨青、朱砂、宣纸色与统一排版 | Task 1 |
| 桌面/移动页头及阅读工具整合 | Task 1、7 |
| 首页研究流程与编辑式首屏 | Task 2 |
| 检索工具栏、移动筛选与结果层级 | Task 3 |
| 术语档案、章节导航与文献证据 | Task 4 |
| 表达实验室任务—知识—报告流程 | Task 5 |
| 研究工作台档案化与移动返回 | Task 6 |
| 儿童模式、大字模式及组合 | Task 1、3、4、7 |
| 320—1440px 响应式和无障碍 | Tasks 1—7，集中验收于 Task 7 |
| 不改变业务/API/数据库 | 所有任务的 Global Constraints 与回归测试 |
