# Simplified Co-construction Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the product into a clear “术语库 + 术语共建 + 管理审核” platform by removing unclear modules, adding user co-construction, preserving admin term CRUD, and simplifying the AI popup content.

**Architecture:** Add a submission/co-construction domain beside the existing published `Term` domain. Public discovery reads published terms; normal users create and manage their own co-construction submissions; admins review submissions and publish approved records into the existing term table.

**Tech Stack:** Flask, SQLAlchemy, Alembic, pytest, React, TypeScript, Vitest, Vite, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-27-simplified-co-construction-redesign.md`

## Global Constraints

- Remove “表达实验室” and “研究工作台” from user-facing navigation.
- Add “术语共建” as the normal-user contribution module.
- Preserve administrator term add/edit/delete management.
- Normal users may submit and edit only their own non-approved submissions.
- Admins review submissions from term management and may publish them into the formal term base.
- Homepage title must be “中国特色话语多语术语库”.
- AI entry icon/button appearance must remain as-is.
- AI popup content must be a plain chat experience without research-task chips.
- Login page must not display demo account passwords.

## Review Focus

- Unauthenticated users opening `/co-construction` should be redirected to login, not see a broken form. Covered in Task 3.
- Normal users must not call admin review/publish endpoints. Covered in Task 2.
- Duplicate or invalid submissions should return clear validation errors. Covered in Task 1.
- Legacy `/lab` and `/workspace` URLs should redirect to `/co-construction`. Covered in Task 3.
- Admin publishing a submission should create a formal term and mark the submission approved. Covered in Task 2.

---

### Task 1: Backend co-construction submission model and user APIs

**Files:**
- Create: `term-backend/termbase_app/models/submission.py`
- Create: `term-backend/termbase_app/routes/co_construction.py`
- Create: `term-backend/migrations/versions/<revision>_add_term_submissions.py`
- Modify: `term-backend/termbase_app/models/__init__.py`
- Modify: `term-backend/termbase_app/__init__.py`
- Test: `term-backend/tests/test_co_construction_api.py`

**Interfaces:**
- Produces model `TermSubmission` with fields `id`, `public_id`, `created_by_id`, `preferred_name_zh`, `definition_zh`, `recommended_translation`, `cultural_connotation`, `source_text`, `status`, `review_note`, timestamps.
- Produces user APIs:
  - `POST /api/v1/co-construction/submissions`
  - `GET /api/v1/co-construction/submissions`
  - `PUT /api/v1/co-construction/submissions/<public_id>`
  - `POST /api/v1/co-construction/submissions/<public_id>/withdraw`

- [ ] Write failing backend tests for login-required creation, valid creation, list-own-submissions, edit-own-pending submission, duplicate/invalid payload rejection, and withdraw-own-pending submission.
- [ ] Implement model, migration, route registration, payload validation, ownership checks, and user endpoints.
- [ ] Run `D:\Termbase\term-backend\venv\Scripts\python.exe -m pytest tests/test_co_construction_api.py -q`.
- [ ] Commit as `feat: add co-construction submissions`.

### Task 2: Admin review and publish submissions

**Files:**
- Modify: `term-backend/termbase_app/routes/co_construction.py`
- Modify: `term-backend/tests/test_co_construction_api.py`
- Modify if needed: `term-backend/termbase_app/routes/term_admin.py`

**Interfaces:**
- Produces admin APIs:
  - `GET /api/v1/admin/co-construction/submissions`
  - `POST /api/v1/admin/co-construction/submissions/<public_id>/approve`
  - `POST /api/v1/admin/co-construction/submissions/<public_id>/reject`
- Approval creates a `Term` and sets submission `status="approved"`.
- Rejection sets `status="rejected"` and stores `review_note`.

- [ ] Write failing tests that normal users receive 403 on admin review APIs, admins can list pending submissions, approve to create a term, and reject with a note.
- [ ] Implement admin list/review endpoints using existing `require_admin()`.
- [ ] Run backend co-construction tests and existing admin term tests.
- [ ] Commit as `feat: add co-construction review`.

### Task 3: Frontend routes, navigation, homepage, and login cleanup

**Files:**
- Create: `term-frontend/src/features/co-construction/CoConstructionPage.tsx`
- Create: `term-frontend/src/features/co-construction/co-construction.css`
- Create: `term-frontend/src/services/coConstructionApi.ts`
- Modify: `term-frontend/src/app/routes.tsx`
- Modify: `term-frontend/src/app/AppShell.tsx`
- Modify: `term-frontend/src/features/home/HomePage.tsx`
- Modify: `term-frontend/src/features/home/home.css`
- Modify: `term-frontend/src/features/auth/LoginPage.tsx`
- Modify tests under `term-frontend/src/app`, `term-frontend/src/features/home`, `term-frontend/src/features/auth`.

**Interfaces:**
- Consumes backend user submission APIs from Task 1.
- Produces route `/co-construction`.
- Redirects `/lab` and `/workspace` to `/co-construction`.
- Removes “表达实验室” and “研究工作台” from navigation.

- [ ] Write failing frontend tests for navigation labels, legacy redirects, homepage title, login page hiding demo passwords, and unauthenticated co-construction redirect.
- [ ] Implement co-construction service and page with submission form plus “我的共建记录”.
- [ ] Update navigation, homepage, and login copy/structure.
- [ ] Run targeted frontend tests.
- [ ] Commit as `feat: add co-construction frontend`.

### Task 4: Admin term management review UI

**Files:**
- Modify: `term-frontend/src/features/term-management/TermManagementPage.tsx`
- Modify/create related term-management CSS/tests.
- Modify: `term-frontend/src/services/knowledgeApi.ts` or create `termAdminApi.ts` if cleaner.

**Interfaces:**
- Consumes Task 2 admin submission endpoints.
- Keeps existing admin term CRUD UI available.
- Adds a visible “共建审核” section/tab inside term management.

- [ ] Write failing tests that admins see pending submissions and can approve/reject from term management without losing existing create/edit/delete controls.
- [ ] Implement admin submission list and approve/reject actions.
- [ ] Run term-management tests.
- [ ] Commit as `feat: add co-construction admin review`.

### Task 5: Simplify AI popup content without changing entry icon

**Files:**
- Modify: `term-frontend/src/components/ChatAI.tsx`
- Modify: `term-frontend/src/components/ChatAI.test.tsx`
- Modify if needed: `term-frontend/src/styles/app.css`

**Interfaces:**
- Keeps existing floating entry visual class structure as much as possible.
- Removes task chips and research-assistant copy inside the opened dialog.
- Keeps ordinary chat input and messages.

- [ ] Write/update test to assert the AI entry still opens a dialog and task chips are absent.
- [ ] Simplify dialog content to normal AI chat.
- [ ] Run AI component tests.
- [ ] Commit as `feat: simplify ai chat popup`.

### Task 6: Verification and cleanup

**Files:**
- No planned product files unless verification finds bugs.

- [ ] Run backend migration on dev database after tests pass.
- [ ] Run `D:\Termbase\term-backend\venv\Scripts\python.exe -m pytest -q`.
- [ ] Run `npm run test`, `npm run lint`, and `npm run build` in `term-frontend`.
- [ ] Inspect `git status --short` and remove/ignore only intentional scratch files.
- [ ] Commit any final fixes as needed.
