"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  BookOpen,
  Check,
  Code2,
  Columns2,
  Download,
  FileText,
  Heading2,
  Loader2,
  PenLine,
  Pin,
  Save,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { MarkdownPreview } from "@/components/markdown-preview";
import { UploadButton } from "@/components/upload-button";
import { Button } from "@/components/ui/button";
import { formatDisplayDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { NoteDraft } from "@/lib/note-draft";
import type { Category, Note } from "@/types/domain";

type Props = {
  note: Note | null;
  draft: NoteDraft | null;
  dirty: boolean;
  categories: Category[];
  saving: boolean;
  uploading: boolean;
  loading: boolean;
  onDraftChange: (draft: NoteDraft) => void;
  onSave: (id: string, draft: NoteDraft) => Promise<void>;
  onToggle: (
    id: string,
    payload: { starred?: boolean; pinned?: boolean },
  ) => Promise<void>;
  onUpload: (id: string, file: File) => Promise<void>;
  onCreate: () => Promise<void>;
};

export function NoteEditor({
  note,
  draft,
  dirty,
  categories,
  saving,
  uploading,
  loading,
  onDraftChange,
  onSave,
  onToggle,
  onUpload,
  onCreate,
}: Props) {
  const [mode, setMode] = useState<"edit" | "split" | "preview">("split");
  const [saveError, setSaveError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  const saveBusy = useRef(false);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const save = useCallback(async () => {
    const snapshot = draftRef.current;
    if (!note || !snapshot || saving || saveBusy.current || uploading || !dirty)
      return;
    if (!snapshot.title.trim()) {
      toast.error("请填写笔记标题。");
      return;
    }
    saveBusy.current = true;
    setSaveError("");
    try {
      await onSave(note.id, snapshot);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "保存失败，草稿仍保留在当前页面。",
      );
    } finally {
      saveBusy.current = false;
    }
  }, [note, saving, uploading, dirty, onSave]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [save]);

  const update = (patch: Partial<NoteDraft>) => {
    if (!draftRef.current) return;
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    onDraftChange(next);
  };

  const insert = (before: string, after = "", placeholder = "") => {
    const current = draftRef.current;
    if (!current) return;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? current.content.length;
    const end = textarea?.selectionEnd ?? start;
    const selected = current.content.slice(start, end) || placeholder;
    const content =
      current.content.slice(0, start) +
      before +
      selected +
      after +
      current.content.slice(end);
    if (content.length > 200000) {
      toast.error("笔记内容不能超过 200,000 个字符。");
      return;
    }
    update({ content });
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    });
  };

  if (loading)
    return (
      <div
        className="panel flex h-full min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="animate-spin" size={18} />
        正在打开笔记…
      </div>
    );
  if (!note || !draft)
    return (
      <div className="panel empty-editor">
        <div className="empty-illustration">
          <FileText size={38} strokeWidth={1.2} />
        </div>
        <p className="eyebrow mt-7">A SPACE FOR YOUR IDEAS</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">
          从一个想法开始
        </h2>
        <p className="mt-3 max-w-64 text-sm leading-7 text-muted-foreground">
          整理日常记录，收藏值得留下的灵感。
          <br />
          选择一条笔记，或开始新的篇章。
        </p>
        <Button className="mt-6" onClick={() => void onCreate()}>
          <PenLine size={16} />
          写一条笔记
        </Button>
        <p className="mt-8 text-xs text-muted-foreground">
          Markdown 编辑 · 图片上传 · 私有存储
        </p>
      </div>
    );

  return (
    <div className="panel editor-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
        <span className="eyebrow flex items-center gap-2">
          <PenLine size={14} />
          写作空间
        </span>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label={note.pinned ? "取消置顶" : "置顶笔记"}
            title={note.pinned ? "取消置顶" : "置顶笔记"}
            aria-pressed={note.pinned}
            disabled={saving}
            className={note.pinned ? "text-primary" : "text-muted-foreground"}
            onClick={() =>
              void onToggle(note.id, { pinned: !note.pinned }).catch(() => {})
            }
          >
            <Pin size={16} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={note.starred ? "取消收藏" : "收藏笔记"}
            title={note.starred ? "取消收藏" : "收藏笔记"}
            aria-pressed={note.starred}
            disabled={saving}
            className={
              note.starred ? "text-amber-600" : "text-muted-foreground"
            }
            onClick={() =>
              void onToggle(note.id, { starred: !note.starred }).catch(() => {})
            }
          >
            <Star size={16} fill={note.starred ? "currentColor" : "none"} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="导出 Markdown"
            title="导出 Markdown（包含当前草稿）"
            onClick={() => {
              const blob = new Blob(
                [`# ${draft.title}\n\n${draft.content}\n`],
                { type: "text/markdown;charset=utf-8" },
              );
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${draft.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").slice(0, 100) || "笔记"}.md`;
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            <Download size={16} />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button
            size="sm"
            disabled={saving || uploading || !dirty}
            onClick={() => void save()}
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}{" "}
            {saving ? "保存中" : "保存"}
          </Button>
        </div>
      </div>

      <div className="px-5 pb-4 pt-5 sm:px-7">
        <label className="sr-only" htmlFor="note-title">
          笔记标题
        </label>
        <input
          id="note-title"
          className="note-title"
          value={draft.title}
          maxLength={200}
          placeholder="给想法起个名字"
          onChange={(event) => update({ title: event.target.value })}
        />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <label className="sr-only" htmlFor="note-category">
            笔记分类
          </label>
          <select
            id="note-category"
            className="max-w-48 rounded-md border bg-muted/50 px-2 py-1.5 text-xs text-foreground"
            value={draft.categoryId}
            onChange={(event) => update({ categoryId: event.target.value })}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <span>更新于 {formatDisplayDateTime(note.updatedAt)}</span>
        </div>
      </div>

      <div className="editor-toolbar">
        <div className="flex items-center gap-0.5">
          {mode !== "preview" && (
            <>
              <Button
                size="icon"
                variant="ghost"
                title="加粗"
                aria-label="加粗"
                onClick={() => insert("**", "**", "加粗文字")}
              >
                <Bold size={15} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="二级标题"
                aria-label="插入标题"
                onClick={() => insert("\n## ", "\n", "标题")}
              >
                <Heading2 size={17} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                title="代码块"
                aria-label="插入代码块"
                onClick={() => insert("\n```\n", "\n```\n", "代码")}
              >
                <Code2 size={17} />
              </Button>
              <span className="mx-1 hidden h-4 w-px bg-border sm:block" />
            </>
          )}
          <UploadButton
            disabled={uploading || saving}
            loading={uploading}
            onFileSelected={async (file) => {
              if (uploading) return;
              try {
                await onUpload(note.id, file);
                toast.success("图片已插入，保存后写入笔记。");
              } catch {
                /* The API layer displays an error; the draft stays intact. */
              }
            }}
          />
        </div>
        <div className="view-switch" role="group" aria-label="编辑视图">
          {(
            [
              { key: "edit", label: "编辑", icon: PenLine },
              { key: "split", label: "分栏", icon: Columns2 },
              { key: "preview", label: "预览", icon: BookOpen },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={mode === key}
              onClick={() => setMode(key)}
              className={cn("view-tab", mode === key && "active")}
            >
              <Icon size={13} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
      {saveError && (
        <p
          className="mx-5 mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
        >
          {saveError} 当前草稿仍保留，可使用右上角导出按钮。
        </p>
      )}
      <div className="editor-content" data-mode={mode}>
        {mode !== "preview" && (
          <div className="source-pane">
            <label className="eyebrow px-5 pt-4" htmlFor="note-content">
              MARKDOWN
            </label>
            <textarea
              id="note-content"
              ref={textareaRef}
              className="markdown-source"
              value={draft.content}
              maxLength={200000}
              spellCheck={false}
              placeholder={
                "在这里写下你的想法…\n\n支持 Markdown、待办清单、表格和代码块。"
              }
              onChange={(event) => update({ content: event.target.value })}
            />
          </div>
        )}
        {mode !== "edit" && (
          <div className="preview-pane">
            <p className="eyebrow px-5 pt-4">实时预览</p>
            <MarkdownPreview content={draft.content} />
          </div>
        )}
      </div>
      <footer className="editor-footer">
        <span
          className={cn(
            "flex items-center gap-1.5",
            dirty ? "text-amber-700" : "text-muted-foreground",
          )}
          role="status"
        >
          {saving ? (
            <Loader2 size={12} className="animate-spin" />
          ) : dirty ? (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          ) : (
            <Check size={13} />
          )}
          {saving ? "正在保存…" : dirty ? "有未保存的修改" : "已保存"}
        </span>
        <span>
          {draft.content.length.toLocaleString("zh-CN")} 字符
          <span className="ml-4 hidden sm:inline">Ctrl / ⌘ + S 保存</span>
        </span>
      </footer>
    </div>
  );
}
