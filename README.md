# Yunwei Notes

Yunwei Notes is a self-hosted notes app built with Next.js + Prisma + PostgreSQL.  
It includes category/note CRUD, Markdown editing and preview, attachment uploads, full-text search, starred/pinned states, and mobile-friendly UI.

## Interface Preview

![Yunwei Notes UI preview](./docs/screenshots/app-overview.png)

## Tech Stack

- Next.js 16 + React 19 + TypeScript
- TailwindCSS + shadcn/ui style components
- Framer Motion
- Prisma + PostgreSQL
- PostgreSQL Full Text Search (`tsvector` + `GIN`)

## Quick Start

### Path 1: Docker Compose (recommended)

1. Copy env file: `Copy-Item .env.example .env`
2. Replace `SESSION_SECRET` in `.env` with a real random secret (minimum 32 characters). Do not keep the example placeholder.
3. Install dependencies: `pnpm install`
4. Generate password hash and set `APP_PASSWORD_HASH` in `.env`:
   `node scripts/hash-password.mjs "your-password"`
5. Run setup: `pnpm run setup`
6. Start containers: `pnpm docker:up`
7. Open `http://localhost:3000`

Docker startup behavior in this branch:

- The app container runs `pnpm docker:start`
- It waits for PostgreSQL to become ready
- It auto-runs `pnpm prisma:migrate:deploy`
- Then it starts Next.js on port `3000`

### Path 2: Local Development

1. Prepare PostgreSQL and create database `notes_selfhosted`
2. Copy env file: `Copy-Item .env.example .env`
3. Replace `SESSION_SECRET` in `.env` with a real random secret (minimum 32 characters). Do not keep the example placeholder.
4. Install dependencies: `pnpm install`
5. Generate password hash and set `APP_PASSWORD_HASH` in `.env`:
   `node scripts/hash-password.mjs "your-password"`
6. Run setup: `pnpm run setup`
7. Apply development migrations: `pnpm prisma:migrate:dev`
8. Start dev server: `pnpm dev`

## Features

- Category CRUD
- Note CRUD (belongs to category)
- `starred` and `pinned` note states
- Notes ordering by `pinned DESC, updated_at DESC`
- Full-text search on title + content
- Note pagination
- Delete confirmation
- Attachment upload to `./data/uploads` and Markdown insertion
- Login page + HttpOnly session cookie

## Deployment and Operations

For production/deployment details, backup guidance, runtime commands, and troubleshooting, see:

- [docs/deployment.md](./docs/deployment.md)

## Common Commands

- `pnpm run setup`
- `pnpm dev`
- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm docker:up`
- `pnpm docker:down`
- `pnpm docker:logs`
