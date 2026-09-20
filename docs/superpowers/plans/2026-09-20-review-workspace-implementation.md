# Review Case Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent human-review workspace that saves expression-lab reports as immutable AI snapshots, records append-only human revisions, enforces review-state transitions, and exports research data.

**Architecture:** Add a focused `review_workspace` backend domain with Pydantic contracts, SQLAlchemy models, transactional services and a `/api/v1/review-cases` blueprint. The frontend extends the expression report with an explicit save action and replaces the `/workspace` placeholder with a list/detail review application. AI snapshots remain immutable while human revisions and state events are append-only.

**Tech Stack:** Python 3.9+, Flask, SQLAlchemy, Flask-Migrate/Alembic, Pydantic 2, React 19, TypeScript 6, Vite, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-20-review-workspace-design.md`

## Global Constraints

- First release has no login; `reviewer_name` is a research field, not an authenticated identity.
- AI snapshots, revisions and state events are never updated or deleted through public APIs.
- Target language remains `en`; task enums must reuse expression-lab contracts exactly.
- Cases use unguessable `public_id` values and unique `source_request_id` idempotency keys.
- All writes use database transactions; revision conflicts and illegal transitions return HTTP 409.
- No endpoint logs full source text, AI snapshots, final expressions or review notes.
- CSV exports use UTF-8 BOM and neutralize cells beginning with `=`, `+`, `-` or `@`.
- Existing public terminology APIs, expression-lab API and legacy read routes must remain compatible.

---

### Task 1: Define review contracts, models and migration

**Files:**
- Create: `term-backend/termbase_app/review_workspace/__init__.py`
- Create: `term-backend/termbase_app/review_workspace/contracts.py`
- Create: `term-backend/termbase_app/models/review.py`
- Modify: `term-backend/termbase_app/models/__init__.py`
- Modify: `term-backend/termbase_app/models/knowledge.py`
- Create: `term-backend/migrations/versions/9f4c2a7b1d30_add_review_workspace.py`
- Create: `term-backend/tests/test_review_workspace_models.py`
- Create: `term-backend/tests/test_review_workspace_contracts.py`

**Interfaces:**
- Consumes: `ExpressionTask`, `ValidatedExpressionReport`, task enum values and existing `kb_terms`.
- Produces: `ReviewCase`, `ReviewRevision`, `ReviewCaseTerm`, `ReviewEvent`, `CreateReviewCase`, `CreateRevision`, `TransitionCase`, `IssueTag`, `ReviewStatus`, `TransitionAction`.

- [ ] **Step 1: Write contract tests**

Test exact enums, whitespace normalization, length limits, duplicate issue-tag removal, `review_status='ai_unreviewed'`, and rejection of extra fields. Build a valid `CreateReviewCase` fixture containing the same public analysis shape returned by `/api/v1/expression-lab/analyze`.

```python
payload = valid_create_case_payload()
case = CreateReviewCase.model_validate(payload)
assert case.analysis.review_status == "ai_unreviewed"
assert case.term_ids == [7]

with pytest.raises(ValidationError):
    CreateRevision.model_validate({
        "expected_revision_number": 1,
        "final_expression": "",
        "review_notes": "",
        "reviewer_name": "",
        "issue_tags": ["invented_tag"],
    })
```

- [ ] **Step 2: Run contract tests and confirm red**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests\test_review_workspace_contracts.py -q`

Expected: collection fails because `review_workspace.contracts` does not exist.

- [ ] **Step 3: Implement contracts**

Define Python 3.9-compatible string enums:

```python
class ReviewStatus(StringEnum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    ARCHIVED = "archived"

class IssueTag(StringEnum):
    LITERAL_TRANSLATION = "literal_translation"
    TERMINOLOGY_INCONSISTENCY = "terminology_inconsistency"
    CULTURAL_MISREADING = "cultural_misreading"
    REGISTER_MISMATCH = "register_mismatch"
    AMBIGUITY = "ambiguity"
    UNNATURAL_ENGLISH = "unnatural_english"
    CITATION_GAP = "citation_gap"
    OTHER = "other"
```

