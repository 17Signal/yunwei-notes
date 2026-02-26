import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { apiError, apiOk } from "@/lib/api";
import { mapAttachment } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile } from "@/lib/upload";
import { uuidParamSchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = uuidParamSchema.parse(await params);
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      return apiError(404, "Attachment not found.", "ATTACHMENT_NOT_FOUND");
    }
    return apiOk(mapAttachment(attachment));
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid attachment id.", "VALIDATION_ERROR", error.flatten());
    }
    return apiError(500, "Failed to load attachment.", "ATTACHMENT_FETCH_FAILED");
  }
}

export async function DELETE(_: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = uuidParamSchema.parse(await params);
    const attachment = await prisma.attachment.findUnique({ where: { id } });
    if (!attachment) {
      return apiError(404, "Attachment not found.", "ATTACHMENT_NOT_FOUND");
    }

    await prisma.attachment.delete({ where: { id } });
    await deleteStoredFile(attachment.storedPath);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid attachment id.", "VALIDATION_ERROR", error.flatten());
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return apiError(404, "Attachment not found.", "ATTACHMENT_NOT_FOUND");
    }
    return apiError(500, "Failed to delete attachment.", "ATTACHMENT_DELETE_FAILED");
  }
}
