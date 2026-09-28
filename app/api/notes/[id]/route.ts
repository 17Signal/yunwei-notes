import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { readJson, apiError, apiOk } from "@/lib/api";
import { mapAttachment, mapCategory, mapNoteBase } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/upload";
import { updateNoteSchema, uuidParamSchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(
  _: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = uuidParamSchema.parse(await params);
    const note = await prisma.note.findUnique({
      where: { id },
      include: {
        category: true,
        attachments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!note) {
      return apiError(404, "Note not found.", "NOTE_NOT_FOUND");
    }

    return apiOk({
      ...mapNoteBase(note),
      category: mapCategory(note.category),
      attachments: note.attachments.map(mapAttachment),
    });
  } catch (error) {
    if (error instanceof SyntaxError)
      return apiError(400, "Invalid JSON payload.", "VALIDATION_ERROR");
    if (error instanceof ZodError) {
      return apiError(
        400,
        "Invalid note id.",
        "VALIDATION_ERROR",
        error.flatten(),
      );
    }
    return apiError(500, "Failed to load note.", "NOTE_FETCH_FAILED");
  }
}

export async function PATCH(
  request: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = uuidParamSchema.parse(await params);
    const payload = updateNoteSchema.parse(await readJson(request));
    const note = await prisma.note.update({
      where: {
        id,
        ...(payload.expectedVersion
          ? { version: payload.expectedVersion }
          : {}),
      },
      data: {
        version: { increment: 1 },
        ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.content !== undefined ? { content: payload.content } : {}),
        ...(payload.starred !== undefined ? { starred: payload.starred } : {}),
        ...(payload.pinned !== undefined ? { pinned: payload.pinned } : {}),
      },
      include: {
        category: true,
        attachments: { orderBy: { createdAt: "desc" } },
      },
    });

    return apiOk({
      ...mapNoteBase(note),
      category: mapCategory(note.category),
      attachments: note.attachments.map(mapAttachment),
    });
  } catch (error) {
    if (error instanceof SyntaxError)
      return apiError(400, "Invalid JSON payload.", "VALIDATION_ERROR");
    if (error instanceof ZodError) {
      return apiError(
        400,
        "Invalid request payload.",
        "VALIDATION_ERROR",
        error.flatten(),
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        const { id } = await params;
        if (
          await prisma.note.findUnique({ where: { id }, select: { id: true } })
        ) {
          return apiError(
            409,
            "笔记已在其他位置更新。请先导出当前草稿，再重新载入笔记。",
            "NOTE_CONFLICT",
          );
        }
        return apiError(404, "Note not found.", "NOTE_NOT_FOUND");
      }
      if (error.code === "P2003") {
        return apiError(404, "Category not found.", "CATEGORY_NOT_FOUND");
      }
    }
    return apiError(500, "Failed to update note.", "NOTE_UPDATE_FAILED");
  }
}

export async function DELETE(
  _: Request,
  { params }: Params,
): Promise<NextResponse> {
  try {
    const { id } = uuidParamSchema.parse(await params);
    const attachments = await prisma.attachment.findMany({
      where: { noteId: id },
      select: { storedPath: true },
    });

    await prisma.note.delete({ where: { id } });

    await Promise.allSettled(
      attachments.map((attachment) => deleteStoredFile(attachment.storedPath)),
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof SyntaxError)
      return apiError(400, "Invalid JSON payload.", "VALIDATION_ERROR");
    if (error instanceof ZodError) {
      return apiError(
        400,
        "Invalid note id.",
        "VALIDATION_ERROR",
        error.flatten(),
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return apiError(404, "Note not found.", "NOTE_NOT_FOUND");
    }
    return apiError(500, "Failed to delete note.", "NOTE_DELETE_FAILED");
  }
}