`CreateReviewCase` contains `title`, `term_ids` and a strict `SavedExpressionAnalysis`; the saved analysis must contain `request_id`, input summary, knowledge summary, validated report, `generated_at`, `review_status` and warnings. `CreateRevision` and `TransitionCase` implement the fields and limits from the spec.

- [ ] **Step 4: Write model and migration tests**

Assert relationships, unique `(case_id, revision_number)`, unique `source_request_id`, cascade deletion of owned rows only, append-only entities' columns, and migration upgrade/downgrade table names. Assert existing `kb_terms` rows survive migration unchanged.

- [ ] **Step 5: Run model tests and confirm red**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests\test_review_workspace_models.py -q`

Expected: import fails because review models do not exist.

- [ ] **Step 6: Implement SQLAlchemy models**

Use tables `review_cases`, `review_revisions`, `review_case_terms`, `review_events`. Store `ai_snapshot` and `issue_tags` as JSON. Use UUID4 hex for `public_id`, database uniqueness for idempotency, UTC/server timestamps, and ordered relationships. Add `review_cases` relationship to `Term` without changing existing term behavior.

- [ ] **Step 7: Implement the Alembic migration**

Set `down_revision = '7b8f4e2a1c6d'`. Create the four tables, foreign keys and indexes explicitly. Downgrade drops only review workspace tables in reverse dependency order.

- [ ] **Step 8: Run focused and full backend tests**

Run:

```powershell
cd term-backend
.\venv\Scripts\python.exe -m pytest tests\test_review_workspace_contracts.py tests\test_review_workspace_models.py -q
.\venv\Scripts\python.exe -m pytest -q
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

```powershell
git add term-backend/termbase_app/review_workspace term-backend/termbase_app/models term-backend/migrations/versions/9f4c2a7b1d30_add_review_workspace.py term-backend/tests/test_review_workspace_contracts.py term-backend/tests/test_review_workspace_models.py
git commit -m "feat: model review case history"
```

---

### Task 2: Implement transactional review services and state machine

**Files:**
- Create: `term-backend/termbase_app/review_workspace/service.py`
- Create: `term-backend/termbase_app/review_workspace/serializers.py`
- Modify: `term-backend/termbase_app/review_workspace/__init__.py`
- Create: `term-backend/tests/test_review_workspace_service.py`

**Interfaces:**
- Consumes: Task 1 contracts/models and published `Term` rows.
- Produces: `create_case(command) -> (ReviewCase, bool)`, `get_case(public_id)`, `list_cases(filters)`, `add_revision(public_id, command)`, `transition_case(public_id, command)`, `serialize_case_summary`, `serialize_case_detail`, and domain errors with stable HTTP status codes.

- [ ] **Step 1: Write creation and idempotency tests**

Cover one-transaction creation of case, ordered terms, initial revision and created event. Repeating the same `source_request_id` must return the existing case with `created=False`. Missing or unpublished terms must fail without partial rows.

- [ ] **Step 2: Write revision and state-machine tests**

Cover append-only revision numbering, stale `expected_revision_number`, archived read-only behavior and every allowed/forbidden transition in the specification. Verify failed writes leave row counts unchanged.

```python
case, _ = create_case(command)
revision = add_revision(case.public_id, CreateRevision(
    expected_revision_number=1,
    final_expression="Human-reviewed expression",
    review_notes="Adjusted register",
    reviewer_name="Reviewer A",
    issue_tags=[IssueTag.REGISTER_MISMATCH],
))
assert revision.revision_number == 2

with pytest.raises(RevisionConflict):
    add_revision(case.public_id, stale_command)
```

