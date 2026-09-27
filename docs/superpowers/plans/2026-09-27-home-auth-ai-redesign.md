# Home Auth AI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved public showcase homepage, two-role login, protected term management, and redesigned AI research drawer.

**Architecture:** Add lightweight backend authentication with signed tokens and role guards, then consume that auth state from a frontend context and protected route. Rebuild the homepage as a public digital exhibition and restyle the global AI assistant as a research drawer while keeping existing public routes available.

**Tech Stack:** Flask, Flask-SQLAlchemy, Flask-Migrate, Werkzeug password hashing, itsdangerous signed tokens, React 19, React Router 7, Axios, Vitest, unittest.

**Spec:** `docs/superpowers/specs/2026-09-27-home-auth-ai-redesign.md`

## Global Constraints

- Roles are exactly `user` and `admin`.
- Demo accounts are `user / 123456` and `admin / 123456`.
- Public visitors can access homepage, about page, published term discovery, published term details, and cultural topics.
- Normal users cannot access term management or admin APIs.
- Admins can access term management and create, edit, delete, and publish terms.
- Child mode and large-text mode remain reading modes, not account roles.
- Registration, email verification, password reset, third-party login, audit logs, user management, and topic management are out of scope.
- The homepage must not show a hero search box.
- The AI assistant must be a platform research drawer, not a customer-service-style small chat box.
- Do not introduce a heavy 3D engine in this pass.

## Review Focus

- Missing or malformed auth token on `/api/v1/admin/terms` returns 401 and does not leak data; covered in Task 2.
- Valid normal-user token on `/api/v1/admin/terms` returns 403; covered in Task 2.
- Expired or tampered local storage auth state logs the user out cleanly and hides admin navigation; covered in Task 3.
- Mobile homepage and AI drawer do not overlap navigation, reading controls, or page content; covered in Task 6.
- Large-text mode affects homepage and AI drawer text without causing button or panel overflow; covered in Task 6.

---

## File Structure

Backend authentication:

- Create `term-backend/termbase_app/models/auth.py` for the `User` model.
- Modify `term-backend/termbase_app/models/__init__.py` to export `User`.
- Create `term-backend/termbase_app/services/auth.py` for password hashing, token creation, token parsing, current-user lookup, admin guard, and demo-user seeding.
- Create `term-backend/termbase_app/routes/auth.py` for login and current-user endpoints.
- Modify `term-backend/termbase_app/routes/term_admin.py` to apply the admin guard.
- Modify `term-backend/termbase_app/__init__.py` to register auth routes.
- Create one new file under `term-backend/migrations/versions/` named with the next Alembic revision and suffix `_add_users.py` for the `kb_users` table.
- Modify or add backend tests in `term-backend/tests/test_auth_api.py` and `term-backend/tests/test_term_admin_api.py`.

Frontend authentication:

- Create `term-frontend/src/services/authApi.ts` for login/current-user requests.
- Create `term-frontend/src/context/AuthContext.tsx` for auth state and local storage persistence.
- Create `term-frontend/src/features/auth/LoginPage.tsx` and `term-frontend/src/features/auth/login.css`.
- Create `term-frontend/src/app/RequireAdmin.tsx` for protected management routing.
- Modify `term-frontend/src/app/routes.tsx` to add `/login` and wrap `/manage`.
- Modify `term-frontend/src/app/AppShell.tsx` for role-aware navigation and login/logout actions.
- Modify `term-frontend/src/utils/request.ts` to attach the auth token to Axios requests.
- Add or update tests in `term-frontend/src/app/AppShell.test.tsx`, `term-frontend/src/app/routes.test.tsx`, and `term-frontend/src/features/auth/LoginPage.test.tsx`.

Homepage and AI visual work:

- Modify `term-frontend/src/features/home/HomePage.tsx`, `ResearchFlow.tsx`, and `home.css`.
- Modify `term-frontend/src/components/ChatAI.tsx` and `term-frontend/src/styles/app.css`.
- Add or update tests in `term-frontend/src/features/home/HomePage.test.tsx` and `term-frontend/src/components/ChatAI.test.tsx`.

## Task 1: Backend User Model, Token Service, and Auth Routes

**Files:**
- Create: `term-backend/termbase_app/models/auth.py`
- Modify: `term-backend/termbase_app/models/__init__.py`
- Create: `term-backend/termbase_app/services/auth.py`
- Create: `term-backend/termbase_app/routes/auth.py`
- Modify: `term-backend/termbase_app/__init__.py`
- Create: `term-backend/tests/test_auth_api.py`
- Create: one new `term-backend/migrations/versions/*_add_users.py`

