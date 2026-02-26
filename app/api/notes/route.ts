import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { apiError, apiOk, apiOkWithPagination } from "@/lib/api";
import { searchNotes } from "@/lib/db-search";
import { mapNoteBase } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { createNoteSchema, parseNoteQuery } from "@/lib/validators";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseNoteQuery(searchParams);

    const result = await searchNotes(query);
    return apiOkWithPagination(result.data, {
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid query parameters.", "VALIDATION_ERROR", error.flatten());
    }
    return apiError(500, "Failed to load notes.", "NOTES_FETCH_FAILED");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = createNoteSchema.parse(await request.json());
    const note = await prisma.note.create({
      data: {
        categoryId: payload.categoryId,
        title: payload.title,
        content: payload.content,
        starred: payload.starred,
        pinned: payload.pinned,
      },
      include: {
        category: true,
        attachments: true,
      },
    });

    return apiOk(
      {
        ...mapNoteBase(note),
        category: {
          id: note.category.id,
          name: note.category.name,
          createdAt: note.category.createdAt.toISOString(),
          updatedAt: note.category.updatedAt.toISOString(),
        },
        attachments: [],
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid request payload.", "VALIDATION_ERROR", error.flatten());
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return apiError(404, "Category not found.", "CATEGORY_NOT_FOUND");
    }
    return apiError(500, "Failed to create note.", "NOTE_CREATE_FAILED");
  }
}
