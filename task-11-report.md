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
