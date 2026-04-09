# 云尾笔记

云尾笔记，像一直跟在你身后的私有知识云尾巴：数据留在你自己的设备里，同时保持随时可访问的云端体验。  
它基于 Next.js + Prisma + PostgreSQL 构建，提供分类与笔记 CRUD、Markdown 编辑预览、附件上传、全文检索、收藏/置顶和移动端适配等核心能力。

## 界面预览

![云尾笔记界面预览](./docs/screenshots/app-overview.png)

## 技术栈

- Next.js 16 + React 19 + TypeScript
- TailwindCSS + shadcn/ui 组件风格
- Framer Motion 轻动画
- Prisma + PostgreSQL
- PostgreSQL Full Text Search (`tsvector` + `GIN`)

## 快速开始

### 方式一：Docker Compose（推荐）

1. 复制环境变量文件：`Copy-Item .env.example .env`
2. 把 `.env` 里的 `SESSION_SECRET` 改成你自己的随机密钥，长度至少 32 位，不要保留示例占位值
3. 安装依赖：`pnpm install`
4. 生成登录密码哈希，并把输出的 `APP_PASSWORD_HASH` 填回 `.env`：
   `node scripts/hash-password.mjs "你的密码"`
5. 运行初始化：`pnpm run setup`
6. 启动容器：`pnpm docker:up`
7. 打开 `http://localhost:3000`

当前分支里的 Docker 启动行为：

- 应用容器入口是 `pnpm docker:start`
- 会先等待 PostgreSQL 就绪
- 自动执行 `pnpm prisma:migrate:deploy`
- 然后启动 Next.js 服务并监听 `3000` 端口

### 方式二：本机开发

1. 准备 PostgreSQL，并创建数据库 `notes_selfhosted`
2. 复制环境变量文件：`Copy-Item .env.example .env`
3. 把 `.env` 里的 `SESSION_SECRET` 改成你自己的随机密钥，长度至少 32 位，不要保留示例占位值
4. 安装依赖：`pnpm install`
5. 生成登录密码哈希，并把输出的 `APP_PASSWORD_HASH` 填回 `.env`：
   `node scripts/hash-password.mjs "你的密码"`
6. 运行初始化：`pnpm run setup`
7. 执行开发环境迁移：`pnpm prisma:migrate:dev`
8. 启动开发服务：`pnpm dev`

## 功能清单

- Category：增删改查
- Note：增删改查，归属 Category
- Note 支持 `starred` / `pinned`
- 笔记列表排序：`pinned DESC, updated_at DESC`
- 标题 + 内容全文搜索
- Notes 分页查询
- 删除操作二次确认
- 上传附件到 `./data/uploads` 并插入 Markdown
- 登录页 + HttpOnly 会话 Cookie

## 部署与运维

更完整的部署、备份、运行命令和排障说明见：

- [docs/deployment.md](./docs/deployment.md)

## 常用命令

- `pnpm run setup`
- `pnpm dev`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm docker:up`
- `pnpm docker:down`
- `pnpm docker:logs`
