# 部署前检查清单

本项目目前定位为大创展示与小组协作系统，部署前按以下项目检查即可。

## 必须确认

- [ ] `term-backend/.env` 已配置 `SECRET_KEY` 和 `AUTH_TOKEN_SECRET`，且不是默认值。
- [ ] `term-backend/.env` 已配置 `DEEPSEEK_API_KEY`，且没有写入前端或提交到 Git。
- [ ] `ADMIN_USERNAME` / `ADMIN_PASSWORD` 已确认。演示可用 `admin / 123456`，公网长期开放建议换强密码。
- [ ] `FLASK_DEBUG=false`。
- [ ] `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_NAME` 指向正式 MySQL。
- [ ] 数据库不直接暴露公网。
- [ ] 已执行 `flask db upgrade`。
- [ ] 前端生产环境请求地址指向正式后端，不是 `localhost`。
- [ ] CORS 只允许正式前端域名。

## 建议确认

- [ ] 登录限流已开启，默认 `AUTH_LOGIN_RATE_LIMIT=10 per minute`。
- [ ] AI 助手限流已开启，默认 `AI_CHAT_RATE_LIMIT=20 per minute`。
- [ ] AI 单次输入长度已限制，默认 `AI_MAX_MESSAGE_CHARS=500`。
- [ ] 管理员操作记录可在管理页看到。
- [ ] 术语删除表现为“下架”，不是硬删除。
- [ ] 注册策略已确认：是否允许外部用户自行注册。
- [ ] 准备好演示数据：术语、译法、来源、淮河文化专题、待审核共建记录。
- [ ] 手机端检查过：首页、术语检索、淮河专题、术语共建、登录、管理员页、AI 弹窗。

## 启动前验证命令

后端：

```powershell
cd D:\Termbase\term-backend
.\venv\Scripts\python.exe -m flask db upgrade
.\venv\Scripts\python.exe -m pytest -q
```

前端：

```powershell
cd D:\Termbase\term-frontend
npm run test
npm run lint
npm run build
```
