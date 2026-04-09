# Deployment Guide

This document is the longer operational reference for running Yunwei Notes.

## Prerequisites

- Node.js 22+
- pnpm
- PostgreSQL 17+ (local mode)
- Docker + Docker Compose plugin (Docker mode)

## Environment Setup

1. Install dependencies:
   `pnpm install`
2. Generate `.env` in one step:
   `pnpm run init:env "your-password"`
3. Run setup:
   `pnpm run setup`

`pnpm run init:env` creates `.env` from `.env.example`, generates a random `SESSION_SECRET`, and writes `APP_PASSWORD_HASH` for the password you provide. If `.env` already exists, it will stop without overwriting it.

`pnpm run setup` validates required environment values, creates the upload directory, and runs `pnpm prisma:generate`.

## Option A: Docker Compose

Recommended for self-hosted deployment on a single machine.

1. Start the stack:
   `pnpm docker:up`
2. Open:
   `http://localhost:3000`
3. Stop stack when needed:
   `pnpm docker:down`
4. Tail logs:
   `pnpm docker:logs`

### Actual Startup Behavior in Docker

The app container command is `pnpm docker:start`. On every container start it will:

1. Wait for PostgreSQL to be reachable
2. Run `pnpm prisma:migrate:deploy`
3. Start Next.js with `pnpm start --hostname 0.0.0.0 --port 3000`

This means migrations are auto-applied during container startup.

## Option B: Local Development / Local Runtime

1. Ensure PostgreSQL is running and create database `notes_selfhosted`
2. Install dependencies:
   `pnpm install`
3. Generate `.env`:
   `pnpm run init:env "your-password"`
4. Run:
   `pnpm run setup`
5. Apply migrations for local development:
   `pnpm prisma:migrate:dev`
6. Start app:
   `pnpm dev`

For local production-like startup (without Docker), use:

- `pnpm prisma:migrate:deploy`
- `pnpm build`
- `pnpm start --hostname 0.0.0.0 --port 3000`

## Data and Persistence

- Default upload directory (host/local): `./data/uploads`
- Docker container upload directory: `/app/data/uploads`
- Compose named volume for PostgreSQL data: `postgres_data`
- Compose named volume for uploads: `uploads_data`

## Backup Recommendations

At minimum, back up:

- PostgreSQL database (`notes_selfhosted`)
- Uploaded files (`data/uploads` or Docker upload volume)

Recommended cadence:

- Daily logical DB backup (`pg_dump`)
- Daily upload directory/volume backup
- Regular restore drills

## Reverse Proxy and Network Access

Optional hardening and access setup:

- Reverse proxy: Caddy or Nginx
- Private remote access: Tailscale
- TLS certificate management at the proxy layer

## Troubleshooting

- `Missing .env file`: create `.env` from `.env.example`, then run `pnpm run setup`
- `Refusing to overwrite .env`: rename or edit your existing `.env` manually, or remove it before rerunning `pnpm run init:env`
- `SESSION_SECRET must be at least 32 characters`: update `.env`, rerun setup
- Login fails with bcrypt parse/compare issues: confirm `APP_PASSWORD_HASH` includes escaped `$` in `.env` (for example `\$2b\$12\$...`)
- Docker app container exits early: check `pnpm docker:logs` for migration or DB readiness errors
