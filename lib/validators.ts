import { z } from "zod";

import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@/lib/constants";
import { clamp, parsePositiveInt } from "@/lib/utils";

export const loginSchema = z.object({
  password: z.string().min(1, "Password is required."),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(80),
});

export const createNoteSchema = z.object({
  categoryId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(200000).default(""),
  starred: z.boolean().optional().default(false),
  pinned: z.boolean().optional().default(false),
});

export const updateNoteSchema = z
  .object({
    categoryId: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(200).optional(),
    content: z.string().max(200000).optional(),
    starred: z.boolean().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const attachmentFormSchema = z.object({
  noteId: z.string().uuid(),
});

export type NoteQueryInput = {
  page: number;
  pageSize: number;
  categoryId?: string;
  q?: string;
  starred?: boolean;
  pinned?: boolean;
};

const booleanQueryParamSchema = z.preprocess(
  (value) => {
    if (value === null || value === "") {
      return undefined;
    }
    return value;
  },
  z.enum(["true", "false"]).transform((value) => value === "true").optional()
);

export function parseNoteQuery(searchParams: URLSearchParams): NoteQueryInput {
  const page = parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = clamp(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), 1, MAX_PAGE_SIZE);

  const categoryId = searchParams.get("categoryId")?.trim() || undefined;
  const q = searchParams.get("q")?.trim() || undefined;

  const payload = {
    page,
    pageSize,
    categoryId,
    q,
    starred: searchParams.get("starred"),
    pinned: searchParams.get("pinned"),
  };

  const parsed = z
    .object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE),
      categoryId: z.string().uuid().optional(),
      q: z.string().max(200).optional(),
      starred: booleanQueryParamSchema,
      pinned: booleanQueryParamSchema,
    })
    .parse(payload);

  return parsed;
}
