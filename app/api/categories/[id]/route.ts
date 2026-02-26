import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { apiError, apiOk } from "@/lib/api";
import { mapCategory } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { categorySchema, uuidParamSchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = uuidParamSchema.parse(await params);
    const payload = categorySchema.parse(await request.json());
    const category = await prisma.category.update({
      where: { id },
      data: { name: payload.name },
    });
    return apiOk(mapCategory(category));
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid request payload.", "VALIDATION_ERROR", error.flatten());
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return apiError(404, "Category not found.", "CATEGORY_NOT_FOUND");
      }
      if (error.code === "P2002") {
        return apiError(409, "Category name already exists.", "CATEGORY_NAME_EXISTS");
      }
    }
    return apiError(500, "Failed to update category.", "CATEGORY_UPDATE_FAILED");
  }
}

export async function DELETE(_: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = uuidParamSchema.parse(await params);
    const noteCount = await prisma.note.count({ where: { categoryId: id } });
    if (noteCount > 0) {
      return apiError(409, "Category still contains notes.", "CATEGORY_HAS_NOTES");
    }

    await prisma.category.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid category id.", "VALIDATION_ERROR", error.flatten());
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return apiError(404, "Category not found.", "CATEGORY_NOT_FOUND");
    }
    return apiError(500, "Failed to delete category.", "CATEGORY_DELETE_FAILED");
  }
}
