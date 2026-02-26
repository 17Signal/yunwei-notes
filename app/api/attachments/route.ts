import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { apiError } from "@/lib/api";
import { mapAttachment } from "@/lib/mappers";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveUploadedImage, UploadValidationError } from "@/lib/upload";
import { attachmentFormSchema } from "@/lib/validators";

export async function POST(request: Request): Promise<NextResponse> {
  let uploadedPath: string | null = null;

  try {
    const formData = await request.formData();
    const noteId = formData.get("noteId");
    const file = formData.get("file");

    const parsed = attachmentFormSchema.parse({ noteId });
    if (!(file instanceof File)) {
      return apiError(400, "File is required.", "VALIDATION_ERROR");
    }

    const note = await prisma.note.findUnique({
      where: { id: parsed.noteId },
      select: { id: true },
    });
    if (!note) {
      return apiError(404, "Note not found.", "NOTE_NOT_FOUND");
    }

    const uploaded = await saveUploadedImage(file);
    uploadedPath = uploaded.storedPath;

    const attachment = await prisma.attachment.create({
      data: {
        noteId: parsed.noteId,
        originalName: uploaded.originalName,
        storedName: uploaded.storedName,
        storedPath: uploaded.storedPath,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
      },
    });

    const markdown = `![${uploaded.originalName}](/api/attachments/${attachment.id}/file)`;

    return NextResponse.json(
      {
        data: mapAttachment(attachment),
        markdown,
      },
      { status: 201 }
    );
  } catch (error) {
    if (uploadedPath) {
      await Promise.allSettled([deleteStoredFile(uploadedPath)]);
    }
    if (error instanceof ZodError) {
      return apiError(400, "Invalid upload payload.", "VALIDATION_ERROR", error.flatten());
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return apiError(404, "Note not found.", "NOTE_NOT_FOUND");
    }
    if (error instanceof UploadValidationError) {
      return apiError(400, error.message, "ATTACHMENT_UPLOAD_INVALID");
    }
    return apiError(500, "Failed to upload attachment.", "ATTACHMENT_UPLOAD_FAILED");
  }
}
