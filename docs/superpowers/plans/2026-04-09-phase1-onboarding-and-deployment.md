# Phase 1 Onboarding and Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a first post-open-source quality pass that makes `yunwei-notes` easier to start, easier to deploy, and safer to maintain without changing core product behavior.

**Architecture:** Keep core note/category/upload behavior intact and improve the project boundary instead: add a setup/preflight layer, add a Docker deployment path, refresh onboarding docs, and add targeted tests around startup and selected API routes. The setup logic should live in a small testable helper module that is called from a thin script entrypoint.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL, Vitest, Docker Compose, Node.js scripts

---

### Task 1: Prepare an Isolated Workspace

**Files:**
- Modify: `.gitignore`
- Create: `.worktrees/` (local git worktree directory, not committed)

- [ ] **Step 1: Ensure the repository ignores local worktrees**

Add this line near the local/dev-only ignore entries in `.gitignore`:

```gitignore
/.worktrees/
```

- [ ] **Step 2: Commit the ignore rule before creating the worktree**

Run:

```powershell
git add .gitignore
git commit -m "chore: ignore local worktrees"
```

Expected: a commit is created with only the `.gitignore` change.

- [ ] **Step 3: Create the isolated worktree and feature branch**

Run:

```powershell
New-Item -ItemType Directory -Force .worktrees | Out-Null
git worktree add .worktrees/phase1-deploy-and-quality -b feat/phase1-deploy-and-quality
```

Expected: git reports a new worktree checked out on `feat/phase1-deploy-and-quality`.

- [ ] **Step 4: Install dependencies and verify the clean baseline inside the worktree**

Run:

```powershell
pnpm install
pnpm test
```

Expected: install completes and the current `3` test files pass before any feature work starts.

### Task 2: Add Setup Preflight Validation and the `pnpm setup` Workflow

**Files:**
- Create: `lib/setup/preflight.ts`
- Create: `scripts/setup.mjs`
- Create: `tests/setup-preflight.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing preflight tests**

Create `tests/setup-preflight.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { validateSetupEnv } from "../lib/setup/preflight";

