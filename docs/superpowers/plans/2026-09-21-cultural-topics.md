# Cultural Topics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the cultural-topics placeholder with a data-driven topic index and reusable topic detail page, using Huaihe culture as the first published topic.

**Architecture:** A focused Flask query/serialization service exposes published topics and safe topic items through two read-only endpoints. React containers consume typed DTOs, own loading/error states, and render small presentational components that link topic entries to the existing term profiles.

**Tech Stack:** Python 3, Flask, Flask-SQLAlchemy, unittest, React 19, TypeScript, React Router, Axios, Vitest, Testing Library, CSS.

**Spec:** `docs/superpowers/specs/2026-09-21-cultural-topics-design.md`

## Global Constraints

- Reuse the existing `Topic` and `TopicItem` tables; do not add a database migration.
- Public endpoints return only published topics and published linked terms.
- Raw legacy payloads are never returned wholesale; expose only an explicit field allowlist.
- The first release includes a general topic framework and Huaihe culture as its first instance.
- Do not add a CMS, AI-generated topic copy, authentication, comments, maps, timelines, or graph visualization.
- Preserve the existing paper, indigo, and vermilion editorial visual language.
- Child mode changes labels and guidance only; it does not rewrite stored research data.
- Large-text mode continues to use the existing global reading preference mechanism.
- Run focused tests during implementation and the complete verification suite once at the end.

---

### Task 1: Published Topic API

**Files:**
- Create: `term-backend/termbase_app/services/public_topics.py`
- Create: `term-backend/termbase_app/routes/public_topics.py`
- Create: `term-backend/tests/test_public_topics_api.py`
- Modify: `term-backend/termbase_app/__init__.py`

**Interfaces:**
- Consumes: existing `Topic`, `TopicItem`, `Term`, `Translation`, and `Language` models.
- Produces: `list_published_topics()`, `get_published_topic(slug: str)`, `serialize_topic_summary(topic)`, and `serialize_topic_detail(topic)`.
- Produces: `GET /api/topics` with `{code: 200, data: TopicSummary[]}`.
- Produces: `GET /api/topics/<slug>` with `{code: 200, data: TopicDetail}` or `{code: 404, message: string}`.

- [ ] **Step 1: Write failing API contract tests**

Create fixtures for a published topic, draft topic, published linked term, draft linked term, and a non-term `person` item. Assert list filtering/statistics, detail ordering, draft-term exclusion, payload allowlisting, and 404 behavior:

```python
def test_list_returns_only_published_topics_with_counts(self):
    response = self.client.get("/api/topics")
    self.assertEqual(response.status_code, 200)
    self.assertEqual(response.get_json()["data"], [{
        "slug": "huaihe-culture",
        "title": "淮河文化",
        "summary": "淮河流域文化专题",
        "item_count": 2,
        "term_count": 1,
        "entry_type_counts": {"person": 1, "term": 1},
    }])

def test_detail_excludes_draft_terms_and_private_payload_fields(self):
    detail = self.client.get("/api/topics/huaihe-culture").get_json()["data"]
    self.assertEqual([item["entry_type"] for item in detail["items"]], ["term", "person"])
    self.assertEqual(detail["items"][0]["term"]["preferred_name_zh"], "淮河文化")
    self.assertEqual(detail["items"][0]["term"]["recommended_translation"], "Huaihe culture")
    self.assertEqual(detail["items"][1]["fields"], {"分类": "人物", "百度链接": "https://example.test/person"})
    self.assertNotIn("internal_note", detail["items"][1]["fields"])

def test_detail_returns_404_for_missing_or_draft_topic(self):
    for slug in ("draft-topic", "missing"):
        response = self.client.get(f"/api/topics/{slug}")
        self.assertEqual(response.status_code, 404)
```

- [ ] **Step 2: Run the new tests and confirm the endpoints are absent**

Run: `cd term-backend; .\venv\Scripts\python.exe -m unittest tests.test_public_topics_api -v`

Expected: FAIL because `/api/topics` and `/api/topics/<slug>` return 404.

