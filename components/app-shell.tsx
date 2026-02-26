"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

import { CategoryPane } from "@/components/category-pane";
import { NoteEditor } from "@/components/note-editor";
import { NoteList } from "@/components/note-list";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "@/lib/constants";
import type { ApiError, ApiSuccess, ApiSuccessWithPagination, UploadAttachmentResponse } from "@/types/api";
import type { Category, Note, NoteListItem, Pagination } from "@/types/domain";

type NoteFilters = {
  page: number;
  pageSize: number;
  categoryId?: string;
  q?: string;
};

const emptyPagination: Pagination = {
  page: DEFAULT_PAGE,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

const MobileNavNoSSR = dynamic(() => import("@/components/mobile-nav").then((module) => module.MobileNav), {
  ssr: false,
});

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function buildNotesQuery(filters: NoteFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.categoryId) {
    params.set("categoryId", filters.categoryId);
  }
  if (filters.q) {
    params.set("q", filters.q);
  }
  return params.toString();
}

export function AppShell() {
  const reduceMotion = useReducedMotion();
  const notesRequestIdRef = useRef(0);
  const noteDetailRequestIdRef = useRef(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [selectedNoteId, setSelectedNoteId] = useState<string>();
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  const [filters, setFilters] = useState<NoteFilters>({
    page: DEFAULT_PAGE,
    pageSize: DEFAULT_PAGE_SIZE,
    q: "",
  });

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingNoteDetail, setLoadingNoteDetail] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const result = await parseResponse<ApiSuccess<Category[]>>(await fetch("/api/categories", { cache: "no-store" }));
      setCategories(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载分类失败。");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const fetchNotes = useCallback(async (nextFilters: NoteFilters) => {
    const requestId = ++notesRequestIdRef.current;
    setLoadingNotes(true);
    try {
      const query = buildNotesQuery(nextFilters);
      const result = await parseResponse<ApiSuccessWithPagination<NoteListItem[]>>(
        await fetch(`/api/notes?${query}`, { cache: "no-store" })
      );

      if (requestId !== notesRequestIdRef.current) {
        return;
      }

      setNotes(result.data);
      setPagination(result.pagination);
      setSelectedNoteId((previous) => {
        if (previous && result.data.some((note) => note.id === previous)) {
          return previous;
        }
        return result.data[0]?.id;
      });
    } catch (error) {
      if (requestId !== notesRequestIdRef.current) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "加载笔记失败。");
    } finally {
      if (requestId === notesRequestIdRef.current) {
        setLoadingNotes(false);
      }
    }
  }, []);

  const fetchNoteDetail = useCallback(async (noteId: string) => {
    const requestId = ++noteDetailRequestIdRef.current;
    setLoadingNoteDetail(true);
    try {
      const result = await parseResponse<ApiSuccess<Note>>(await fetch(`/api/notes/${noteId}`, { cache: "no-store" }));
      if (requestId !== noteDetailRequestIdRef.current) {
        return;
      }
      setSelectedNote(result.data);
    } catch (error) {
      if (requestId !== noteDetailRequestIdRef.current) {
        return;
      }
      toast.error(error instanceof Error ? error.message : "加载笔记详情失败。");
      setSelectedNote(null);
    } finally {
      if (requestId === noteDetailRequestIdRef.current) {
        setLoadingNoteDetail(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    void fetchNotes(filters);
  }, [fetchNotes, filters]);

  useEffect(() => {
    if (!selectedNoteId) {
      noteDetailRequestIdRef.current += 1;
      setLoadingNoteDetail(false);
      setSelectedNote(null);
      return;
    }
    void fetchNoteDetail(selectedNoteId);
  }, [fetchNoteDetail, selectedNoteId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchCategories(), fetchNotes(filters)]);
  }, [fetchCategories, fetchNotes, filters]);

  const handleCreateCategory = useCallback(
    async (name: string) => {
      try {
        const trimmed = name.trim();
        if (!trimmed) {
          toast.error("分类名称不能为空。");
          return;
        }
        await parseResponse<ApiSuccess<Category>>(
          await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
          })
        );
        toast.success("分类已创建。");
        await fetchCategories();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "创建分类失败。");
        throw error;
      }
    },
    [fetchCategories]
  );

  const handleRenameCategory = useCallback(
    async (id: string, name: string) => {
      try {
        const trimmed = name.trim();
        if (!trimmed) {
          toast.error("分类名称不能为空。");
          return;
        }
        await parseResponse<ApiSuccess<Category>>(
          await fetch(`/api/categories/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: trimmed }),
          })
        );
        toast.success("分类已更新。");
        await refreshAll();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "更新分类失败。");
        throw error;
      }
    },
    [refreshAll]
  );

  const handleDeleteCategory = useCallback(
    async (id: string) => {
      try {
        await parseResponse(
          await fetch(`/api/categories/${id}`, {
            method: "DELETE",
          })
        );
        if (filters.categoryId === id) {
          setFilters((previous) => ({
            ...previous,
            page: 1,
            categoryId: undefined,
          }));
        }
        toast.success("分类已删除。");
        await refreshAll();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "删除分类失败。");
        throw error;
      }
    },
    [filters.categoryId, refreshAll]
  );

  const handleCreateNote = useCallback(async () => {
    try {
      const targetCategoryId = filters.categoryId ?? categories[0]?.id;
      if (!targetCategoryId) {
        toast.error("请先创建分类。");
        return;
      }
      const created = await parseResponse<ApiSuccess<Note>>(
        await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoryId: targetCategoryId,
            title: "未命名笔记",
            content: "",
            starred: false,
            pinned: false,
          }),
        })
      );

      setSelectedNoteId(created.data.id);
      setFilters((previous) => ({ ...previous, page: 1, categoryId: previous.categoryId ?? targetCategoryId }));
      toast.success("笔记已创建。");
      await fetchNotes({ ...filters, page: 1, categoryId: filters.categoryId ?? targetCategoryId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建笔记失败。");
      throw error;
    }
  }, [categories, fetchNotes, filters]);

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        await parseResponse(
          await fetch(`/api/notes/${noteId}`, {
            method: "DELETE",
          })
        );
        toast.success("笔记已删除。");
        if (selectedNoteId === noteId) {
          setSelectedNote(null);
        }
        await fetchNotes(filters);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "删除笔记失败。");
        throw error;
      }
    },
    [fetchNotes, filters, selectedNoteId]
  );

  const handlePatchNote = useCallback(
    async (
      noteId: string,
      payload: { title?: string; content?: string; categoryId?: string; starred?: boolean; pinned?: boolean },
      showToast = false
    ) => {
      setSavingNote(true);
      try {
        const updated = await parseResponse<ApiSuccess<Note>>(
          await fetch(`/api/notes/${noteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        );
        if (selectedNoteId === noteId) {
          setSelectedNote(updated.data);
        }
        await fetchNotes(filters);
        if (showToast) {
          toast.success("笔记已保存。");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "保存笔记失败。");
        throw error;
      } finally {
        setSavingNote(false);
      }
    },
    [fetchNotes, filters, selectedNoteId]
  );

  const handleUpload = useCallback(async (noteId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("noteId", noteId);
      formData.append("file", file);

      const uploaded = await parseResponse<UploadAttachmentResponse>(
        await fetch("/api/attachments", {
          method: "POST",
          body: formData,
        })
      );

      setSelectedNote((previous) => {
        if (!previous || previous.id !== noteId) {
          return previous;
        }
        return {
          ...previous,
          attachments: [uploaded.data, ...previous.attachments],
        };
      });

      toast.success("截图上传成功。");
      return uploaded.markdown;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传截图失败。");
      throw error;
    }
  }, []);

  const categoryPanel = useMemo(
    () => (
      <CategoryPane
        categories={categories}
        activeCategoryId={filters.categoryId}
        loading={loadingCategories}
        onSelectCategory={(categoryId) => {
          setFilters((previous) => ({
            ...previous,
            page: 1,
            categoryId,
          }));
        }}
        onCreateCategory={handleCreateCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    ),
    [
      categories,
      filters.categoryId,
      handleCreateCategory,
      handleDeleteCategory,
      handleRenameCategory,
      loadingCategories,
    ]
  );

  const notePanel = useMemo(
    () => (
      <NoteList
        notes={notes}
        selectedNoteId={selectedNoteId}
        search={filters.q ?? ""}
        pagination={pagination}
        loading={loadingNotes}
        onSelectNote={setSelectedNoteId}
        onSearchChange={(nextSearch) => {
          setFilters((previous) => {
            if ((previous.q ?? "") === nextSearch && previous.page === 1) {
              return previous;
            }
            return {
              ...previous,
              page: 1,
              q: nextSearch,
            };
          });
        }}
        onCreateNote={handleCreateNote}
        onDeleteNote={handleDeleteNote}
        onTogglePinned={(noteId, value) => handlePatchNote(noteId, { pinned: value })}
        onToggleStarred={(noteId, value) => handlePatchNote(noteId, { starred: value })}
        onPageChange={(page) => setFilters((previous) => ({ ...previous, page }))}
      />
    ),
    [
      filters.q,
      handleCreateNote,
      handleDeleteNote,
      handlePatchNote,
      loadingNotes,
      notes,
      pagination,
      selectedNoteId,
    ]
  );

  return (
    <motion.main
      className="flex min-h-dvh w-full min-w-0 flex-col gap-3 overflow-x-hidden p-3 md:p-4"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/90 px-4 py-3 shadow-card">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Yunwei Notes</p>
          <h1 className="text-lg font-semibold">云尾笔记 · 你的私有云尾巴</h1>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } finally {
              window.location.href = "/login";
            }
          }}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </header>

      <MobileNavNoSSR categoryPanel={categoryPanel} notePanel={notePanel} />

      <div className="grid min-h-0 min-w-0 flex-1 gap-3 lg:grid-cols-[260px_340px_minmax(0,1fr)]">
        <div className="hidden min-h-0 lg:block">{categoryPanel}</div>
        <div className="hidden min-h-0 lg:block">{notePanel}</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedNoteId ?? "empty-editor"}
            className="min-h-0 min-w-0"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {loadingNoteDetail ? (
              <div className="flex h-full items-center justify-center rounded-xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground shadow-card">
                正在加载笔记...
              </div>
            ) : (
              <NoteEditor
                note={selectedNote}
                categories={categories}
                saving={savingNote}
                onSave={async (noteId, payload) => handlePatchNote(noteId, payload, true)}
                onUpload={handleUpload}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.main>
  );
}
