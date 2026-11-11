# 知识核心迁移指南

本指南把旧表 `terms`、`huaihe_terms`、`huaihe_figures`、`huaihe_herbs` 复制到规范化 `kb_` 表。迁移器只读旧表，使用 `(legacy_table, legacy_id)` 或稳定行指纹去重，重复运行是安全的。

## 迁移前检查与备份

在目标数据库确认连接用户、库名和磁盘空间；不要把 `.env`、密码或 API key 写入验收记录。先执行只读计数并保存脱敏结果：

```sql
SELECT COUNT(*) FROM terms;
SELECT COUNT(*) FROM huaihe_terms;
SELECT COUNT(*) FROM huaihe_figures;
SELECT COUNT(*) FROM huaihe_herbs;
```

使用数据库工具创建带时间戳的完整备份，并确认备份文件可读取/校验成功。备份未确认前不得升级或导入。

## 升级和两次导入演练

```powershell
cd D:\Termbase\term-backend
$env:FLASK_APP='termbase_app:create_app'
.\venv\Scripts\flask.exe db upgrade
.\venv\Scripts\python.exe scripts\migrate_legacy_knowledge.py
.\venv\Scripts\python.exe scripts\migrate_legacy_knowledge.py
```

第二次报告应为 `terms_created=0`（以及其他已存在实体不再新增），旧表仍然存在。建议在与生产结构一致的隔离库先完整演练。

## 核对清单

1. `kb_terms` 数量等于 `terms` 与 `huaihe_terms` 可识别唯一记录的合计。
2. `kb_topic_items` 覆盖所有淮河人物和中药材记录，并保留原始 payload。
3. 每个非空旧英文译法都有 `en` 翻译；每个非空来源都有 Source 关联。
4. 随机抽取至少 20 条，人工对照名称、层级、类别、译法、文化内涵和来源。
5. 核对旧表仍可查询，且迁移器第二次运行没有重复记录。

出现差异时，修正导入器并从空的 `kb_` 表重新演练；不要手工修补单条迁移结果。

## 回滚

迁移器不会删除旧表。若应用验收失败，停止新应用并恢复到上一版本；保留 `kb_` 表供诊断，或在确认备份可恢复后仅删除本次创建的 `kb_` 表并从备份恢复。绝不删除旧表作为回滚手段。数据库恢复命令由具体 MySQL 运维工具执行，恢复前再次确认目标库和备份校验值。

## 完成后验收

```powershell
cd D:\Termbase\term-backend
.\venv\Scripts\python.exe -m unittest discover -s tests -v
cd ..\term-frontend
npm test
npm run build
npm run lint
```

再按 README 的公共路由和浏览器清单进行人工验收。

## 2026-11-11 术语与淮河专题数据发布

`term-backend/data/术语库总表（835条·2026-11-11）.xlsx` 是文化专题与多语译文的当前数据源；`term-backend/data/淮河文化人物与本草（网站专题条目·41条备.xlsx` 独立保存 21 位文化人物和 20 味淮河本草。发布时使用 `scripts/import_catalog_release.py` 在同一事务内导入两份数据：任一部分失败都会整体回滚。

当前总表的验收基线为：

- 835 条术语专题关联；
- 828 个规范化术语；
- 10 个已发布专题；
- 英、法、俄、西、阿、日 6 个语种全部覆盖；
- 4974 条去重后的译文；
- 淮河专题另含 21 位人物和 20 味本草，最终共 179 条专题内容。

### 本地或服务器预演

导入命令默认只预演并回滚，不会修改数据库：

```powershell
cd D:\Termbase\term-backend
.\venv\Scripts\python.exe scripts\import_catalog_release.py
```

报告中的 `mode` 应为 `preview_rolled_back`，并符合上述基线。确认数据库完整备份可恢复后，才显式执行：

```powershell
.\venv\Scripts\python.exe scripts\import_catalog_release.py --apply
```

Linux 服务器对应命令：

```bash
cd /var/www/termbase/term-backend
source venv/bin/activate
python scripts/import_catalog_release.py
python scripts/import_catalog_release.py --apply
```

脚本可重复运行；第二次执行不会重复创建术语、译文、来源、场景或专题关联。

### 公网发布

先完成数据库备份，再更新代码、导入总表和构建前端：

```bash
set -e
cd /var/www/termbase
git pull --ff-only origin main
cd term-backend
source venv/bin/activate
pip install -r requirements.txt
flask db upgrade
python scripts/import_catalog_release.py
python scripts/import_catalog_release.py --apply
cd ../term-frontend
npm ci
npm run build
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://terms.estellepan.top/api/v1/health
curl -fsS https://terms.estellepan.top/api/topics
```

如果阿里云网页终端容易断开，可在拉取代码后让发布脚本在后台继续运行：

```bash
cd /var/www/termbase && git pull --ff-only origin main
nohup bash term-backend/scripts/publish_catalog_release.sh > "$HOME/catalog-release.log" 2>&1 &
tail -f "$HOME/catalog-release.log"
```

看到 `CATALOG_RELEASE_SUCCESS` 即表示备份、预演、正式导入和公网数量核验均已完成。即使网页终端中途断开，重新登录后再次执行最后一行即可查看进度。

如果部署环境的后端进程不会自动重载，在服务器上先用 `systemctl list-units --type=service | grep -Ei 'term|gunicorn'` 确认现有服务名，再重启该服务；不要猜测或新建第二套服务。

浏览器验收至少包括：文化专题目录能检索 10 个专题；`/topics/huaihe-culture` 保留淮河河流与气泡导览；`/topics/huizhou-culture` 等其他专题显示当前专题自己的知识星图；同名跨专题术语只有一个详情档案。

### 回滚

总表导入会复用并更新已存在词条，不能靠删除 `master_catalog_2026_11_11` 标记完整还原。因此上线前的数据库备份是正式回滚点。若验收失败：

1. 将代码切回上一已知可用提交并重新构建前端；
2. 从上线前备份恢复数据库；
3. 重启原后端服务并重载 Nginx；
4. 再次检查健康接口、专题列表和至少一个术语详情。

预演模式已经回滚事务，不需要执行任何清理。