- [ ] **Step 3: Implement the query and safe serialization service**

Use eager loading for `Topic.items`, `TopicItem.term`, term translations, and translation languages. Keep payload fields explicit:

```python
PUBLIC_PAYLOAD_FIELDS = {
    "person": ("分类", "百度链接"),
    "herb": ("中文品名", "官方译法（英文）", "法语译法"),
}
ENTRY_TYPE_ORDER = {"term": 0, "person": 1, "place": 2, "culture": 3, "herb": 4}

def public_items(topic):
    items = [item for item in topic.items if item.term is None or item.term.status == "published"]
    return sorted(items, key=lambda item: (ENTRY_TYPE_ORDER.get(item.entry_type, 99), item.id))

def serialize_public_fields(item):
    allowed = PUBLIC_PAYLOAD_FIELDS.get(item.entry_type, ())
    return {key: item.payload[key] for key in allowed if item.payload.get(key) not in (None, "")}
```

For term entries, serialize a nested `term` object with `id`, `preferred_name_zh`, `definition_zh`, `term_level`, `culture_category`, and the first recommended translation text. For non-term entries, serialize `fields` from the allowlist.

- [ ] **Step 4: Add and register the topic blueprint**

Create a blueprint with the two exact paths, return the same `code/data/message` envelope used by public terms, and register it in `create_app`:

```python
@bp.get("/api/topics")
def list_topics():
    return jsonify({"code": 200, "data": [serialize_topic_summary(topic) for topic in list_published_topics()]})

@bp.get("/api/topics/<string:slug>")
def get_topic(slug):
    topic = get_published_topic(slug)
    if topic is None:
        return jsonify({"code": 404, "message": "专题不存在或尚未发布"}), 404
    return jsonify({"code": 200, "data": serialize_topic_detail(topic)})
```

- [ ] **Step 5: Run the focused backend tests**

Run: `cd term-backend; .\venv\Scripts\python.exe -m unittest tests.test_public_topics_api -v`

Expected: all public-topic tests PASS.

- [ ] **Step 6: Commit the backend API**

```powershell
git add term-backend/termbase_app/services/public_topics.py term-backend/termbase_app/routes/public_topics.py term-backend/termbase_app/__init__.py term-backend/tests/test_public_topics_api.py
git commit -m "feat: add public cultural topic API"
```

### Task 2: Huaihe Topic Metadata

**Files:**
- Modify: `term-backend/termbase_app/services/legacy_import.py`
- Modify: `term-backend/tests/test_legacy_import.py`

**Interfaces:**
- Consumes: `_get_huaihe_topic(session)` from the existing legacy import service.
- Produces: `HUAIHE_TOPIC_SUMMARY` and import behavior that fills a missing summary without overwriting authored content.

- [ ] **Step 1: Add failing import tests for the default summary**

```python
def test_import_adds_huaihe_summary_when_missing(self):
    import_legacy_knowledge(db.session)
    topic = db.session.query(Topic).filter_by(slug="huaihe-culture").one()
    self.assertEqual(topic.summary, HUAIHE_TOPIC_SUMMARY)

def test_import_preserves_existing_huaihe_summary(self):
    db.session.add(Topic(slug="huaihe-culture", title="淮河文化", summary="人工撰写简介", status="draft"))
    db.session.commit()
    import_legacy_knowledge(db.session)
    topic = db.session.query(Topic).filter_by(slug="huaihe-culture").one()
    self.assertEqual(topic.summary, "人工撰写简介")
```

- [ ] **Step 2: Run the two tests and confirm the missing-summary assertion fails**

Run: `cd term-backend; .\venv\Scripts\python.exe -m unittest tests.test_legacy_import.LegacyImportTests.test_import_adds_huaihe_summary_when_missing tests.test_legacy_import.LegacyImportTests.test_import_preserves_existing_huaihe_summary -v`

Expected: first test FAILS because `summary` is `None`; preservation test passes or exposes the same missing branch.

- [ ] **Step 3: Fill only an empty summary**

