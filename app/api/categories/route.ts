import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { apiError, apiOk } from "@/lib/api";
import { mapCategory } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validators";

export async function GET(): Promise<NextResponse> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });
    return apiOk(categories.map(mapCategory));
  } catch {
    return apiError(500, "Failed to load categories.", "CATEGORIES_FETCH_FAILED");
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const payload = categorySchema.parse(await request.json());
    const category = await prisma.category.create({
      data: { name: payload.name },
    });
    return apiOk(mapCategory(category), { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid request payload.", "VALIDATION_ERROR", error.flatten());
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError(409, "Category name already exists.", "CATEGORY_NAME_EXISTS");
    }
    return apiError(500, "Failed to create category.", "CATEGORY_CREATE_FAILED");
  }
}
