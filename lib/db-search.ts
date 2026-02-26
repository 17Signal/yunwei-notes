import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { NoteListItem } from "@/types/domain";

type SearchFilters = {
  page: number;
  pageSize: number;
  q?: string;
  categoryId?: string;
  starred?: boolean;
  pinned?: boolean;
};

type RawNoteRow = {
  id: string;
  category_id: string;
  title: string;
  content: string;
  starred: boolean;
  pinned: boolean;
  created_at: Date;
  updated_at: Date;
  category_name: string;
};

function buildWhereClause(filters: SearchFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [];

  if (filters.q) {
    conditions.push(Prisma.sql`n.search_vector @@ plainto_tsquery('simple', ${filters.q})`);
  }
  if (filters.categoryId) {
    conditions.push(Prisma.sql`n.category_id = ${filters.categoryId}::uuid`);
  }
  if (typeof filters.starred === "boolean") {
    conditions.push(Prisma.sql`n.starred = ${filters.starred}`);
  }
  if (typeof filters.pinned === "boolean") {
    conditions.push(Prisma.sql`n.pinned = ${filters.pinned}`);
  }

  if (conditions.length === 0) {
    return Prisma.empty;
  }

  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

export async function searchNotes(filters: SearchFilters): Promise<{
  data: NoteListItem[];
  total: number;
  totalPages: number;
}> {
  const offset = (filters.page - 1) * filters.pageSize;
  const whereSql = buildWhereClause(filters);

  const rows = await prisma.$queryRaw<RawNoteRow[]>(Prisma.sql`
    SELECT
      n.id,
      n.category_id,
      n.title,
      n.content,
      n.starred,
      n.pinned,
      n.created_at,
      n.updated_at,
      c.name AS category_name
    FROM notes n
    INNER JOIN categories c ON c.id = n.category_id
    ${whereSql}
    ORDER BY n.pinned DESC, n.updated_at DESC
    LIMIT ${filters.pageSize}
    OFFSET ${offset}
  `);

  const [countRow] = await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total
    FROM notes n
    ${whereSql}
  `);

  const total = Number(countRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const data = rows.map((row) => ({
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    contentPreview: row.content.slice(0, 220),
    starred: row.starred,
    pinned: row.pinned,
    categoryName: row.category_name,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));

  return { data, total, totalPages };
}