- [ ] **Step 3: Run service tests and confirm red**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests\test_review_workspace_service.py -q`

Expected: service imports fail.

- [ ] **Step 4: Implement creation and serialization**

Revalidate selected terms, ensure all snapshot `term_usage.term_id` values are selected, copy only `model_dump(mode='json')` output into `ai_snapshot`, and handle `IntegrityError` for `source_request_id` as an idempotent lookup. Do not accept client-provided status, term names, timestamps or source metadata outside the validated snapshot.

- [ ] **Step 5: Implement append-only revisions**

Use a transaction and an atomic current-version check. Insert `current_revision_number + 1`; never update an existing revision. Allow revisions in `draft`, `pending_review` and `approved`; reject `archived`.

- [ ] **Step 6: Implement the explicit state-transition table**

```python
TRANSITIONS = {
    (ReviewStatus.DRAFT, TransitionAction.SUBMIT): ReviewStatus.PENDING_REVIEW,
    (ReviewStatus.PENDING_REVIEW, TransitionAction.APPROVE): ReviewStatus.APPROVED,
    (ReviewStatus.PENDING_REVIEW, TransitionAction.RETURN): ReviewStatus.DRAFT,
    (ReviewStatus.APPROVED, TransitionAction.REOPEN): ReviewStatus.DRAFT,
    (ReviewStatus.APPROVED, TransitionAction.ARCHIVE): ReviewStatus.ARCHIVED,
    (ReviewStatus.ARCHIVED, TransitionAction.RESTORE): ReviewStatus.APPROVED,
}
```

Validate reviewer/note requirements, update status and add `ReviewEvent` in one transaction.

- [ ] **Step 7: Implement list filters**

Support normalized pagination plus `status`, `term_id`, case-insensitive reviewer, `issue_tag` and `q`. Join only the current revision for summary display and use `distinct()` when term/tag filters introduce joins.

- [ ] **Step 8: Run regression and commit**

```powershell
cd term-backend
.\venv\Scripts\python.exe -m pytest tests\test_review_workspace_service.py -q
.\venv\Scripts\python.exe -m pytest -q
git add term-backend/termbase_app/review_workspace term-backend/tests/test_review_workspace_service.py
git commit -m "feat: add review case workflow service"
```

---

### Task 3: Expose review APIs and safe research exports

**Files:**
- Create: `term-backend/termbase_app/routes/review_workspace.py`
- Create: `term-backend/termbase_app/review_workspace/export.py`
- Modify: `term-backend/termbase_app/__init__.py`
- Modify: `term-backend/termbase_app/config.py`
- Create: `term-backend/tests/test_review_workspace_api.py`
- Create: `term-backend/tests/test_review_workspace_export.py`

**Interfaces:**
- Consumes: Task 2 services/serializers.
- Produces: the six `/api/v1/review-cases` endpoints and downloadable JSON/CSV responses.

- [ ] **Step 1: Write API envelope tests**

Cover 201 create, 200 idempotent repeat, list filters/pagination, detail, revision create, transitions, 400 invalid JSON/fields, 404 missing case/term, 409 conflict/transition, 413 body limit and preservation of public messages.

- [ ] **Step 2: Write export security tests**

Create data containing Chinese, commas, newlines and `=HYPERLINK(...)`. Assert JSON has validated public fields only. Assert CSV starts with UTF-8 BOM and dangerous cells are prefixed with `'`.

- [ ] **Step 3: Run API/export tests and confirm red**

Run: `cd term-backend; .\venv\Scripts\python.exe -m pytest tests\test_review_workspace_api.py tests\test_review_workspace_export.py -q`

Expected: route returns 404 because blueprint is absent.

- [ ] **Step 4: Implement blueprint and request guards**

Use the bounded raw-body JSON parsing pattern already used by `expression_lab.py`, configured with `REVIEW_WORKSPACE_MAX_BODY_BYTES=131072`. Convert Pydantic errors to stable field messages. Unknown errors log only `request_id`, `case_public_id` when available, and exception type.

- [ ] **Step 5: Implement JSON and CSV export**

`export_cases(format, filters)` reuses list filtering. JSON returns a downloadable UTF-8 document. CSV uses `csv.DictWriter`, `utf-8-sig`, stable columns and:

```python
def safe_csv_cell(value: str) -> str:
    return "'" + value if value.startswith(("=", "+", "-", "@")) else value
```

- [ ] **Step 6: Register blueprint and run regressions**

