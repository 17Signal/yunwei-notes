type PrismaConfigEnv = Record<string, string | undefined>;

const PRISMA_FALLBACK_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/notes_selfhosted?schema=public";

export function getPrismaDatasourceUrl(env: PrismaConfigEnv): string {
  return env.DATABASE_URL?.trim() || PRISMA_FALLBACK_DATABASE_URL;
}
