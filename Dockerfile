FROM node:22-bookworm-slim AS base
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS build-env
# Prisma config and some server modules require env values during install/build.
ENV DATABASE_URL="postgresql://postgres:postgres@build-placeholder:5432/notes_selfhosted?schema=public"

FROM build-env AS deps
COPY package.json pnpm-lock.yaml prisma.config.ts ./
COPY lib/prisma-config.ts ./lib/prisma-config.ts
COPY prisma ./prisma
RUN SESSION_SECRET='build-only-session-secret-1234567890' \
  APP_PASSWORD_HASH='$2b$12$0123456789012345678901234567890123456789012345678901' \
  pnpm install --frozen-lockfile

FROM build-env AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma:generate
RUN SESSION_SECRET='build-only-session-secret-1234567890' \
  APP_PASSWORD_HASH='$2b$12$0123456789012345678901234567890123456789012345678901' \
  pnpm build

FROM base AS runner
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
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

CMD ["pnpm", "docker:start"]
