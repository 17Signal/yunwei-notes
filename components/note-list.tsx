"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Pin, PinOff, Search, Star, StarOff, StickyNote, Trash2 } from "lucide-react";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDisplayDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { NoteListItem, Pagination } from "@/types/domain";

type NoteListProps = {
  notes: NoteListItem[];
  selectedNoteId?: string;
  search: string;
  pagination: Pagination;
  loading?: boolean;
  onSelectNote: (noteId: string) => void;
  onSearchChange: (nextSearch: string) => void;
  onCreateNote: () => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onToggleStarred: (noteId: string, value: boolean) => Promise<void>;
  onTogglePinned: (noteId: string, value: boolean) => Promise<void>;
  onPageChange: (page: number) => void;
};

export function NoteList({
  notes,
  selectedNoteId,
  search,
  pagination,
  loading = false,
  onSelectNote,
  onSearchChange,
  onCreateNote,
  onDeleteNote,
  onToggleStarred,
  onTogglePinned,
  onPageChange,
}: NoteListProps) {
  const reduceMotion = useReducedMotion();
  const [searchDraft, setSearchDraft] = useState(search);

  useEffect(() => {
    setSearchDraft(search);
  }, [search]);

  useEffect(() => {
    // Avoid triggering a new query when the draft value is already in sync.
    if (searchDraft === search) {
      return;
    }

    const timer = window.setTimeout(() => {
      onSearchChange(searchDraft);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [onSearchChange, search, searchDraft]);

  const listLabel = useMemo(
    () => `${pagination.total} 条记录，当前第 ${pagination.page}/${pagination.totalPages} 页`,
    [pagination.page, pagination.total, pagination.totalPages]
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card/90 p-3 shadow-card">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
            <h2 className="text-base font-semibold">笔记列表</h2>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              try {
                await onCreateNote();
              } catch {
                // Errors are surfaced by the API layer toast in AppShell.
              }
            }}
          >
            <StickyNote className="h-4 w-4" />
            新建
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchDraft}
            className="pl-9"
            placeholder="搜索标题或内容..."
            onChange={(event) => setSearchDraft(event.target.value)}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{listLabel}</p>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {notes.map((note) => {
              const active = selectedNoteId === note.id;

              return (
                <motion.div
                  key={note.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "group rounded-lg border p-2.5 transition-colors",
                    active ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card hover:bg-muted/30"
                  )}
                >
                  <button type="button" className="w-full cursor-pointer text-left" onClick={() => onSelectNote(note.id)}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h3 className="line-clamp-1 text-sm font-semibold">{note.title}</h3>
                      <div className="flex items-center gap-1">
                        {note.pinned ? <Badge variant="secondary">置顶</Badge> : null}
                        {note.starred ? <Badge variant="outline">收藏</Badge> : null}
                      </div>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{note.contentPreview || "空内容"}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{note.categoryName}</span>
                      <span>{formatDisplayDateTime(note.updatedAt)}</span>
                    </div>
                  </button>
                  <div className="mt-2 flex items-center justify-end gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={async () => {
                        try {
                          await onTogglePinned(note.id, !note.pinned);
                        } catch {
                          // Errors are surfaced by the API layer toast in AppShell.
                        }
                      }}
                    >
                      {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      <span className="sr-only">Toggle pinned</span>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={async () => {
                        try {
                          await onToggleStarred(note.id, !note.starred);
                        } catch {
                          // Errors are surfaced by the API layer toast in AppShell.
                        }
                      }}
                    >
                      {note.starred ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                      <span className="sr-only">Toggle starred</span>
                    </Button>
                    <DeleteConfirmDialog
                      title="删除笔记"
                      description={`确认删除「${note.title}」吗？该操作会同时删除关联图片。`}
                      onConfirm={() => onDeleteNote(note.id)}
                      trigger={
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      }
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!loading && notes.length === 0 ? <p className="px-2 py-8 text-center text-sm text-muted-foreground">暂无笔记。</p> : null}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              正在加载...
            </div>
          ) : null}
        </div>
      </ScrollArea>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>
          上一页
        </Button>
        <span className="text-xs text-muted-foreground">
          {pagination.page} / {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
        >
          下一页
        </Button>
      </div>
    </div>
  );
}
