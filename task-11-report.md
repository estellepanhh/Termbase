# Task 11 验收记录

工作树：`D:\Termbase\.worktrees\knowledge-core-rebuild`
验收日期：2026-09-19

## 交付内容

- 更新 `README.md`：新旧架构边界、安装/迁移/启动/测试命令、公共路由和 DeepSeek 变量名。
- 更新 `API.md`：`/api/v1/terms` 列表与详情请求、成功/错误响应示例，并保留旧版兼容接口说明。
- 新增 `docs/migration-guide.md` 与 `docs/knowledge-model.md`。
- 请求拦截器同时识别 v1 `message` 和旧版 `msg`；新增响应错误回归测试。
- Discovery URL 对 `0`、负数、非数字和小数页码归一到第 1 页，并新增回归测试。

## 命令和结果

| 检查 | 命令 | 结果 |
|---|---|---|
| 后端 | `cd term-backend; .\\venv\\Scripts\\python.exe -m unittest discover -s tests -v` | PASS，29 tests，0 failures |
| 前端测试 | `cd term-frontend; npm test` | PASS，5 files / 43 tests |
| 前端构建 | `cd term-frontend; npm run build` | PASS，Vite build exit 0；仅有既有 chunk size 提示 |
| 前端 lint | `cd term-frontend; npm run lint` | exit 0，0 errors、4 个既有 React Hook warnings |
| 补丁空白 | `git diff --check` | PASS，无输出 |
| 密钥扫描 | `git grep -En "sk-[A-Za-z0-9]{20,}" -- .` | PASS，无结果；未读取或提交 `.env` |

## 隔离库迁移演练

未对真实 MySQL 执行迁移：本工作树没有可确认的备份凭据/成功备份记录，按安全要求不触碰生产数据。使用临时 SQLite、四张同名旧表和代表性记录执行等价导入器演练：

```powershell
cd D:\Termbase\.worktrees\knowledge-core-rebuild\term-backend
@' ... import_legacy_knowledge(db.session) ... '@ | .\\venv\\Scripts\\python.exe -
```

输出摘要：第一次 `terms_created=2`、`translations_created=1`、`sources_created=1`、`topic_items_created=3`；第二次 `terms_created=0`、其余新增均为 0、`skipped=4`；`kb_terms=2`、`topic_items=3`；四张旧表仍存在。完整迁移步骤、备份、核对和回滚要求已写入 `docs/migration-guide.md`。后端 `test_legacy_import` 也验证了完整 fixture 的两次导入、来源/译法/专题覆盖和旧表保留。

## 未完成的人工验收

浏览器桌面/390px 溢出、真实 DeepSeek 最小连接和键盘走查需要运行中的后端、前端及外部服务，本次命令行验收未冒充完成。公共路由、失败重试、URL 状态和无效分页已有自动化覆盖。

## 工作树注意事项

`term-frontend/.npm-task5-cache/` 是已有未跟踪生成目录，未读取、删除或提交。

## Final-review 修正

- `Term.legacy_payload` 使用数据库 JSON 类型保存完整 JSON-safe 的 `terms`/`huaihe_terms` 原始行，因此 `筛选标签`、未映射列和原生数值 ID 不再静默丢失；导入仍按 legacy identity 幂等跳过既有记录。
- `TopicItem.legacy_id` 及初始迁移列统一扩大到 255，并由迁移测试断言。
- v1 搜索现在按已发布术语的 `preferred_name_zh OR definition_zh` 匹配；新增 API 回归测试。
- README/API 删除了匿名 CRUD/Excel 导入的过时示例，明确旧写入端点已移除，仅保留兼容读取路由。
- 按批准范围未恢复旧版 ChatAI/FloatingTools UI；DeepSeek SSE 后端兼容能力属于前序任务并继续保留/测试，AI UI 不在本子项目。

Final-review focused command:

```powershell
cd D:\Termbase\.worktrees\knowledge-core-rebuild\term-backend
.\venv\Scripts\python.exe -m unittest tests.test_legacy_import tests.test_public_terms_api tests.test_knowledge_models -v
```

结果：24 tests，0 failures。

Final-review full acceptance results: backend `30 tests ... OK`; frontend `npm test` `5 files / 43 tests passed`; `npm run build` exit 0; `npm run lint` exit 0 with 0 errors and the same 4 pre-existing React Hook warnings; `git diff --check` passed; secret scan returned no results. Documentation inspection confirms CRUD/import examples are removed and only the explicit “removed/404” compatibility note remains.

## Migration-history correction

The shipped base revision `3d256e5c3d75` was restored unchanged (no payload column; both legacy IDs remain length 100). Successor revision `7b8f4e2a1c6d` adds nullable JSON, backfills existing rows to `{}`, batch-enforces non-null, widens both IDs to 255, and downgrades safely. The executable SQLite migration test upgrades base → successor, verifies an existing row survives with an empty payload, then downgrades successor → base and removes all tables. Focused migration/model/import/API checks pass; full backend suite passes with 31 tests, and `compileall` passes.

Downgrade safety was additionally hardened: successor downgrade preflights both legacy-ID tables before any batch operation or payload drop, and raises an actionable error for values over 100 characters. Regression coverage confirms the failure leaves the head columns, payload, and long-ID row intact; fit values still downgrade successfully.
