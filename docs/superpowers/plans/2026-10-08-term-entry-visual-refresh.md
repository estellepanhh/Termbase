# 术语聚合与淮河文脉视觉改版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将同名术语聚合为包含多个编号文化义项的规范词条，并完成检索、详情、淮河图谱和 AI 数字人物的统一视觉改版。

**Architecture:** 后端公共读取服务建立非破坏性的同名术语规范投影，API 追加聚合统计和文化义项；前端消费新增字段并使用本地 SVG/CSS 完成视觉改版。管理员数据、历史记录和聊天传输协议保持不变。

**Tech Stack:** Flask, SQLAlchemy, React 19, TypeScript, Vitest, Testing Library, CSS, inline SVG

**Spec:** `docs/superpowers/specs/2026-10-08-term-entry-visual-refresh-design.md`

## Global Constraints

- 不新增 UI 框架、图标包或图片运行时依赖。
- 不删除、不覆盖历史术语记录。
- 公共 API 保留旧字段，新字段必须向后兼容。
- 儿童释义永远不进入“适用场景”列表。
- 动效必须支持 `prefers-reduced-motion`。
- 主层级只能有一个，其他层级只在文化义项中作为研究记录信息出现。

## Review Focus

- 同名记录中既有完全重复内容又有不同文化内涵时，重复义项应去重、不同义项应保留。
- 从非规范同名记录 ID 进入详情时，应返回与规范记录一致的聚合详情。
- 过滤命中组内非规范记录时，列表仍应返回一次规范词条。
- 所有文化内涵为空时，详情必须生成可读的定义回退义项。
- 减少动效模式下河流、节点和数字人物动画必须停止。

---

### Task 1: Canonical term projection

**Files:**
- Modify: `term-backend/termbase_app/services/public_terms.py`
- Modify: `term-backend/termbase_app/schemas/public_terms.py`
- Modify: `term-backend/tests/test_public_terms_api.py`

**Interfaces:**
- Produces: `TermSummary.interpretation_count`, `TermSummary.record_count`, `TermDetail.interpretations`
- Produces: one public result per exact normalized `preferred_name_zh`

- [ ] **Step 1: Write failing API tests** for duplicate grouping, filter-through grouping, detail aliases, sense deduplication, and empty-content fallback.
- [ ] **Step 2: Run the focused backend tests**

Run: `python -m pytest tests/test_public_terms_api.py -q`
Expected: FAIL because duplicates remain separate and interpretation fields do not exist.

- [ ] **Step 3: Implement canonical grouping and interpretation serialization** in `public_terms.py`, retaining all existing response fields.
- [ ] **Step 4: Update TypedDict contracts** in `schemas/public_terms.py`.
- [ ] **Step 5: Run the focused backend tests**

Run: `python -m pytest tests/test_public_terms_api.py -q`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: aggregate duplicate terms into cultural interpretations`

### Task 2: Discovery and term profile information architecture

**Files:**
- Modify: `term-frontend/src/types/knowledge.ts`
- Modify: `term-frontend/src/features/discovery/TermResultItem.tsx`
- Modify: `term-frontend/src/features/discovery/discovery.css`
- Modify: `term-frontend/src/features/discovery/DiscoveryPage.test.tsx`
- Create: `term-frontend/src/components/KnowledgeGlyph.tsx`
- Create: `term-frontend/src/features/term-profile/CulturalInterpretations.tsx`
- Modify: `term-frontend/src/features/term-profile/TermProfilePage.tsx`
- Modify: `term-frontend/src/features/term-profile/term-profile.css`
- Modify: `term-frontend/src/features/term-profile/TermProfilePage.test.tsx`

**Interfaces:**
- Consumes: Task 1 summary and detail response fields.
- Produces: `KnowledgeGlyph` reusable inline SVG and numbered `CulturalInterpretations` section.

- [ ] **Step 1: Write failing component tests** asserting one card exposes interpretation count, detail renders 01/02/03, child content is separate, and usage contexts exclude children.
- [ ] **Step 2: Run focused frontend tests**

Run: `npm test -- src/features/discovery/DiscoveryPage.test.tsx src/features/term-profile/TermProfilePage.test.tsx`
Expected: FAIL on missing interpretation UI and semantic glyphs.

- [ ] **Step 3: Add TypeScript interfaces and `KnowledgeGlyph`** without external dependencies.
- [ ] **Step 4: Implement discovery and profile presentation** with numbered interpretations and separated child panel.
- [ ] **Step 5: Add editorial depth, hover, responsive, and reduced-motion styles**.
- [ ] **Step 6: Run focused frontend tests**

Run: `npm test -- src/features/discovery/DiscoveryPage.test.tsx src/features/term-profile/TermProfilePage.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