```python
HUAIHE_TOPIC_SUMMARY = "以淮河流域术语、历史人物与本草知识为线索，呈现地域文化的多语表达与传播语境。"

def _get_huaihe_topic(session):
    topic = session.query(Topic).filter_by(slug="huaihe-culture").one_or_none()
    if topic is None:
        topic = Topic(slug="huaihe-culture", title="淮河文化", summary=HUAIHE_TOPIC_SUMMARY, status="published")
        session.add(topic)
        session.flush()
    else:
        topic.status = "published"
        if not topic.summary:
            topic.summary = HUAIHE_TOPIC_SUMMARY
    return topic
```

- [ ] **Step 4: Run focused legacy import tests**

Run: `cd term-backend; .\venv\Scripts\python.exe -m unittest tests.test_legacy_import -v`

Expected: all legacy import tests PASS.

- [ ] **Step 5: Commit topic metadata behavior**

```powershell
git add term-backend/termbase_app/services/legacy_import.py term-backend/tests/test_legacy_import.py
git commit -m "feat: seed Huaihe topic metadata"
```

### Task 3: Frontend Topic Contracts and API Client

**Files:**
- Modify: `term-frontend/src/types/knowledge.ts`
- Modify: `term-frontend/src/services/knowledgeApi.ts`
- Modify: `term-frontend/src/services/knowledgeApi.test.ts`

**Interfaces:**
- Consumes: the two JSON envelopes from Task 1.
- Produces: `TopicSummary`, `TopicTermEntry`, `TopicContentEntry`, `TopicEntry`, and `PublicTopicDetail` types.
- Produces: `listTopics(): Promise<TopicSummary[]>` and `getTopic(slug: string): Promise<PublicTopicDetail>`.

- [ ] **Step 1: Write failing client tests**

```typescript
it('loads published topic summaries', async () => {
  const adapter = vi.fn(successAdapter({ code: 200, data: [topicSummary] }))
  request.defaults.adapter = adapter
  await expect(listTopics()).resolves.toEqual([topicSummary])
  expect(request.getUri(adapter.mock.calls[0][0])).toBe('/api/topics')
})

it('encodes a topic slug when loading detail', async () => {
  const adapter = vi.fn(successAdapter({ code: 200, data: topicDetail }))
  request.defaults.adapter = adapter
  await expect(getTopic('huaihe culture')).resolves.toEqual(topicDetail)
  expect(request.getUri(adapter.mock.calls[0][0])).toBe('/api/topics/huaihe%20culture')
})
```

- [ ] **Step 2: Run the client test and confirm exports are missing**

Run: `cd term-frontend; npm test -- src/services/knowledgeApi.test.ts`

Expected: FAIL because `listTopics` and `getTopic` are not exported.

- [ ] **Step 3: Add exact DTOs and client functions**

```typescript
export interface TopicSummary {
  slug: string
  title: string
  summary: string | null
  item_count: number
  term_count: number
  entry_type_counts: Record<string, number>
}

export interface PublicTopicDetail extends TopicSummary {
  items: TopicEntry[]
}

export async function listTopics(): Promise<TopicSummary[]> {
  const response = await request.get<{ code: number; data: TopicSummary[] }>('/api/topics')
  return (response as unknown as { data: TopicSummary[] }).data
}

export async function getTopic(slug: string): Promise<PublicTopicDetail> {
  const response = await request.get<{ code: number; data: PublicTopicDetail }>(`/api/topics/${encodeURIComponent(slug)}`)
  return (response as unknown as { data: PublicTopicDetail }).data
}
```

Define `TopicTermEntry` with `entry_type: 'term'` and nested term data; define `TopicContentEntry` with `entry_type: string`, `term: null`, and `fields: Record<string, string | number | boolean>`.

- [ ] **Step 4: Run the client tests**

Run: `cd term-frontend; npm test -- src/services/knowledgeApi.test.ts`

Expected: all knowledge API client tests PASS.

- [ ] **Step 5: Commit contracts and client**

```powershell
git add term-frontend/src/types/knowledge.ts term-frontend/src/services/knowledgeApi.ts term-frontend/src/services/knowledgeApi.test.ts
git commit -m "feat: add cultural topic client contracts"
```