describe("validateSetupEnv", () => {
  it("collects missing required environment variables", () => {
    const result = validateSetupEnv({});

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("DATABASE_URL is required.");
    expect(result.errors).toContain("SESSION_SECRET is required.");
    expect(result.errors).toContain("APP_PASSWORD_HASH is required.");
  });

  it("rejects short session secrets", () => {
    const result = validateSetupEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public",
      SESSION_SECRET: "too-short",
      APP_PASSWORD_HASH: "\\$2b\\$12\\$exampleexampleexampleexampleexampleexampleexample",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("SESSION_SECRET must be at least 32 characters long.");
  });

  it("accepts a valid minimum configuration", () => {
    const result = validateSetupEnv({
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public",
      SESSION_SECRET: "12345678901234567890123456789012",
      APP_PASSWORD_HASH: "\\$2b\\$12\\$exampleexampleexampleexampleexampleexampleexample",
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```powershell
pnpm test -- tests/setup-preflight.test.ts
```

Expected: FAIL with a module-not-found error for `../lib/setup/preflight`.

- [ ] **Step 3: Implement the preflight helper**

Create `lib/setup/preflight.ts`:

```ts
export type SetupEnv = Record<string, string | undefined>;

export type SetupValidationResult = {
  ok: boolean;
  errors: string[];
};

const REQUIRED_KEYS = ["DATABASE_URL", "SESSION_SECRET", "APP_PASSWORD_HASH"] as const;

export function validateSetupEnv(env: SetupEnv): SetupValidationResult {
  const errors: string[] = [];

  for (const key of REQUIRED_KEYS) {
    const value = env[key]?.trim();
    if (!value) {
      errors.push(`${key} is required.`);
    }
  }

  const secret = env.SESSION_SECRET?.trim();
  if (secret && secret.length < 32) {
    errors.push("SESSION_SECRET must be at least 32 characters long.");
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}
```

- [ ] **Step 4: Implement the setup script and package entrypoint**

Create `scripts/setup.mjs`:

```js
import { mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import dotenv from "dotenv";

import { validateSetupEnv } from "../lib/setup/preflight.js";

const envPath = path.resolve(process.cwd(), ".env");
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR?.trim() || "./data/uploads");

const loaded = dotenv.config({ path: envPath });

if (loaded.error) {
  console.error("Missing .env file. Copy .env.example to .env before running pnpm setup.");
  process.exit(1);
}

const validation = validateSetupEnv(process.env);
if (!validation.ok) {
  for (const error of validation.errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

await mkdir(uploadDir, { recursive: true });

const generate = spawnSync("pnpm", ["prisma:generate"], {
  stdio: "inherit",
  shell: true,
});

if (generate.status !== 0) {
  process.exit(generate.status ?? 1);
}

console.log("Setup complete.");
console.log("Next steps:");
console.log("- Start local dev: pnpm dev");
console.log("- Or start Docker stack: pnpm docker:up");
```

Modify `package.json` scripts:

```json
{
  "scripts": {
    "setup": "node scripts/setup.mjs",
    "docker:up": "docker compose up --build",
    "docker:down": "docker compose down"
  }
}
```

If Node.js cannot import the TypeScript helper directly from `scripts/setup.mjs`, create a second helper file with the same validation logic at `scripts/lib/preflight.mjs` and keep the Vitest coverage pointed at the TypeScript source. Do not duplicate business rules in multiple places without adding a shared source of truth.

- [ ] **Step 5: Run the preflight test and the setup command**

Run:

```powershell
pnpm test -- tests/setup-preflight.test.ts
pnpm setup
```

Expected:

- the test file passes
- `pnpm setup` either completes successfully with "Setup complete." or fails with a specific missing-config message if the local `.env` is intentionally incomplete

- [ ] **Step 6: Commit the setup workflow**

Run:

```powershell
git add lib/setup/preflight.ts scripts/setup.mjs tests/setup-preflight.test.ts package.json
git commit -m "feat: add project setup workflow"
```

Expected: a single commit containing the setup helper, setup script, test, and script wiring.

### Task 3: Add Docker Packaging for App + PostgreSQL

**Files:**
- Create: `.dockerignore`
- Create: `Dockerfile`
- Create: `compose.yaml`
- Modify: `.env.example`
- Modify: `package.json`

- [ ] **Step 1: Verify the Docker configuration is currently missing**

Run:

```powershell
docker compose config
```

Expected: FAIL because `compose.yaml` does not exist yet.

- [ ] **Step 2: Add the Docker ignore list**

Create `.dockerignore`:

```dockerignore
.git
.next
.worktrees
node_modules
coverage
docs
data/uploads
```

- [ ] **Step 3: Add the application image build**

Create `Dockerfile`:

```dockerfile
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/postcss.config.mjs ./postcss.config.mjs
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/app ./app
COPY --from=builder /app/components ./components
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types ./types
EXPOSE 3000
CMD ["pnpm", "start", "--hostname", "0.0.0.0", "--port", "3000"]
```

- [ ] **Step 4: Add the Compose stack and script shortcuts**

Create `compose.yaml`:

```yaml
services:
  db:
    image: postgres:17
    restart: unless-stopped
    environment:
      POSTGRES_DB: notes_selfhosted
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  app:
    build:
      context: .
      dockerfile: Dockerfile
    depends_on:
      - db
    env_file:
      - .env
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/notes_selfhosted?schema=public
      UPLOAD_DIR: /app/data/uploads
    ports:
      - "3000:3000"
    volumes:
      - uploads_data:/app/data/uploads

volumes:
  postgres_data:
  uploads_data:
```

Extend `package.json`:

```json
{
  "scripts": {
    "docker:up": "docker compose up --build",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f"
  }
}
```

Update `.env.example` to call out the Docker default:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public"
UPLOAD_DIR="./data/uploads"
```

- [ ] **Step 5: Validate the Compose file**

Run:

```powershell
docker compose config
```

Expected: PASS and print the fully rendered Compose configuration without schema or interpolation errors.

- [ ] **Step 6: Commit the Docker packaging**

Run:

```powershell
git add .dockerignore Dockerfile compose.yaml .env.example package.json
git commit -m "feat: add docker compose local stack"
```

Expected: a single commit containing the containerization files and helper scripts.

### Task 4: Refresh README and Add Deployment Operations Documentation

**Files:**
- Modify: `README.md`
- Create: `docs/deployment.md`

- [ ] **Step 1: Rewrite the README quick-start around two supported paths**

Update the top half of `README.md` so the startup flow begins with:

```md
## 快速开始

### 方式一：Docker Compose（推荐）

1. 复制 `.env.example` 为 `.env`
2. 运行 `pnpm setup`
3. 运行 `pnpm docker:up`
4. 打开 `http://localhost:3000`

### 方式二：本机开发

1. 准备 PostgreSQL
2. 复制 `.env.example` 为 `.env`
3. 运行 `pnpm setup`
4. 运行 `pnpm prisma:migrate:dev`
5. 运行 `pnpm dev`
```

Keep the existing product overview, screenshot, and feature list, but shorten the long manual setup section so it points to `docs/deployment.md` for the operational details.

- [ ] **Step 2: Add the dedicated deployment document**

Create `docs/deployment.md`:

```md
# 部署指南

## Docker Compose

适合第一次体验或轻量自托管。

1. 复制 `.env.example` 为 `.env`
2. 执行 `pnpm setup`
3. 执行 `pnpm docker:up`
4. 首次启动后执行数据库迁移：
   `pnpm prisma:migrate:deploy`

## 本机开发

1. 准备 PostgreSQL 数据库
2. 配置 `.env`
3. 执行 `pnpm setup`
4. 执行 `pnpm prisma:migrate:dev`
5. 执行 `pnpm dev`

## 上传目录

- 默认目录：`./data/uploads`
- Docker 容器内目录：`/app/data/uploads`

## 备份建议

- PostgreSQL 数据库
- `data/uploads` 附件目录

## 可选增强

- Tailscale
- Caddy / Nginx
```

- [ ] **Step 3: Sanity-check the docs against actual commands**

Run:

```powershell
pnpm setup
pnpm docker:down
```

Expected: the commands referenced by the docs exist and return recognizable CLI output without "missing script" errors.

- [ ] **Step 4: Commit the documentation refresh**

Run:

```powershell
git add README.md docs/deployment.md
git commit -m "docs: improve onboarding and deployment guides"
```

Expected: a single docs-focused commit with no unrelated code changes.

### Task 5: Add Focused Tests for Startup and Core API Paths

**Files:**
- Create: `tests/categories-route.test.ts`
- Create: `tests/notes-route.test.ts`
- Modify: `tests/auth-login-route.test.ts` (only if a shared test helper is needed)

- [ ] **Step 1: Write the new API tests**

Create `tests/categories-route.test.ts`:

```ts
import "dotenv/config";

import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    category: {
      findMany: prismaMocks.findMany,
      create: prismaMocks.create,
    },
  },
}));

describe("categories route", () => {
  beforeEach(() => {
    prismaMocks.findMany.mockReset();
    prismaMocks.create.mockReset();
  });

  it("returns categories sorted from the prisma layer", async () => {
    prismaMocks.findMany.mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        name: "工作",
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);

    const { GET } = await import("../app/api/categories/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].name).toBe("工作");
  });
});
```

Create `tests/notes-route.test.ts`:

```ts
import "dotenv/config";

import { beforeEach, describe, expect, it, vi } from "vitest";

const searchNotesMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db-search", () => ({
  searchNotes: searchNotesMock,
}));