**Interfaces:**
- Produces: `User(id: int, username: str, password_hash: str, role: str, display_name: str, is_active: bool)`.
- Produces: `create_auth_token(user: User) -> str`.
- Produces: `load_user_from_token(token: str) -> User | None`.
- Produces: `seed_demo_users() -> None`.
- Produces: `POST /api/v1/auth/login` returning `{ code: 200, data: { token, user: { username, role, display_name } } }`.
- Produces: `GET /api/v1/auth/me` returning current user with a bearer token, or 401 without one.

- [ ] **Step 1: Write failing backend auth tests**

Add `term-backend/tests/test_auth_api.py` with tests:

```python
def test_login_returns_token_for_demo_admin()
def test_login_rejects_wrong_password()
def test_me_returns_current_user_from_bearer_token()
def test_me_rejects_missing_token()
```

Assert `admin / 123456` returns role `admin`, `user / 123456` returns role `user`, bad credentials return 401, and `/api/v1/auth/me` returns 401 without `Authorization`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests/test_auth_api.py -q`

Expected: FAIL because auth routes and model do not exist.

- [ ] **Step 3: Implement `User` and auth service**

Create `User` in `term-backend/termbase_app/models/auth.py` with table name `kb_users`, unique indexed `username`, `password_hash`, `role`, `display_name`, `is_active`, `created_at`, and `updated_at`.

Implement auth helpers in `term-backend/termbase_app/services/auth.py` using `werkzeug.security.generate_password_hash`, `check_password_hash`, and `itsdangerous.URLSafeTimedSerializer`. Read `AUTH_TOKEN_SECRET` from app config and fall back to `SECRET_KEY`; set token max age from `AUTH_TOKEN_MAX_AGE_SECONDS`.

- [ ] **Step 4: Implement auth routes and app registration**

Create `term-backend/termbase_app/routes/auth.py` with `POST /api/v1/auth/login` and `GET /api/v1/auth/me`. Register the blueprint in `create_app`.

Add config defaults in `term-backend/termbase_app/config.py`:

```python
SECRET_KEY = os.environ.get("SECRET_KEY", "termbase-dev-secret")
AUTH_TOKEN_SECRET = os.environ.get("AUTH_TOKEN_SECRET", SECRET_KEY)
AUTH_TOKEN_MAX_AGE_SECONDS = int(os.environ.get("AUTH_TOKEN_MAX_AGE_SECONDS", "86400"))
```

- [ ] **Step 5: Add migration and demo seed behavior**

Create a Flask-Migrate revision that creates `kb_users`. In tests, call `seed_demo_users()` from the auth route path when the users table is empty so demo accounts exist after `db.create_all()`. The seed function must upsert only `user` and `admin` and must not overwrite existing non-demo users.

- [ ] **Step 6: Run auth tests**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests/test_auth_api.py -q`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add term-backend/termbase_app term-backend/tests/test_auth_api.py term-backend/migrations/versions
git commit -m "feat: add lightweight auth"
```

## Task 2: Protect Admin Term APIs

**Files:**
- Modify: `term-backend/termbase_app/services/auth.py`
- Modify: `term-backend/termbase_app/routes/term_admin.py`
- Modify: `term-backend/tests/test_term_admin_api.py`

**Interfaces:**
- Consumes: `load_user_from_token(token: str) -> User | None`.
- Produces: `require_admin() -> User | tuple[Response, int]`.
- Produces: all `/api/v1/admin/terms*` endpoints requiring bearer token for admin role.

- [ ] **Step 1: Write failing admin authorization tests**

Update `test_term_admin_api.py` with helpers that login as admin and user. Add tests:

```python
def test_rejects_admin_term_list_without_token()
def test_rejects_admin_term_list_for_normal_user()
def test_allows_admin_to_list_terms()
def test_allows_admin_to_create_update_and_delete_terms()
```

Assert missing token is 401, normal user is 403, and admin can complete existing CRUD behavior.

- [ ] **Step 2: Run targeted tests to verify failure**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests/test_term_admin_api.py -q`

Expected: FAIL because endpoints are still public.

- [ ] **Step 3: Implement `require_admin()` and apply it**

In `services/auth.py`, implement `require_admin()` using the `Authorization: Bearer <token>` header. Return JSON `{ "code": 401, "message": "请先登录" }` for missing/invalid token and `{ "code": 403, "message": "需要管理员权限" }` for non-admin users.

In `routes/term_admin.py`, call `require_admin()` at the start of each route before reading or mutating terms.

- [ ] **Step 4: Run backend auth and admin tests**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests/test_auth_api.py tests/test_term_admin_api.py -q`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add term-backend/termbase_app/services/auth.py term-backend/termbase_app/routes/term_admin.py term-backend/tests/test_term_admin_api.py
git commit -m "feat: protect term management api"
```

## Task 3: Frontend Auth State, Login Page, and Protected Admin Route