```powershell
cd term-backend
.\venv\Scripts\python.exe -m pytest tests\test_review_workspace_api.py tests\test_review_workspace_export.py -q
.\venv\Scripts\python.exe -m pytest -q
.\venv\Scripts\python.exe -m compileall -q app.py termbase_app
```

- [ ] **Step 7: Commit**

```powershell
git add term-backend/termbase_app/routes/review_workspace.py term-backend/termbase_app/review_workspace/export.py term-backend/termbase_app/__init__.py term-backend/termbase_app/config.py term-backend/tests/test_review_workspace_api.py term-backend/tests/test_review_workspace_export.py
git commit -m "feat: expose review workspace API"
```

---

### Task 4: Add frontend contracts, client and expression-lab save action

**Files:**
- Create: `term-frontend/src/types/reviewWorkspace.ts`
- Create: `term-frontend/src/services/reviewWorkspaceApi.ts`
- Create: `term-frontend/src/services/reviewWorkspaceApi.test.ts`
- Create: `term-frontend/src/features/expression-lab/SaveReviewCaseDialog.tsx`
- Create: `term-frontend/src/features/expression-lab/SaveReviewCaseDialog.test.tsx`
- Modify: `term-frontend/src/features/expression-lab/ExpressionReport.tsx`
- Modify: `term-frontend/src/features/expression-lab/ExpressionLabPage.tsx`
- Modify: `term-frontend/src/features/expression-lab/expression-lab.css`

**Interfaces:**
- Consumes: Task 3 API envelopes and existing `ExpressionAnalysis`/selected terms.
- Produces: typed case API functions and a save workflow returning `public_id`, `created` and workspace link.

- [ ] **Step 1: Define exact TypeScript contracts**

Mirror backend enum literals and response fields. Define `ReviewCaseSummary`, `ReviewCaseDetail`, `ReviewRevision`, `ReviewEvent`, `ReviewCaseQuery`, `CreateReviewCaseInput`, `CreateRevisionInput` and `TransitionCaseInput`.

- [ ] **Step 2: Write client tests**

Mock `request` at its boundary and assert URL, payload, filter mapping (`pageSize` to `page_size`) and response unwrapping for create/list/detail/revision/transition/export URL construction.

- [ ] **Step 3: Implement and verify the client**

Run: `npm test -- --run src/services/reviewWorkspaceApi.test.ts`. Implement functions only after the red run; keep existing Axios timeout defaults because no AI call occurs.

- [ ] **Step 4: Write save-dialog tests**

Assert title validation, selected term IDs, exact analysis snapshot, disabled duplicate submit, success link, idempotent existing-case copy and failure preserving the dialog/report.

- [ ] **Step 5: Implement save dialog and report action**

`ExpressionLabPage` passes selected IDs and current analysis to `ExpressionReport`. The report exposes “保存到研究工作台”; the dialog submits once and displays `/workspace?case=<public_id>` on success. It never mutates the analysis result.

- [ ] **Step 6: Run frontend regressions and commit**

```powershell
cd term-frontend
npm test -- --run src/services/reviewWorkspaceApi.test.ts src/features/expression-lab/SaveReviewCaseDialog.test.tsx src/features/expression-lab/ExpressionReport.test.tsx
npm test -- --run
npm run build
git add src/types/reviewWorkspace.ts src/services/reviewWorkspaceApi.ts src/services/reviewWorkspaceApi.test.ts src/features/expression-lab
git commit -m "feat: save expression reports as review cases"
```

---

### Task 5: Build workspace queue, filters and overview

**Files:**
- Create: `term-frontend/src/features/review-workspace/ReviewWorkspacePage.tsx`
- Create: `term-frontend/src/features/review-workspace/ReviewWorkspacePage.test.tsx`
- Create: `term-frontend/src/features/review-workspace/WorkspaceOverview.tsx`
- Create: `term-frontend/src/features/review-workspace/CaseFilters.tsx`
- Create: `term-frontend/src/features/review-workspace/CaseQueue.tsx`
- Create: `term-frontend/src/features/review-workspace/review-workspace.css`
- Modify: `term-frontend/src/app/routes.tsx`