describe("notes route", () => {
  beforeEach(() => {
    searchNotesMock.mockReset();
  });

  it("returns paginated note search results", async () => {
    searchNotesMock.mockResolvedValue({
      data: [
        {
          id: "22222222-2222-2222-2222-222222222222",
          categoryId: "33333333-3333-3333-3333-333333333333",
          title: "第一条笔记",
          contentPreview: "hello",
          starred: false,
          pinned: false,
          categoryName: "默认",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      total: 1,
      totalPages: 1,
    });

    const { GET } = await import("../app/api/notes/route");
    const response = await GET(new Request("http://localhost/api/notes?page=1&pageSize=20"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.pagination.total).toBe(1);
    expect(payload.data[0].title).toBe("第一条笔记");
  });
});
```

- [ ] **Step 2: Run the targeted API tests**

Run:

```powershell
pnpm test -- tests/categories-route.test.ts tests/notes-route.test.ts
```

Expected: if the mocks or imports are miswired, these tests fail first and are then fixed until both pass.

- [ ] **Step 3: Adjust mocking seams only if the tests expose a real gap**

If route files are hard to isolate because a module executes on import, make the smallest possible change to support testability. Prefer changes like:

```ts
export function getCategoriesRepository() {
  return prisma.category;
}
```

Do not rewrite route structure just to satisfy the tests.

- [ ] **Step 4: Run the full test suite**

Run:

```powershell
pnpm test
```

Expected: the original tests plus the new setup/API tests all pass.

- [ ] **Step 5: Commit the new test coverage**

Run:

```powershell
git add tests/categories-route.test.ts tests/notes-route.test.ts tests/setup-preflight.test.ts
git commit -m "test: cover core startup and api paths"
```

Expected: a single test-focused commit, plus any tiny production code seam needed to enable the tests.

### Task 6: Final Verification and Release Readiness Check

**Files:**
- Modify: any files needed to address verification failures discovered in this task

- [ ] **Step 1: Run the full verification suite**

Run:

```powershell
pnpm test
pnpm lint
pnpm build
```

Expected:

- tests: PASS
- lint: PASS
- build: PASS

- [ ] **Step 2: Review the final branch diff**

Run:

```powershell
git status --short
git log --oneline --decorate -5
git diff main...HEAD --stat
```

Expected: the branch contains only the intended Phase 1 changes and the commit history is readable.

- [ ] **Step 3: Smoke-check the documented startup paths**

Run:

```powershell
pnpm setup
docker compose config
```

Expected: the setup workflow and Docker config both succeed without command-name drift from the docs.

- [ ] **Step 4: Prepare the branch for review**

Run:

```powershell
git status --short --branch
```

Expected: the feature branch is clean and ready for code review or PR creation.

## Self-Review

Spec coverage:

- Docker onboarding: covered by Task 3 and Task 4
- setup workflow: covered by Task 2
- docs refresh: covered by Task 4
- targeted tests: covered by Task 5
- verification and version-control readiness: covered by Task 1 and Task 6

Completeness check:

- No unfinished markers or deferred work notes remain in the task list.

Type consistency:

- `validateSetupEnv` is used consistently in setup tests and the setup workflow.
- Docker command names match the planned `package.json` scripts.
- The branch name is used consistently throughout the plan.
