import type { Attachment, Category, Note, NoteListItem, Pagination } from "@/types/domain";

export type ApiSuccess<T> = {
  data: T;
};

export type ApiSuccessWithPagination<T> = {
  data: T;
  pagination: Pagination;
};

export type ApiError = {
  error: string;
  code: string;
  details?: unknown;
};

export type NoteListQuery = {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  q?: string;
  starred?: boolean;
  pinned?: boolean;
};

export type CreateCategoryInput = {
  name: string;
};

export type CreateNoteInput = {
  categoryId: string;
  title: string;
  content: string;
  starred?: boolean;
  pinned?: boolean;
};

export type UpdateNoteInput = Partial<CreateNoteInput>;

export type UploadAttachmentResponse = {
  data: Attachment;
  markdown: string;
};

export type CategoriesResponse = ApiSuccess<Category[]>;
export type NotesListResponse = ApiSuccessWithPagination<NoteListItem[]>;
export type NoteResponse = ApiSuccess<Note>;
