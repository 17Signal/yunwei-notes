"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Loader2,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDisplayDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { NoteListItem, Pagination } from "@/types/domain";

type Props = {
  notes: NoteListItem[];
  selectedNoteId?: string;
  title: string;
  search: string;
  pagination: Pagination;
  loading: boolean;
  creating: boolean;
  busy: boolean;
  hasCategories: boolean;
  draftIds: string[];
  error: boolean;
  onRetry: () => void;
  onSelectNote: (id: string) => void;
  onSearchChange: (search: string) => void;
  onCreateNote: () => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
  onToggleStarred: (id: string, value: boolean) => Promise<void>;
  onTogglePinned: (id: string, value: boolean) => Promise<void>;
  onPageChange: (page: number) => void;
};

export function NoteList({
  notes,
  selectedNoteId,
  title,
  search,
  pagination,
  loading,
  creating,
  busy,
  hasCategories,
  draftIds,
  error,
  onRetry,
  onSelectNote,
  onSearchChange,
  onCreateNote,
  onDeleteNote,
  onToggleStarred,
  onTogglePinned,
  onPageChange,
}: Props) {
  const [searchDraft, setSearchDraft] = useState(search);
  const [previousSearch, setPreviousSearch] = useState(search);
  if (search !== previousSearch) {
    setPreviousSearch(search);
    setSearchDraft(search);
  }
  const [composing, setComposing] = useState(false);
  const searchCallback = useRef(onSearchChange);
  useEffect(() => {
    searchCallback.current = onSearchChange;
  }, [onSearchChange]);
  useEffect(() => {
    if (searchDraft === search || composing) return;
    const timer = setTimeout(() => searchCallback.current(searchDraft), 300);
    return () => clearTimeout(timer);
  }, [searchDraft, search, composing]);

  return (
    <div className="panel note-list-panel">
      <div className="px-4 pb-4 pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow mb-1.5">你的记录</p>
            <h2 className="truncate text-lg font-semibold" title={title}>
              {title}
            </h2>
          </div>
          <Button
            size="icon"
            aria-label="新建笔记"
            title={hasCategories ? "新建笔记" : "请先创建分类"}
            disabled={creating}
            onClick={() => void onCreateNote()}
          >
            {creating ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={20} />
            )}
          </Button>
        </div>
        <div className="relative">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-3 text-muted-foreground"
          />
          <Input
            value={searchDraft}
            aria-label="搜索笔记"
            maxLength={200}
            className="h-10 border-transparent bg-muted/70 pl-9 pr-8 shadow-none"
            placeholder="搜索标题或内容…"
            onCompositionStart={() => setComposing(true)}
            onCompositionEnd={() => setComposing(false)}
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          {searchDraft && (
            <button
              type="button"
              className="absolute right-2 top-2 rounded p-1 text-muted-foreground"
              aria-label="清除搜索"
              onClick={() => {
                setSearchDraft("");
                onSearchChange("");
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <p
          className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {loading ? (
            <>
              <Loader2 size={12} className="animate-spin" />
              正在查找…
            </>
          ) : (
            `${pagination.total} 篇笔记`
          )}
          {!loading && search && <span>· 搜索结果</span>}
        </p>
      </div>
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-3"
        aria-busy={loading}
      >
        {notes.map((note) => (
          <article
            key={note.id}
            className={cn(
              "note-item group",
              selectedNoteId === note.id && "active",
            )}
          >
            <button
              type="button"
              className="block w-full text-left"
              aria-current={selectedNoteId === note.id ? "true" : undefined}
              onClick={() => onSelectNote(note.id)}
            >
              <div className="mb-2 flex items-center gap-2">
                <h3 className="line-clamp-1 min-w-0 flex-1 text-sm font-semibold">
                  {note.title}
                </h3>
                {note.pinned && (
                  <Pin size={12} className="shrink-0 text-primary" />
                )}
                {note.starred && (
                  <Star
                    size={12}
                    className="shrink-0 fill-amber-500 text-amber-500"
                  />
                )}
              </div>
              <p className="line-clamp-2 min-h-10 break-words text-xs leading-5 text-muted-foreground">
                {note.contentPreview
                  .replace(/^[#>*\-]+\s/gm, "")
                  .replace(/[`*_]/g, "") || "还没有内容，写下第一句话吧。"}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="max-w-24 truncate rounded bg-muted px-1.5 py-0.5">
                  {note.categoryName}
                </span>
                <time
                  className="ml-auto whitespace-nowrap"
                  dateTime={note.updatedAt}
                >
                  {formatDisplayDateTime(note.updatedAt).slice(5, 16)}
                </time>
              </div>
            </button>
            <div className="mt-2 flex items-center justify-end gap-0.5">
              {draftIds.includes(note.id) && (
                <span className="mr-auto text-[10px] text-amber-700">
                  未保存草稿
                </span>
              )}
              <div className="flex opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={busy}
                  aria-label={`${note.pinned ? "取消置顶" : "置顶"} ${note.title}`}
                  onClick={() =>
                    void onTogglePinned(note.id, !note.pinned).catch(() => {})
                  }
                >
                  <Pin size={13} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={busy}
                  aria-label={`${note.starred ? "取消收藏" : "收藏"} ${note.title}`}
                  onClick={() =>
                    void onToggleStarred(note.id, !note.starred).catch(() => {})
                  }
                >
                  <Star size={13} />
                </Button>
                <DeleteConfirmDialog
                  title="删除笔记"
                  description={`确认删除「${note.title}」？笔记、当前草稿和关联图片将一并删除，无法撤销。`}
                  onConfirm={() => onDeleteNote(note.id)}
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      disabled={busy}
                      aria-label={`删除笔记 ${note.title}`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  }
                />
              </div>
            </div>
          </article>
        ))}
        {error && (
          <div className="p-6 text-center text-sm">
            <p className="mb-3 text-muted-foreground">暂时无法加载笔记</p>
            <Button variant="outline" onClick={onRetry}>
              重新加载
            </Button>
          </div>
        )}
        {!loading && !error && !notes.length && (
          <div className="px-3 py-12 text-center">
            <FileSearch
              size={30}
              strokeWidth={1.3}
              className="mx-auto mb-4 text-muted-foreground/60"
            />
            <p className="text-sm font-medium">
              {search ? "没有找到相关笔记" : "这里还没有笔记"}
            </p>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              {search
                ? "换个关键词试试，或清除搜索。"
                : "点击右上角的 +，开始记录。"}
            </p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t px-4 py-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="上一页"
          disabled={loading || pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          {pagination.page} / {pagination.totalPages}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="下一页"
          disabled={loading || pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
