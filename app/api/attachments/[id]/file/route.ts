import fs from "node:fs";
import fsp from "node:fs/promises";
import { Readable } from "node:stream";

import { ZodError } from "zod";

import { apiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { resolveStoredFilePath } from "@/lib/upload";
import { uuidParamSchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Params): Promise<Response> {
  try {
    const { id } = uuidParamSchema.parse(await params);

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      select: {
        storedPath: true,
        mimeType: true,
      },
    });

    if (!attachment) {
      return apiError(404, "Attachment not found.", "ATTACHMENT_NOT_FOUND");
    }

    const absolutePath = resolveStoredFilePath(attachment.storedPath);
    const stat = await fsp.stat(absolutePath);
    const stream = Readable.toWeb(fs.createReadStream(absolutePath)) as ReadableStream<Uint8Array>;

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(stat.size),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "Invalid attachment id.", "VALIDATION_ERROR", error.flatten());
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return apiError(404, "Attachment file not found.", "ATTACHMENT_FILE_NOT_FOUND");
    }
    return apiError(500, "Failed to read attachment.", "ATTACHMENT_READ_FAILED");
  }
}
