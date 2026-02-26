export type Category = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteListItem = {
  id: string;
  categoryId: string;
  title: string;
  contentPreview: string;
  starred: boolean;
  pinned: boolean;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
};

export type Attachment = {
  id: string;
  noteId: string;
  originalName: string;
  storedName: string;
  storedPath: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type Note = {
  id: string;
  categoryId: string;
  title: string;
  content: string;
  starred: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  attachments: Attachment[];
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