**Files:**
- Create: `term-frontend/src/services/authApi.ts`
- Create: `term-frontend/src/context/AuthContext.tsx`
- Create: `term-frontend/src/features/auth/LoginPage.tsx`
- Create: `term-frontend/src/features/auth/login.css`
- Create: `term-frontend/src/app/RequireAdmin.tsx`
- Modify: `term-frontend/src/app/routes.tsx`
- Modify: `term-frontend/src/app/AppShell.tsx`
- Modify: `term-frontend/src/utils/request.ts`
- Test: `term-frontend/src/features/auth/LoginPage.test.tsx`
- Test: `term-frontend/src/app/AppShell.test.tsx`
- Test: `term-frontend/src/app/routes.test.tsx`

**Interfaces:**
- Consumes: `POST /api/v1/auth/login`.
- Consumes: `GET /api/v1/auth/me`.
- Produces: `AuthProvider`, `useAuth()`, `login(username: string, password: string)`, `logout()`, `token`, `user`, `status`.
- Produces: `getAuthToken() -> string | null` for Axios interceptor.
- Produces: `/login` page and admin-only `/manage` route.

- [ ] **Step 1: Write failing frontend auth tests**

Add tests asserting:

```typescript
it('logs in with demo credentials and shows the current user')
it('hides term management for normal users')
it('shows term management for admins')
it('redirects non-admin users away from /manage')
it('adds Authorization bearer token to admin API requests')
```

Use mocked auth API responses and localStorage key `termbase-auth`.

- [ ] **Step 2: Run tests to verify failure**

Run: `cd term-frontend; npm run test -- LoginPage AppShell routes knowledgeApi`

Expected: FAIL because auth context, login page, and route guard do not exist.

- [ ] **Step 3: Implement auth API and token plumbing**

Create `authApi.ts` with:

```typescript
export type AuthUser = { username: string; role: 'user' | 'admin'; display_name: string }
export type LoginResult = { token: string; user: AuthUser }
export async function loginRequest(username: string, password: string): Promise<LoginResult>
export async function getCurrentUser(): Promise<AuthUser>
```

Add a request interceptor in `utils/request.ts` that reads `getAuthToken()` and sets `Authorization: Bearer <token>` when present.

- [ ] **Step 4: Implement `AuthContext`**

Create `AuthProvider` with localStorage key `termbase-auth`. It should tolerate malformed stored JSON by clearing it and setting unauthenticated state. It should expose `isAdmin`.

- [ ] **Step 5: Implement login and route guard**

Create `LoginPage` with username/password fields, a submit button, and demo account hints. On successful login, navigate to the original `from` route or `/`.

Create `RequireAdmin` that redirects unauthenticated users to `/login` and non-admin users to `/`.

- [ ] **Step 6: Update routes and shell navigation**

Wrap routes in `AuthProvider`, add `/login`, wrap `/manage` in `RequireAdmin`, hide `/manage` unless `isAdmin`, and show login/logout action based on auth state.

- [ ] **Step 7: Run frontend auth tests**

Run: `cd term-frontend; npm run test -- LoginPage AppShell routes knowledgeApi`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add term-frontend/src/services term-frontend/src/context term-frontend/src/features/auth term-frontend/src/app term-frontend/src/utils/request.ts
git commit -m "feat: add frontend auth flow"
```

## Task 4: Rebuild Homepage as Public Digital Exhibition

**Files:**
- Modify: `term-frontend/src/features/home/HomePage.tsx`
- Modify: `term-frontend/src/features/home/ResearchFlow.tsx`
- Modify: `term-frontend/src/features/home/home.css`
- Modify: `term-frontend/src/features/home/HomePage.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` from Task 3 for admin-only management entrance.
- Produces: no hero search form.
- Produces: homepage sections for first-screen project intro, dynamic knowledge constellation, production loop, three-layer term system, Huai River culture preview, and capability entrances.

- [ ] **Step 1: Write failing homepage tests**

Update `HomePage.test.tsx` to assert:

```typescript
expect(screen.getByRole('heading', { name: '中国特色话语多语术语库工程化建设与研究' })).toBeInTheDocument()
expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
expect(screen.getByText('术语采集')).toBeInTheDocument()
expect(screen.getByText('AI 辅助表达')).toBeInTheDocument()
expect(screen.getByText('淮河文化示范专题')).toBeInTheDocument()
```

Add one test that admin users see the term management entrance and non-admin users do not.

- [ ] **Step 2: Run homepage tests to verify failure**

Run: `cd term-frontend; npm run test -- HomePage`

Expected: FAIL because current homepage still has search and old structure.

- [ ] **Step 3: Implement homepage content and component structure**

Replace the search-led hero with:

- `KnowledgeConstellation` local component in `HomePage.tsx`.
- `productionStages` data with exact labels: `术语采集`, `规范整理`, `AI 辅助表达`, `人工审校`, `多语发布`, `反馈修订`.
- Three-layer data with `本源层`, `核心层`, `拓展层`.
- Huai River preview linking to `/topics/huaihe-culture`.
- Capability entrances linking to `/discover`, `/lab`, `/topics`, `/about`, and `/manage` only for admins.

- [ ] **Step 4: Restyle homepage**

Rewrite `home.css` to use full-width exhibition sections, a dynamic knowledge constellation with CSS animations, layered-strata styling, and responsive layouts. Keep cards at 8px radius or less. Add large-text and child-mode selectors under the existing app-shell data attributes.

- [ ] **Step 5: Run homepage tests**

Run: `cd term-frontend; npm run test -- HomePage`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add term-frontend/src/features/home
git commit -m "feat: redesign homepage showcase"
```

