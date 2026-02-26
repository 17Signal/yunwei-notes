import type { Attachment as PrismaAttachment, Category as PrismaCategory, Note as PrismaNote } from "@prisma/client";

import { toISODate } from "@/lib/utils";
import type { Attachment, Category } from "@/types/domain";

export function mapCategory(category: PrismaCategory): Category {
  return {
    id: category.id,
    name: category.name,
    createdAt: toISODate(category.createdAt),
    updatedAt: toISODate(category.updatedAt),
  };
}

export function mapAttachment(attachment: PrismaAttachment): Attachment {
  return {
    id: attachment.id,
    noteId: attachment.noteId,
    originalName: attachment.originalName,
    storedName: attachment.storedName,
    storedPath: attachment.storedPath,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: toISODate(attachment.createdAt),
  };
}

export function mapNoteBase(note: PrismaNote) {
  return {
    id: note.id,
    categoryId: note.categoryId,
    title: note.title,
    content: note.content,
    starred: note.starred,
    pinned: note.pinned,
    createdAt: toISODate(note.createdAt),
    updatedAt: toISODate(note.updatedAt),
  };
}
