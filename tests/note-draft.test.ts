import { describe, expect, it } from "vitest";
import {
  draftFromNote,
  reconcileSavedDraft,
  sameDraft,
} from "@/lib/note-draft";
import type { Note } from "@/types/domain";

const note = {
  title: "标题",
  content: "原文",
  categoryId: "category",
  version: 1,
} as Note;
describe("draft reconciliation", () => {
  it("keeps keystrokes typed while a save is in flight", () => {
    const submitted = { ...draftFromNote(note), content: "提交内容" };
    const current = { ...submitted, content: "提交之后的新内容" };
    const remaining = reconcileSavedDraft(current, submitted, {
      ...note,
      version: 2,
    });
    expect(remaining).toEqual({ ...current, expectedVersion: 2 });
  });
  it("clears only the draft acknowledged by the server", () => {
    const submitted = draftFromNote(note);
    expect(reconcileSavedDraft(submitted, submitted, note)).toBeUndefined();
    expect(reconcileSavedDraft(undefined, submitted, note)).toBeUndefined();
  });
  it("preserves a revert to the original content during an in-flight save", () => {
    const original = draftFromNote(note);
    const submitted = { ...original, content: "改动" };
    expect(
      reconcileSavedDraft(original, submitted, { ...note, version: 2 })
        ?.content,
    ).toBe("原文");
  });
  it("detects category and title changes as well as content changes", () => {
    expect(
      sameDraft(draftFromNote(note), {
        ...draftFromNote(note),
        categoryId: "other",
      }),
    ).toBe(false);
    expect(
      sameDraft(draftFromNote(note), {
        ...draftFromNote(note),
        title: "另一标题",
      }),
    ).toBe(false);
  });
});
