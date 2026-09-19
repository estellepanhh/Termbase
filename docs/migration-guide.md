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