## Task 5: Redesign AI Assistant as Research Drawer

**Files:**
- Modify: `term-frontend/src/components/ChatAI.tsx`
- Create: `term-frontend/src/components/ChatAI.test.tsx`
- Modify: `term-frontend/src/styles/app.css`

**Interfaces:**
- Consumes: existing `/api/chat/stream` streaming endpoint.
- Produces: closed floating entry labelled `文脉 AI`.
- Produces: open research drawer with title `文脉 AI 助手`.
- Produces: quick prompts `解释这个术语`, `换成儿童能懂的话`, `比较中英表达`, `生成传播文案`, `关联淮河文化专题`.

- [ ] **Step 1: Write failing AI drawer tests**

Create `ChatAI.test.tsx` asserting:

```typescript
expect(screen.getByRole('button', { name: /文脉 AI/ })).toBeInTheDocument()
await user.click(screen.getByRole('button', { name: /文脉 AI/ }))
expect(screen.getByRole('dialog', { name: '文脉 AI 助手' })).toBeInTheDocument()
expect(screen.getByRole('button', { name: '换成儿童能懂的话' })).toBeInTheDocument()
```

Also test that clicking a quick prompt fills or sends that prompt.

- [ ] **Step 2: Run AI tests to verify failure**

Run: `cd term-frontend; npm run test -- ChatAI`

Expected: FAIL because current component uses the old small chat panel.

- [ ] **Step 3: Implement AI drawer markup and behavior**

Refactor `ChatAI.tsx` to keep existing stream behavior but change layout to:

- Floating closed button.
- Right-side drawer on desktop.
- Mobile bottom/full-height panel.
- Mode chips and quick prompts.
- Accessible dialog labelling and close button.

- [ ] **Step 4: Restyle AI assistant**

Move generic chat-box styles into `app.css` with classes for floating entry, drawer shell, note-like messages, prompt chips, child-mode copy tone, and large-text support.

- [ ] **Step 5: Run AI tests**

Run: `cd term-frontend; npm run test -- ChatAI`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add term-frontend/src/components/ChatAI.tsx term-frontend/src/components/ChatAI.test.tsx term-frontend/src/styles/app.css
git commit -m "feat: redesign ai assistant drawer"
```

## Task 6: Whole-Feature Verification and Visual QA

**Files:**
- Modify only if verification finds defects in files touched by Tasks 1-5.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: verified build with backend auth protection, frontend role handling, public homepage, and AI drawer.

- [ ] **Step 1: Run full backend tests**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest -q`

Expected: all tests pass.

- [ ] **Step 2: Run full frontend tests**

Run: `cd term-frontend; npm run test`

Expected: all tests pass.

- [ ] **Step 3: Run lint and build**

Run: `cd term-frontend; npm run lint`

Expected: no new errors. Existing warnings must be documented if unchanged.

Run: `cd term-frontend; npm run build`

Expected: build succeeds.

- [ ] **Step 4: Run database migration smoke check**

Run: `cd term-backend; .\venv\Scripts\python.exe -m flask --app termbase_app db upgrade`

Expected: migration applies without errors on the configured development database or a test database.

- [ ] **Step 5: Manual browser verification**

Start backend and frontend. Verify:

- `/` desktop and mobile show no searchbox in hero.
- `/login` logs in as `user / 123456` and `admin / 123456`.
- Normal user does not see `/manage` in navigation and cannot open it.
- Admin sees `/manage` and can load the management page.
- Direct normal-user admin API call returns 403.
- AI assistant opens as a drawer on desktop and does not overlap mobile content.
- Child mode and large-text mode visibly affect homepage and AI drawer without overflow.

- [ ] **Step 6: Commit verification fixes**

If verification required fixes:

```bash
git status --short
git commit -m "fix: polish home auth ai redesign"
```

Stage only the files shown by `git status --short` that were changed to fix verification defects, then run the commit command.

If no fixes were needed, do not create an empty commit.

