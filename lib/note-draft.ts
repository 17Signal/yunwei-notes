import type { Note } from "@/types/domain";

export type NoteDraft = Pick<Note, "title" | "content" | "categoryId"> & {
  expectedVersion: number;
};

export function draftFromNote(note: Note): NoteDraft {
  return {
    title: note.title,
    content: note.content,
    categoryId: note.categoryId,
    expectedVersion: note.version,
  };
}

export function sameDraft(a: NoteDraft, b: NoteDraft): boolean {
  return (
    a.title === b.title &&
    a.content === b.content &&
    a.categoryId === b.categoryId
  );
}

// A save acknowledges only its submitted snapshot; keep later keystrokes.
export function reconcileSavedDraft(
  current: NoteDraft | undefined,
  submitted: NoteDraft,
  saved: Note,
): NoteDraft | undefined {
  if (!current || sameDraft(current, submitted)) return undefined;
  return { ...current, expectedVersion: saved.version };
}
