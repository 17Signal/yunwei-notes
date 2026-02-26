"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pin, PinOff, Save, Star, StarOff } from "lucide-react";

import { MarkdownPreview } from "@/components/markdown-preview";
import { UploadButton } from "@/components/upload-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Note } from "@/types/domain";

type NoteEditorProps = {
  note: Note | null;
  categories: Category[];
  saving?: boolean;
  onSave: (noteId: string, payload: { title?: string; content?: string; categoryId?: string; starred?: boolean; pinned?: boolean }) => Promise<void>;
  onUpload: (noteId: string, file: File) => Promise<string>;
};

type DraftState = {
  title: string;
  content: string;
  categoryId: string;
  starred: boolean;
  pinned: boolean;
};

export function NoteEditor({ note, categories, saving = false, onSave, onUpload }: NoteEditorProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [starred, setStarred] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftRef = useRef<DraftState>({
    title: "",
    content: "",
    categoryId: "",
    starred: false,
    pinned: false,
  });

  const updateDraft = (patch: Partial<DraftState>) => {
    draftRef.current = { ...draftRef.current, ...patch };
  };

  const getDraftSnapshot = (): DraftState => ({ ...draftRef.current });

  useEffect(() => {
    if (!note) {
      setTitle("");
      setContent("");
      setCategoryId("");
      setStarred(false);
      setPinned(false);
      draftRef.current = {
        title: "",
        content: "",
        categoryId: "",
        starred: false,
        pinned: false,
      };
      return;
    }

    setTitle(note.title);
    setContent(note.content);
    setCategoryId(note.categoryId);
    setStarred(note.starred);
    setPinned(note.pinned);
    draftRef.current = {
      title: note.title,
      content: note.content,
      categoryId: note.categoryId,
      starred: note.starred,
      pinned: note.pinned,
    };
  }, [note]);

  if (!note) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl border border-border/70 bg-card/90 p-6 text-center shadow-card">
        <h2 className="text-base font-semibold">选择一条笔记</h2>
        <p className="mt-2 text-sm text-muted-foreground">从左侧列表选择，或先创建新笔记。</p>
      </div>
    );
  }

  const insertMarkdown = (snippet: string): string => {
    const textarea = textareaRef.current;
    const currentContent = draftRef.current.content;
    if (!textarea) {
      const next = `${currentContent}\n${snippet}\n`;
      updateDraft({ content: next });
      setContent(next);
      return next;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${currentContent.slice(0, start)}${snippet}${currentContent.slice(end)}`;
    updateDraft({ content: next });
    setContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
    });
    return next;
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card/90 p-3 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Editor</p>
          <h2 className="text-base font-semibold">编辑笔记</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const next = !pinned;
                updateDraft({ pinned: next });
                setPinned(next);
                await onSave(note.id, getDraftSnapshot());
              } catch {
                // Errors are surfaced by the API layer toast in AppShell.
              }
            }}
          >
            {pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {pinned ? "取消置顶" : "置顶"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const next = !starred;
                updateDraft({ starred: next });
                setStarred(next);
                await onSave(note.id, getDraftSnapshot());
              } catch {
                // Errors are surfaced by the API layer toast in AppShell.
              }
            }}
          >
            {starred ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
            {starred ? "取消收藏" : "收藏"}
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="note-title">标题</Label>
          <Input
            id="note-title"
            value={title}
            maxLength={200}
            onChange={(event) => {
              const next = event.target.value;
              updateDraft({ title: next });
              setTitle(next);
            }}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="note-category">分类</Label>
          <select
            id="note-category"
            className="h-9 rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={categoryId}
            onChange={(event) => {
              const next = event.target.value;
              updateDraft({ categoryId: next });
              setCategoryId(next);
            }}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="note-content">Markdown 内容</Label>
          <Textarea
            id="note-content"
            ref={textareaRef}
            className="min-h-[220px] resize-y"
            value={content}
            onChange={(event) => {
              const next = event.target.value;
              updateDraft({ content: next });
              setContent(next);
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <UploadButton
          disabled={uploading}
          loading={uploading}
          onFileSelected={async (file) => {
            setUploading(true);
            try {
              const markdown = await onUpload(note.id, file);
              const nextContent = insertMarkdown(`\n${markdown}\n`);
              await onSave(note.id, {
                ...getDraftSnapshot(),
                content: nextContent,
              });
            } catch {
              // Errors are surfaced by the API layer toast in AppShell.
            } finally {
              setUploading(false);
            }
          }}
        />
        <Button
          type="button"
          disabled={saving}
          onClick={async () => {
            try {
              await onSave(note.id, getDraftSnapshot());
            } catch {
              // Errors are surfaced by the API layer toast in AppShell.
            }
          }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </Button>
      </div>

      <div className="grid min-h-0 min-w-0 flex-1 gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">预览</p>
        <div className="min-h-0 min-w-0 overflow-auto">
          <MarkdownPreview content={content} />
        </div>
      </div>
    </div>
  );
}