### Task 4: Cultural Topic Index

**Files:**
- Create: `term-frontend/src/features/topics/TopicsPage.tsx`
- Create: `term-frontend/src/features/topics/TopicCard.tsx`
- Create: `term-frontend/src/features/topics/topics.css`
- Create: `term-frontend/src/features/topics/TopicsPage.test.tsx`
- Modify: `term-frontend/src/app/routes.tsx`
- Modify: `term-frontend/src/features/home/HomePage.test.tsx`
- Modify: `term-frontend/src/features/home/HomePage.tsx`

**Interfaces:**
- Consumes: `listTopics()` and `TopicSummary` from Task 3; `useChildMode()` from the existing reading context.
- Produces: `/topics` index page and topic-card links to `/topics/:slug`.

- [ ] **Step 1: Write failing index-page tests**

Mock `listTopics` and assert success, empty, error/retry, child-mode help text, and route links:

```typescript
it('renders published topics with research counts', async () => {
  listTopics.mockResolvedValue([topicSummary])
  renderTopics()
  expect(await screen.findByRole('link', { name: /淮河文化/ })).toHaveAttribute('href', '/topics/huaihe-culture')
  expect(screen.getByText('2 条内容')).toBeInTheDocument()
  expect(screen.getByText('1 个核心术语')).toBeInTheDocument()
})

it('retries a failed topic request', async () => {
  listTopics.mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce([topicSummary])
  const user = userEvent.setup()
  renderTopics()
  await user.click(await screen.findByRole('button', { name: '重新加载专题' }))
  expect(await screen.findByText('淮河文化')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the page test and confirm the page is absent**

Run: `cd term-frontend; npm test -- src/features/topics/TopicsPage.test.tsx`

Expected: FAIL because `TopicsPage` does not exist.

- [ ] **Step 3: Implement the index data states and cards**

`TopicsPage` owns `loading | ready | error`, a retry counter, and the aggregate totals. `TopicCard` remains presentational and maps entry types through a fixed label table:

```typescript
const entryTypeLabels: Record<string, string> = {
  term: '核心术语', person: '文化人物', place: '文化地点', culture: '文化条目', herb: '淮河本草',
}
```

Use semantic headings, an `aria-live="polite"` result region, a real retry button, and one full-card link per topic.

- [ ] **Step 4: Add editorial and responsive styles**

Create a feature-scoped stylesheet. Use existing CSS variables, a two-column card grid above 760px, a single column below 760px, visible keyboard focus, natural wrapping, and no fixed card heights.

- [ ] **Step 5: Replace the placeholder route and update the home link**

Import `TopicsPage` into `routes.tsx`, map `path="topics"` to it, and change the home call-to-action to `/topics/huaihe-culture`. Update its existing assertion accordingly.

- [ ] **Step 6: Run index and home tests**

Run: `cd term-frontend; npm test -- src/features/topics/TopicsPage.test.tsx src/features/home/HomePage.test.tsx`

Expected: both test files PASS.

- [ ] **Step 7: Commit the topic index**

```powershell
git add term-frontend/src/features/topics term-frontend/src/app/routes.tsx term-frontend/src/features/home/HomePage.tsx term-frontend/src/features/home/HomePage.test.tsx
git commit -m "feat: add cultural topic index"
```

### Task 5: Topic Detail, Cross-links, and Final Verification

**Files:**
- Create: `term-frontend/src/features/topics/TopicDetailPage.tsx`
- Create: `term-frontend/src/features/topics/TopicEntrySection.tsx`
- Create: `term-frontend/src/features/topics/TopicDetailPage.test.tsx`
- Modify: `term-frontend/src/features/topics/topics.css`
- Modify: `term-frontend/src/app/routes.tsx`
- Modify: `term-frontend/src/features/term-profile/TermProfilePage.tsx`
- Modify: `term-frontend/src/features/term-profile/TermProfilePage.test.tsx`

**Interfaces:**
- Consumes: `getTopic(slug)` and `PublicTopicDetail` from Task 3; `useParams()` and `useChildMode()`.
- Produces: `/topics/:slug`, grouped topic entries, term-profile links, and `/huaihe` redirect to `/topics/huaihe-culture`.

- [ ] **Step 1: Write failing detail-page tests**

Cover success grouping, term links, non-term allowlisted fields, empty data, network retry, child-mode labels, and 404 guidance:

```typescript
it('groups entries and links core terms to their profiles', async () => {
  getTopic.mockResolvedValue(topicDetail)
  renderTopic('/topics/huaihe-culture')
  expect(await screen.findByRole('heading', { name: '淮河文化' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '淮河文化' })).toHaveAttribute('href', '/terms/8')
  expect(screen.getByRole('heading', { name: '文化人物' })).toBeInTheDocument()
  expect(screen.getByText('管仲')).toBeInTheDocument()
})