Commit message: `feat: present canonical terms and numbered interpretations`

### Task 3: Huaihe river map

**Files:**
- Modify: `term-frontend/src/features/topics/CulturalKnowledgeMap.tsx`
- Modify: `term-frontend/src/features/topics/topics.css`
- Modify: `term-frontend/src/features/topics/TopicDetailPage.test.tsx`

**Interfaces:**
- Consumes: `KnowledgeGlyph` from Task 2.
- Produces: layered river SVG, geographic labels, and icon-based topic nodes.

- [ ] **Step 1: Write failing topic test** for river title, 寿县/淮南/蚌埠/凤阳 labels, and accessible node buttons.
- [ ] **Step 2: Run the focused topic test**

Run: `npm test -- src/features/topics/TopicDetailPage.test.tsx`
Expected: FAIL because geographic labels and layered river are absent.

- [ ] **Step 3: Implement layered SVG river and labels** while keeping data-driven node selection and scroll behavior.
- [ ] **Step 4: Replace node letter badges with `KnowledgeGlyph` and update responsive/reduced-motion CSS**.
- [ ] **Step 5: Run the focused topic test**

Run: `npm test -- src/features/topics/TopicDetailPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: turn the Huaihe knowledge map into a flowing river`

### Task 4: Animated AI research avatar

**Files:**
- Create: `term-frontend/src/components/ResearchAvatar.tsx`
- Modify: `term-frontend/src/components/ChatAI.tsx`
- Modify: `term-frontend/src/styles/app.css`
- Modify: `term-frontend/src/components/ChatAI.test.tsx`

**Interfaces:**
- Produces: `ResearchAvatar({ thinking?: boolean })` inline SVG.
- Preserves: existing ChatAI request, streaming, composer, and accessible dialog behavior.

- [ ] **Step 1: Write failing component test** asserting the trigger and loading state contain the research avatar while the trigger name remains unchanged.
- [ ] **Step 2: Run the focused assistant test**

Run: `npm test -- src/components/ChatAI.test.tsx`
Expected: FAIL because the avatar is absent.

- [ ] **Step 3: Implement `ResearchAvatar` and integrate it into trigger/header/loading state**.
- [ ] **Step 4: Add breathing, blink, and thinking styles with a reduced-motion override**.
- [ ] **Step 5: Run the focused assistant test**

Run: `npm test -- src/components/ChatAI.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: add animated digital research avatar`

### Task 5: Full verification and visual review

**Files:**
- Modify as needed only for defects found by verification.

**Interfaces:**
- Consumes all prior task outputs.
- Produces a buildable, tested implementation and visual evidence.

- [ ] **Step 1: Run backend suite**

Run: `python -m pytest -q`
Expected: all tests pass.

- [ ] **Step 2: Run frontend suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Run frontend lint and build**

Run: `npm run lint && npm run build`
Expected: exit code 0 for both commands.

- [ ] **Step 4: Start the local application and capture desktop/mobile screenshots** of discovery, a grouped term profile, the Huaihe topic, and the AI trigger.
- [ ] **Step 5: Inspect screenshots** for overlap, clipping, low contrast, ambiguous labels, excessive animation, and responsive defects; repair any Important defects with a failing test first.
- [ ] **Step 6: Commit verification repairs** if any.

Commit message: `fix: polish terminology visual refresh`