**Interfaces:**
- Consumes: Task 4 list/detail clients and URL `case` query parameter.
- Produces: real `/workspace` route with filterable paginated queue, overview and selected-case loading state.

- [ ] **Step 1: Write route/list/filter tests**

Mount `AppRoutes` at `/workspace`. Assert placeholder removal, list loading, overview counts, URL-backed filters, pagination, empty/error/retry states, safe stale-response handling and deep link selection from `?case=`.

- [ ] **Step 2: Run the page test and confirm red**

Run: `npm test -- --run src/features/review-workspace/ReviewWorkspacePage.test.tsx`

Expected: route still renders staged placeholder.

- [ ] **Step 3: Implement overview and URL-backed filters**

Keep filter values in `URLSearchParams` so refresh/back/forward restore the queue. Use explicit search submission for `q`; selects update status/tag immediately. Overview counts come from API metadata, never fabricated client totals.

- [ ] **Step 4: Implement case queue and page state**

Use semantic buttons/links, visible status text and `aria-current` for selected case. Keep existing queue visible while refreshing. Ignore stale list/detail responses with request sequence refs.

- [ ] **Step 5: Replace route placeholder and style responsive layout**

Desktop uses queue/detail columns; mobile shows queue first and navigates focus to detail after selection. Include one page `h1`, visible labels, `aria-live` loading text and `role=alert` only for failures.

- [ ] **Step 6: Run regressions and commit**

```powershell
cd term-frontend
npm test -- --run src/features/review-workspace/ReviewWorkspacePage.test.tsx
npm test -- --run
npm run build
git add src/features/review-workspace src/app/routes.tsx
git commit -m "feat: build review case workspace queue"
```

---

### Task 6: Add review editor, revision history and state actions

**Files:**
- Create: `term-frontend/src/features/review-workspace/CaseReviewPanel.tsx`
- Create: `term-frontend/src/features/review-workspace/CaseReviewPanel.test.tsx`
- Create: `term-frontend/src/features/review-workspace/RevisionEditor.tsx`
- Create: `term-frontend/src/features/review-workspace/RevisionHistory.tsx`
- Create: `term-frontend/src/features/review-workspace/StateActions.tsx`
- Modify: `term-frontend/src/features/review-workspace/ReviewWorkspacePage.tsx`
- Modify: `term-frontend/src/features/review-workspace/review-workspace.css`

**Interfaces:**
- Consumes: Task 4 detail/revision/transition clients and Task 5 selected case.
- Produces: AI/human comparison, append-only revision editor, history viewer and legal state transitions.

- [ ] **Step 1: Write review-panel tests**

Assert AI snapshot is read-only, current final expression is editable, fixed issue tags map to Chinese, revision history is selectable, archived cases disable editing, and model/user HTML remains text.

- [ ] **Step 2: Write revision/transition interaction tests**

Assert exact payload with `expected_revision_number`; successful revision refreshes detail/list. Test action visibility for every state. Test 409 conflict shows “案例已有新版本，请刷新后再编辑” and does not clear typed content.

- [ ] **Step 3: Run tests and confirm red**

Run: `npm test -- --run src/features/review-workspace/CaseReviewPanel.test.tsx`

Expected: components do not exist.

- [ ] **Step 4: Implement comparison and editor**

Render AI recommended expression and current human final expression side-by-side. Initialize form from current revision only when selected case changes, not after every render. Validate final expression and reviewer before calling the API.

- [ ] **Step 5: Implement revision history and state actions**

History renders revision number, reviewer, tags, notes and timestamp. `StateActions` derives permitted buttons from the current state; it never offers arbitrary target statuses. Return/reopen require a note dialog.

- [ ] **Step 6: Integrate refresh without losing queue filters**

After successful writes, refetch selected detail and list summary while preserving URL filters. On stale-write 409, retain form fields and offer a separate refresh button.

- [ ] **Step 7: Run full frontend verification and commit**