it('shows a topic-not-found state for a 404 response', async () => {
  getTopic.mockRejectedValue({ response: { status: 404 } })
  renderTopic('/topics/missing')
  expect(await screen.findByText('专题不存在或尚未发布')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: '返回文化专题' })).toHaveAttribute('href', '/topics')
})
```

- [ ] **Step 2: Run the detail test and confirm the page is absent**

Run: `cd term-frontend; npm test -- src/features/topics/TopicDetailPage.test.tsx`

Expected: FAIL because `TopicDetailPage` does not exist.

- [ ] **Step 3: Implement detail loading and error states**

Read `slug` from route parameters, call `getTopic`, distinguish Axios response status 404 from generic failures, and cancel stale state updates in the effect cleanup. Render a retry button only for recoverable request failures.

- [ ] **Step 4: Implement grouped topic sections**

Group entries using the shared order `term`, `person`, `place`, `culture`, `herb`, then unknown types. Render term entries with names, category, definition, representative translation, and `/terms/:id`; render non-term entries as a definition list of safe fields. Provide section anchors and an `aria-label="专题内容导航"` navigation element.

- [ ] **Step 5: Complete responsive and reading-mode behavior**

Add desktop summary/stat alignment, single-column layout below 760px, horizontally scrollable section navigation, overflow-safe text, and clear focus states. In child mode use “先认识这些词”“再看看相关人物和事物”等 guidance while leaving stored descriptions unchanged.

- [ ] **Step 6: Wire canonical routes and cross-links**

Add `path="topics/:slug"`, redirect `/huaihe` to `/topics/huaihe-culture`, and change term-profile topic links from query strings to `/topics/${topic.slug}`. Update the existing term-profile assertion:

```typescript
expect(screen.getByRole('link', { name: '文明交流互鉴' }))
  .toHaveAttribute('href', '/topics/civilization-dialogue')
```

- [ ] **Step 7: Run focused frontend tests**

Run: `cd term-frontend; npm test -- src/features/topics/TopicsPage.test.tsx src/features/topics/TopicDetailPage.test.tsx src/features/term-profile/TermProfilePage.test.tsx src/features/home/HomePage.test.tsx`

Expected: all focused topic and navigation tests PASS.

- [ ] **Step 8: Run the complete backend verification**

Run: `cd term-backend; .\venv\Scripts\python.exe -m unittest discover -s tests -v`

Expected: all backend tests PASS.

- [ ] **Step 9: Run the complete frontend verification**

Run: `cd term-frontend; npm test`

Expected: all frontend tests PASS.

Run: `cd term-frontend; npm run lint`

Expected: zero lint errors; previously documented warnings may remain unchanged.

Run: `cd term-frontend; npm run build`

Expected: TypeScript compilation and Vite production build succeed.

- [ ] **Step 10: Review the final diff and commit**

Run: `git diff --check; git status --short`

Expected: no whitespace errors and only intended topic-module files modified.

```powershell
git add term-frontend/src/features/topics term-frontend/src/app/routes.tsx term-frontend/src/features/term-profile/TermProfilePage.tsx term-frontend/src/features/term-profile/TermProfilePage.test.tsx
git commit -m "feat: add cultural topic detail experience"
```
