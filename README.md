# 云尾笔记

云尾笔记，像一直跟在你身后的私有知识云尾巴：数据留在你自己的设备里，同时保持随时可访问的云端体验。  
它基于 Next.js + Prisma + PostgreSQL 构建，提供分类与笔记 CRUD、Markdown 编辑预览、截图上传、全文检索、收藏/置顶和移动端适配等核心能力。

## 界面预览

![云尾笔记界面预览](./docs/screenshots/app-overview.png)

## 技术栈

- Next.js 16 + React 19 + TypeScript
- TailwindCSS + shadcn/ui 组件风格
- Framer Motion 轻动画
- Prisma + PostgreSQL
- PostgreSQL Full Text Search (`tsvector` + `GIN`)

## 推荐搭配使用

- Tailscale：用于在公网环境下安全访问你本机部署的云尾笔记（内网穿透 + 私有网络）
- 反向代理（Caddy / Nginx）：统一入口域名、TLS 证书与访问日志，便于长期稳定运行。
- 备份策略（数据库 + 上传目录）：建议至少每日备份 PostgreSQL（`pg_dump`）和 `./data/uploads`，并定期做恢复演练。

## 功能清单

- Category：增删改查
- Note：增删改查，归属 Category
- Note 支持 `starred` / `pinned`
- 笔记列表排序：`pinned DESC, updated_at DESC`
- 标题+内容全文搜索（PostgreSQL `simple` 词典）
- Notes 分页查询
- 删除操作二次确认
- 上传截图到本机 `./data/uploads` 并插入 Markdown
- 登录页 + HttpOnly 会话 Cookie（7 天）

## 目录结构

```txt
yunwei-notes/
  app/
    (auth)/login/page.tsx
    (main)/layout.tsx
    (main)/page.tsx
    api/auth/login/route.ts
    api/auth/logout/route.ts
    api/auth/session/route.ts
    api/categories/route.ts
    api/categories/[id]/route.ts
    api/notes/route.ts
    api/notes/[id]/route.ts
    api/attachments/route.ts
    api/attachments/[id]/route.ts
    api/attachments/[id]/file/route.ts
    globals.css
    layout.tsx
  components/
    app-shell.tsx
    category-pane.tsx
    note-list.tsx
    note-editor.tsx
    markdown-preview.tsx
    upload-button.tsx
    delete-confirm-dialog.tsx
    mobile-nav.tsx
    ui/...
  lib/
    api.ts
    auth.ts
    constants.ts
    db-search.ts
    mappers.ts
    prisma.ts
    upload.ts
    utils.ts
    validators.ts
  prisma/
    schema.prisma
    migrations/0001_init/migration.sql
    migrations/0002_note_search_vector/migration.sql
    migrations/migration_lock.toml
  scripts/hash-password.mjs
  tests/
    auth-login-route.test.ts
    auth-redirect.test.ts
    validators.test.ts
  data/uploads/.gitkeep
  proxy.ts
  vitest.config.ts
  .env.example
```

## 环境变量

复制 `.env.example` 为 `.env` 并填写：

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/notes_selfhosted?schema=public"
SESSION_SECRET="replace-with-32+chars-random-string"
APP_PASSWORD_HASH="\$2b\$12\$replace_with_bcrypt_hash"
UPLOAD_DIR="./data/uploads"
MAX_UPLOAD_SIZE_MB="10"
NEXT_PUBLIC_DISPLAY_TIMEZONE="Asia/Shanghai"
```

注意：Next.js 会处理 `.env` 中的 `$`，bcrypt 哈希必须把 `$` 写成 `\$`，否则会导致 `APP_PASSWORD_HASH` 读取失败并在登录接口返回 `500`。
时间显示默认使用 `Asia/Shanghai`。如果你想改成本地时区，可在 `.env` 里调整 `NEXT_PUBLIC_DISPLAY_TIMEZONE`（例如 `America/Los_Angeles`）。

## 本机部署步骤（pnpm）

1. 安装依赖  
`pnpm install`

2. 创建数据库（PostgreSQL）  
数据库名：`notes_selfhosted`  
Windows（你当前环境，`psql` 未加 PATH）可直接执行：
```powershell
$env:PGPASSWORD='YOUR_PASSWORD'
$psql='C:\Program Files\PostgreSQL\18\bin\psql.exe'
$exists = & $psql -h localhost -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='notes_selfhosted';"
if ($exists.Trim() -ne '1') {
  & $psql -h localhost -U postgres -d postgres -c "CREATE DATABASE notes_selfhosted;"
}
```

3. 生成登录密码哈希  
`node scripts/hash-password.mjs "你的密码"`  
复制脚本输出的 `APP_PASSWORD_HASH=...` 整行到 `.env`

4. 生成 Prisma Client  
`pnpm prisma:generate`

5. 执行迁移（开发环境）  
`pnpm prisma:migrate:dev`

6. 启动开发服务  
`pnpm dev --hostname 0.0.0.0 --port 3000`

7. （可选）Tailscale 访问  
`http://<tailscale-ip>:3000`

8. 生产构建  
`pnpm build`

9. 生产启动  
`pnpm start --hostname 0.0.0.0 --port 3000`

10. 生产数据库迁移  
`pnpm prisma:migrate:deploy`

11. 运行自动化测试  
`pnpm test`

## Prisma 迁移建议

- 日常开发使用 `pnpm prisma:migrate:dev`
- 服务器发布使用 `pnpm prisma:migrate:deploy`
- `0002_note_search_vector` 已包含：
  - `notes.search_vector` 列
  - `notes_search_vector_trigger_fn()` + trigger
  - GIN 索引 `idx_notes_search_vector_gin`
  - 排序索引 `idx_notes_pinned_updated`

## 手动验证用例（10 条）

1. 未登录访问 `/` 会跳转到 `/login`
2. 输入错误密码返回失败提示，正确密码登录成功并进入首页
3. 创建分类、重命名分类、删除空分类都成功
4. 删除存在笔记的分类返回 `409`
5. 创建笔记后，列表按置顶优先、其次按更新时间倒序
6. 笔记列表中切换收藏/置顶后，状态与排序立即生效
7. 搜索词命中标题或正文时返回匹配结果，清空后恢复全量
8. `page/pageSize` 翻页正确，返回总数与总页数
9. 上传 png/jpg/webp 后自动插入 Markdown 图片语法
10. 删除笔记后，关联附件记录和磁盘文件同步删除