```powershell
cd term-frontend
npm test -- --run src/features/review-workspace/CaseReviewPanel.test.tsx src/features/review-workspace/ReviewWorkspacePage.test.tsx
npm test -- --run
npm run lint
npm run build
git add src/features/review-workspace
git commit -m "feat: add human review and case history"
```

---

### Task 7: Add exports, documentation, migration run and final acceptance

**Files:**
- Modify: `term-frontend/src/features/review-workspace/ReviewWorkspacePage.tsx`
- Create: `term-frontend/src/features/review-workspace/WorkspaceExportActions.tsx`
- Create: `term-frontend/src/features/review-workspace/WorkspaceExportActions.test.tsx`
- Modify: `README.md`
- Modify: `API.md`
- Create: `docs/review-workspace-guide.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: all Tasks 1—6.
- Produces: filter-aware downloads, repeatable migration/setup instructions and final verification evidence.

- [ ] **Step 1: Write export action tests**

Assert JSON/CSV download URLs include active filters and no write request occurs. Use server `Content-Disposition` where available and safe fallback filenames containing only UTC time.

- [ ] **Step 2: Implement export actions**

Use the API client to request blobs; create/revoke object URLs and preserve current filters. Buttons expose loading/error states and never navigate away from unsaved editor text.

- [ ] **Step 3: Update documentation**

Document all case endpoints, state transitions, 409 behavior, local-only no-auth boundary, migration command, JSON/CSV semantics and reviewer-name limitations. Add `REVIEW_WORKSPACE_MAX_BODY_BYTES=131072` to `.env.example`; never include real credentials.

- [ ] **Step 4: Run database migration**

Back up the database, then run:

```powershell
cd term-backend
$env:FLASK_APP='termbase_app:create_app'
.\venv\Scripts\flask.exe db upgrade
.\venv\Scripts\flask.exe db current
```

Expected: head is `9f4c2a7b1d30`; existing knowledge row counts remain unchanged.

- [ ] **Step 5: Run complete backend verification**

```powershell
cd term-backend
.\venv\Scripts\python.exe -m pytest -q
.\venv\Scripts\python.exe -m compileall -q app.py termbase_app
```

- [ ] **Step 6: Run complete frontend verification**

```powershell
cd term-frontend
npm test -- --run
npm run lint
npm run build
```

Existing legacy-page lint warnings must be distinguished from new errors; this feature adds no lint errors.

- [ ] **Step 7: Run security and repository checks**

```powershell
git diff --check
$matches = git ls-files | ForEach-Object {
  if (Test-Path -LiteralPath $_) {
    Select-String -LiteralPath $_ -Pattern 'sk-[A-Za-z0-9]{20,}' -AllMatches -ErrorAction SilentlyContinue
  }
}
if ($matches) { $matches; exit 1 }
git check-ignore -v term-backend/.env
```

- [ ] **Step 8: Perform end-to-end acceptance**

Generate one real expression report, save it, add a human revision, submit, approve, archive, restore and export it. Record only HTTP statuses, public case ID, revision/status values, row-count invariants and file validity; do not print source/report/note content.

- [ ] **Step 9: Commit**

```powershell
git add .env.example README.md API.md docs/review-workspace-guide.md term-frontend/src/features/review-workspace
git commit -m "docs: complete review workspace workflow"
```

---

## Spec Coverage Check

| Spec requirement | Plan task |
|---|---|
| Immutable AI snapshot and append-only revisions/events | Tasks 1—2 |
| Published ordered term associations | Tasks 1—2 |
| Idempotent save and no delete API | Tasks 2—3 |
| Exact status machine and optimistic concurrency | Tasks 2—3, 6 |
| List filters, overview, list/detail workspace | Tasks 2—3, 5 |
| AI/human comparison and revision history | Task 6 |
| Expression-lab save entry | Task 4 |
| Safe JSON/CSV research export | Tasks 3, 7 |
| No-auth controlled-network limitation | Tasks 1, 7 |
| Request bounds, stable errors and private logs | Tasks 3, 7 |
| Migration safety and existing API compatibility | Tasks 1, 7 |
| Backend/frontend/security/end-to-end verification | Task 7 |
