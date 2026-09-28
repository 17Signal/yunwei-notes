# 云尾笔记 · Yunwei Notes

**让每一个想法，都有归处。**

一个可以部署在自己服务器上的私有笔记空间。用 Markdown 自由书写，用分类、收藏和搜索整理知识；笔记存入 PostgreSQL，图片存入本地磁盘或 Docker 数据卷。

[![Checks](https://github.com/17Signal/yunwei-notes/actions/workflows/ci.yml/badge.svg)](https://github.com/17Signal/yunwei-notes/actions/workflows/ci.yml)
![Next.js 16](https://img.shields.io/badge/Next.js-16-222222)
![React 19](https://img.shields.io/badge/React-19-397c91)
![MIT](https://img.shields.io/badge/license-MIT-286657)

## 界面预览

![云尾笔记：分类、笔记列表与 Markdown 分栏编辑](./docs/screenshots/app-overview.png)

<details>
<summary>查看移动端与登录页</summary>

<img src="./docs/screenshots/mobile.png" alt="移动端笔记预览" width="320" />

![登录页](./docs/screenshots/login.png)

</details>

## 功能

- **专注书写**：编辑、分栏、预览三种视图；标题、代码块、表格、引用和任务清单；加粗、标题及代码块快捷插入。
- **可靠保存**：`Ctrl / ⌘ + S` 保存，显示未保存状态；切换笔记保留草稿，保存期间继续输入不会被旧响应覆盖；版本检查阻止过期草稿覆盖其他窗口的新内容。
- **有序整理**：分类增删改、收藏、置顶及独立筛选入口；置顶优先、更新时间倒序的分页列表。
- **快速查找**：标题和正文全文检索，补充中文片段及英文部分词匹配；300ms 搜索防抖，兼容中文输入法。
- **图片与导出**：上传 PNG、JPEG、WebP，插入当前笔记草稿；默认单张上限 10MB；导出当前笔记或未保存草稿为 Markdown。
- **桌面与手机**：桌面三栏独立滚动，手机侧栏选择后自动关闭；长代码和表格在内容区域内滚动。
- **私有访问**：单密码登录、HttpOnly 会话 Cookie、登录频率限制、同源写入检查；笔记和图片接口均需登录。

草稿保存在**当前页面内存**中，切换笔记不会丢失；刷新或关闭页面前会触发浏览器提醒，请及时保存。导出的 Markdown 保留图片的服务内链接，图片文件需另外备份。当前适用于个人使用，不包含多用户权限、离线同步或版本历史。

## 快速开始

需要 Node.js **22.12+**、pnpm **10.30.2**。Docker 方式另需 Docker Engine / Desktop 和 Compose v2；本机方式需 PostgreSQL，项目使用 PostgreSQL 17 验证。

```sh
git clone https://github.com/17Signal/yunwei-notes.git
cd yunwei-notes
corepack enable
pnpm install --frozen-lockfile
pnpm init:env "请替换为你的独立访问密码"
pnpm setup
```

`init:env` 从 `.env.example` 生成 `.env`，创建随机会话密钥并对密码做 bcrypt 哈希；已有 `.env` 时拒绝覆盖。密码不得超过 72 个 UTF-8 字节。请将 `.env` 保存在本机，勿提交到版本库。

### Docker Compose

完成上面的初始化后：

```sh
docker compose up -d --build
docker compose logs -f app
```

打开 **http://localhost:3000**。应用会等待 PostgreSQL 就绪、执行数据库迁移，然后启动服务。应用进程使用非 root 用户运行。

- 默认仅监听 `127.0.0.1:3000`。需要局域网访问时，在 `.env` 设置 `APP_BIND_ADDRESS="0.0.0.0"` 并重新创建容器。
- Compose 的本地 HTTP 模式默认 `COOKIE_SECURE=false`。接入 HTTPS 后，在 `.env` 设置 `COOKIE_SECURE="true"`，再执行 `docker compose up -d`。
- 反向代理须保留 `Host` 并正确设置 `X-Forwarded-Proto`。公开访问时使用 HTTPS，并在代理层设置上传大小和请求速率限制。
- 数据库不映射宿主机端口。数据库和图片分别保存在 `postgres_data`、`uploads_data` 命名卷中，重建应用镜像不会清除数据。
- 停止服务使用 `docker compose down`；**不要添加 `-v`，除非明确要删除数据卷。**

### 本机运行

创建 PostgreSQL 数据库，并将 `.env` 中的 `DATABASE_URL` 改为实际连接地址：

```sh
pnpm prisma:migrate:deploy
pnpm dev
```

本机生产运行：

```sh
pnpm build
pnpm start
```

直接用 HTTP 运行生产服务时，需明确设置 `COOKIE_SECURE="false"`；HTTPS 使用 `true`。本机图片默认存入 `data/uploads/`。

## 配置

| 变量                           | 用途                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                 | PostgreSQL 连接地址；Compose 会覆盖为容器内的数据库地址                       |
| `SESSION_SECRET`               | 至少 32 字符的随机会话签名密钥，由初始化脚本生成                              |
| `APP_PASSWORD_HASH`            | bcrypt 密码哈希，由初始化脚本生成；保留 `.env` 中对 `$` 的转义                |
| `UPLOAD_DIR`                   | 本机图片目录，默认 `./data/uploads`；Compose 使用 `/app/data/uploads`         |
| `MAX_UPLOAD_SIZE_MB`           | 单张图片大小限制，默认 `10`                                                   |
| `COOKIE_SECURE`                | `true` 仅 HTTPS 传输 Cookie；Compose 本地默认 `false`，本机生产默认 `true`    |
| `APP_BIND_ADDRESS`             | Compose 的宿主机监听地址，默认 `127.0.0.1`                                    |
| `NEXT_PUBLIC_DISPLAY_TIMEZONE` | 展示时区，默认 `Asia/Shanghai`；修改后需要重新构建应用镜像或执行 `pnpm build` |

会话有效期为 7 天。更换访问密码后，同时更换 `SESSION_SECRET` 并重启服务可让旧会话失效。登录限制为单个应用进程每分钟最多 10 次尝试；部署多个实例时应在代理或共享存储中统一限流。

## 从旧版本升级

1. 备份 PostgreSQL、图片目录／数据卷和 `.env`。
2. 拉取代码：`git pull --ff-only`。
3. Docker：`docker compose up -d --build`，启动时自动迁移。
4. 本机：`pnpm install --frozen-lockfile` → `pnpm prisma:migrate:deploy` → `pnpm build` → 重启服务。

0.2 版增加 `notes.version` 字段用于保存冲突检查，迁移不会删除原有笔记。Compose 默认监听地址改为本机回环地址，原先需要远程访问的部署请明确设置 `APP_BIND_ADDRESS`。

## 备份与恢复

完整备份包含三部分：**数据库、图片、配置**。备份时先停止应用写入，数据库容器继续运行。

下面的命令适用于 Bash / PowerShell，使用容器内文件避免 PowerShell 重定向二进制备份时损坏内容：

```sh
docker compose stop app
docker compose exec -T db pg_dump -U postgres -d notes_selfhosted -Fc -f /tmp/notes.dump
docker compose cp db:/tmp/notes.dump ./notes.dump
docker compose cp app:/app/data/uploads ./uploads-backup
docker compose start app
```

另行安全保存 `.env`。恢复时停止应用，将数据库备份恢复到一个空数据库，将图片放回对应上传目录／卷，并确保容器内 UID 1000 可写，然后启动应用执行迁移。应定期在隔离环境演练恢复；不要把备份提交到 GitHub。

## 开发与验证

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm audit
```

单元测试使用独立配置，不依赖你的 `.env`、数据库或真实密码。浏览器测试需要**独立的测试数据库**，会应用迁移并创建、删除测试记录：

```sh
pnpm exec playwright install chromium
# Bash
TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/yunwei_test" pnpm test:e2e
```

```powershell
# PowerShell
$env:TEST_DATABASE_URL = "postgresql://postgres:password@localhost:5432/yunwei_test"
pnpm test:e2e
```

浏览器测试自动构建并在 `127.0.0.1:3100` 启动生产服务，覆盖登录、分类、搜索、分页、草稿竞态、版本冲突、图片上传与移动端。GitHub Actions 执行静态检查、单元测试、依赖审计和浏览器测试。测试输出、构建目录、上传数据和本地配置均已忽略。

## 技术与目录

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Radix UI · Prisma 7 · PostgreSQL 17

| 目录          | 内容                                 |
| ------------- | ------------------------------------ |
| `app/`        | 页面、路由和 API                     |
| `components/` | 工作区、编辑器和界面组件             |
| `lib/`        | 会话、输入校验、数据库检索与文件存储 |
| `prisma/`     | 数据模型和可追踪的数据库迁移         |
| `scripts/`    | 配置初始化与 Docker 启动             |
| `tests/`      | 单元、接口和浏览器回归测试           |

英文全文检索使用 PostgreSQL `tsvector` + GIN 索引，中文和部分词补充字面子串查询；较大数据集可按需要引入专门的中文分词和搜索索引。

## 许可证

[MIT](./LICENSE)
