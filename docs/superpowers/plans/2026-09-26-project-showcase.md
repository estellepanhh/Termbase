# Project Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual, responsive `/about` project showcase that explains the research project and displays four database-backed outcome counts.

**Architecture:** Add one public read-only Flask endpoint backed by a focused aggregation service, then consume it through the existing frontend knowledge API. A self-contained `features/about` module owns copy, presentation components, state, and responsive styles; the existing route tree and application shell expose it.

**Tech Stack:** Flask, Flask-SQLAlchemy, unittest/pytest, React 19, TypeScript, React Router, i18next, Vitest, Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-09-26-project-showcase-design.md`

## Global Constraints

- Only database-derived term, translation, covered-language, and published-topic counts may be displayed as numbers.
- Do not expose unpublished topic details, review-workspace state, AI configuration, API keys, or unconfirmed team data.
- Maintain complete Chinese and English copy, plus simplified child-mode copy without changing facts.
- Preserve the existing paper/indigo/vermilion visual system and avoid new runtime dependencies.
- Support desktop, tablet, mobile, child mode, large-text mode, keyboard navigation, and semantic landmarks.
- Keep static project content usable when the overview request fails.

## Review Focus

- An empty database returns four numeric zeros rather than nulls or a server error; covered by Task 1 API tests.
- Multiple translations in the same language count as one covered language; covered by Task 1 service/API tests.
- Draft topics never contribute to the public topic count; covered by Task 1 API tests.
- A rejected or slow overview request does not hide static content or permit duplicate retry clicks; covered by Task 3 page tests.
- Language and reading-mode changes preserve already loaded statistics and do not trigger another request; covered by Task 3 page tests.

---

### Task 1: Public Project Overview API

**Files:**
- Create: `term-backend/termbase_app/services/project_overview.py`
- Create: `term-backend/termbase_app/routes/project_overview.py`
- Modify: `term-backend/termbase_app/__init__.py`
- Test: `term-backend/tests/test_project_overview_api.py`

**Interfaces:**
- Consumes: `db`, `Term`, `Translation`, and `Topic` from the existing backend model layer.
- Produces: `get_project_overview() -> dict[str, int]` and `GET /api/project/overview` returning `{code: 200, data: ProjectOverview}`.

- [ ] **Step 1: Write failing endpoint tests**

Create tests named `test_overview_returns_public_counts`, `test_overview_counts_each_language_once_and_excludes_draft_topics`, `test_overview_returns_zero_counts_for_empty_database`, and `test_overview_exposes_only_contract_fields`. Seed two languages, repeated translations, one published topic, and one draft topic; assert the exact four-field response.

- [ ] **Step 2: Run the new backend tests and confirm failure**

Run: `term-backend\venv\Scripts\python.exe -m pytest term-backend/tests/test_project_overview_api.py -q`

Expected: FAIL because `/api/project/overview` is not registered.

- [ ] **Step 3: Implement the aggregation service**

Implement `get_project_overview() -> dict[str, int]` with SQLAlchemy `count` queries and `count(distinct(Translation.language_id))`; filter topics by `Topic.status == "published"`.

- [ ] **Step 4: Implement and register the route**

Create a blueprint with `GET /api/project/overview`, return the exact success envelope, and register it in `create_app`.

- [ ] **Step 5: Run the new backend tests**

Run: `term-backend\venv\Scripts\python.exe -m pytest term-backend/tests/test_project_overview_api.py -q`

Expected: all new tests PASS.

- [ ] **Step 6: Commit the backend endpoint**

```powershell
git add term-backend/termbase_app/services/project_overview.py term-backend/termbase_app/routes/project_overview.py term-backend/termbase_app/__init__.py term-backend/tests/test_project_overview_api.py
git commit -m "feat: expose public project outcomes"
```

### Task 2: Frontend Overview Contract

**Files:**
- Modify: `term-frontend/src/types/knowledge.ts`
- Modify: `term-frontend/src/services/knowledgeApi.ts`
- Modify: `term-frontend/src/services/knowledgeApi.test.ts`

**Interfaces:**
- Consumes: the Task 1 response `{code: 200, data: {term_count, translation_count, language_count, published_topic_count}}`.
- Produces: `ProjectOverview` and `getProjectOverview(): Promise<ProjectOverview>` for the About feature.

- [ ] **Step 1: Write the failing client test**

Add `loads the public project overview` and assert the exact returned object plus request URI `/api/project/overview`.

- [ ] **Step 2: Run the focused client test and confirm failure**

Run: `npm test -- --run src/services/knowledgeApi.test.ts`

Working directory: `term-frontend`

Expected: FAIL because the type and function do not exist.

- [ ] **Step 3: Add the type and service function**

Add the four numeric fields to `ProjectOverview`, add a typed response envelope, and implement `getProjectOverview()` using the existing request wrapper.

- [ ] **Step 4: Run the focused client test**

Run: `npm test -- --run src/services/knowledgeApi.test.ts`

Working directory: `term-frontend`

Expected: PASS.

- [ ] **Step 5: Commit the frontend contract**

```powershell
git add term-frontend/src/types/knowledge.ts term-frontend/src/services/knowledgeApi.ts term-frontend/src/services/knowledgeApi.test.ts
git commit -m "feat: add project overview client"
```

### Task 3: Project Showcase Feature

**Files:**
- Create: `term-frontend/src/features/about/aboutCopy.ts`
- Create: `term-frontend/src/features/about/ProjectHero.tsx`
- Create: `term-frontend/src/features/about/ResearchWorkflow.tsx`
- Create: `term-frontend/src/features/about/OutcomeOverview.tsx`
- Create: `term-frontend/src/features/about/PlatformCapabilities.tsx`
- Create: `term-frontend/src/features/about/AboutPage.tsx`
- Create: `term-frontend/src/features/about/about.css`
- Create: `term-frontend/src/features/about/AboutPage.test.tsx`

**Interfaces:**
- Consumes: `getProjectOverview(): Promise<ProjectOverview>`, `useTranslation()`, and `useChildMode()`.
- Produces: default `AboutPage` route component; presentational components receive explicit copy/data props and do not request data themselves.

- [ ] **Step 1: Write failing page tests for content and outcomes**

Test the Chinese project heading, five workflow stages, four capability links, four returned counts, and the distinction between completed and ongoing progress.

- [ ] **Step 2: Write failing state and preference tests**

Test loading semantics, failed request with usable static content, successful retry, retry disabled while pending, zero counts, English copy, child-mode copy, and no extra API request when language or reading mode changes.

- [ ] **Step 3: Run the page tests and confirm failure**

Run: `npm test -- --run src/features/about/AboutPage.test.tsx`

Working directory: `term-frontend`

Expected: FAIL because the feature does not exist.

- [ ] **Step 4: Add typed bilingual and child-mode copy**

Export `getAboutCopy(language: 'zh' | 'en', childMode: boolean): AboutCopy`. Include the exact eight information-architecture sections from the spec and route targets `/discover`, `/lab`, `/topics`, and `/workspace`.

- [ ] **Step 5: Implement focused presentational components**

Implement `ProjectHero`, `ResearchWorkflow`, `OutcomeOverview`, and `PlatformCapabilities` with semantic headings/lists and no data fetching.

- [ ] **Step 6: Implement AboutPage state flow**

Fetch once on mount, ignore resolution after unmount, retain static content on failure, and expose one guarded retry action. Reuse the resolved overview across language, child-mode, and large-text changes.

- [ ] **Step 7: Add responsive editorial styling**

Implement four/two/one-column outcome breakpoints, two/one-column capabilities, desktop-to-mobile workflow layout, visible focus states, flexible text height, and inherited large-text behavior using existing design tokens.

- [ ] **Step 8: Run the page tests**

Run: `npm test -- --run src/features/about/AboutPage.test.tsx`

Working directory: `term-frontend`

Expected: PASS.

- [ ] **Step 9: Commit the showcase feature**

```powershell
git add term-frontend/src/features/about
git commit -m "feat: build project showcase page"
```

### Task 4: Route, Navigation, and End-to-End Integration

**Files:**
- Modify: `term-frontend/src/app/routes.tsx`
- Modify: `term-frontend/src/app/AppShell.tsx`
- Modify: `term-frontend/src/app/AppShell.test.tsx`
- Delete: `term-frontend/src/pages/AboutPage.tsx`

**Interfaces:**
- Consumes: Task 3 default `AboutPage` component.
- Produces: canonical `/about` route plus Chinese `项目成果` / English `Project` links in desktop and mobile navigation.

- [ ] **Step 1: Update route-shell tests before implementation**

Extend the existing partial `knowledgeApi` mock with `getProjectOverview`, returning four deterministic counts. Remove `/about` from the legacy redirects table. Add assertions that `/about` renders the project heading, the desktop navigation link is current, mobile navigation contains the same link, and English shell copy is `Project`.

- [ ] **Step 2: Run the shell test and confirm failure**

Run: `npm test -- --run src/app/AppShell.test.tsx`

Working directory: `term-frontend`

Expected: FAIL because `/about` still redirects and the link is absent.

- [ ] **Step 3: Wire the canonical route and navigation**

Import the new feature page, render it at `/about`, add localized shell labels and the navigation item, and remove the unused legacy About page.

- [ ] **Step 4: Run the integration tests**

Run: `npm test -- --run src/app/AppShell.test.tsx src/features/about/AboutPage.test.tsx src/services/knowledgeApi.test.ts`

Working directory: `term-frontend`

Expected: PASS.

- [ ] **Step 5: Commit route integration**

```powershell
git add term-frontend/src/app/routes.tsx term-frontend/src/app/AppShell.tsx term-frontend/src/app/AppShell.test.tsx term-frontend/src/pages/AboutPage.tsx
git commit -m "feat: publish project showcase route"
```

### Task 5: Full Verification and Visual Inspection

**Files:**
- Modify only files required to correct failures directly caused by Tasks 1–4.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a verified feature ready to merge.

- [ ] **Step 1: Run the complete backend suite**

Run: `term-backend\venv\Scripts\python.exe -m pytest term-backend/tests -q`

Expected: all tests PASS.

- [ ] **Step 2: Run the complete frontend suite**

Run: `npm test`

Working directory: `term-frontend`

Expected: all tests PASS.

- [ ] **Step 3: Run build and lint**

Run: `npm run build` and `npm run lint`

Working directory: `term-frontend`

Expected: build succeeds; lint has no new errors or warnings.

- [ ] **Step 4: Inspect desktop and mobile renderings**

Open `/about` at desktop and narrow mobile widths. Verify layout, long English copy, zero/error states, both reading modes, keyboard focus, and all four capability links.

- [ ] **Step 5: Review the final diff for data and secret safety**

Run: `git diff --check` and inspect `git diff HEAD~4..HEAD`. Confirm no API key, invented names, invented outcome values, or unrelated changes.

- [ ] **Step 6: Commit any verification-only correction**

If corrections were needed, commit only those files with `git commit -m "fix: polish project showcase"`. If no corrections were needed, do not create an empty commit.
