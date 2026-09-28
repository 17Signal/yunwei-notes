"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Cloud, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { CategoryPane } from "@/components/category-pane";
import { MobileNav } from "@/components/mobile-nav";
import { NoteEditor } from "@/components/note-editor";
import { NoteList } from "@/components/note-list";
import { Button } from "@/components/ui/button";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { jsonRequest, requestApi } from "@/lib/client-api";
import {
  draftFromNote,
  reconcileSavedDraft,
  sameDraft,
  type NoteDraft,
} from "@/lib/note-draft";
import type {
  ApiSuccess,
  ApiSuccessWithPagination,
  UploadAttachmentResponse,
} from "@/types/api";
import type { Category, Note, NoteListItem, Pagination } from "@/types/domain";

type Filters = {
  page: number;
  categoryId?: string;
  q: string;
  starred?: boolean;
  pinned?: boolean;
};

export function AppShell() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [filters, setFilters] = useState<Filters>({ page: 1, q: "" });
  const [selectedId, setSelectedId] = useState<string>();
  const [loadedNote, setNote] = useState<Note | null>(null);
  const note = loadedNote?.id === selectedId ? loadedNote : null;
  const [drafts, setDrafts] = useState<Record<string, NoteDraft>>({});
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [failedDetailId, setFailedDetailId] = useState<string>();
  const loadingDetail = Boolean(
    selectedId && !note && failedDetailId !== selectedId,
  );
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingIds, setUploadingIds] = useState<Record<string, boolean>>({});
  const [detailRevision, setDetailRevision] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"categories" | "notes" | null>(
    null,
  );
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const preferredId = useRef<string | undefined>(undefined);
  const mutationBusy = useRef(false);
  const createBusy = useRef(false);
  const filtersRef = useRef(filters);
  const selectionRef = useRef(selectedId);
  const noteCache = useRef(new Map<string, Note>());
  useEffect(() => {
    filtersRef.current = filters;
    selectionRef.current = selectedId;
  }, [filters, selectedId]);
  const report = useCallback(
    (error: unknown) =>
      toast.error(
        error instanceof Error ? error.message : "操作失败，请重试。",
      ),
    [],
  );

  useEffect(() => {
    if (!Object.keys(drafts).length) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [drafts]);

  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      setCategories(
        (await requestApi<ApiSuccess<Category[]>>("/api/categories")).data,
      );
    } catch (error) {
      report(error);
    } finally {
      setLoadingCategories(false);
    }
  }, [report]);

  const fetchNotes = useCallback(
    async (query: Filters) => {
      const requestId = ++listRequest.current;
      setLoadingNotes(true);
      setLoadError(false);
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      for (const key of ["q", "categoryId", "starred", "pinned"] as const) {
        if (query[key] !== undefined && query[key] !== "")
          params.set(key, String(query[key]));
      }
      try {
        const result = await requestApi<
          ApiSuccessWithPagination<NoteListItem[]>
        >(`/api/notes?${params}`);
        if (requestId !== listRequest.current) return;
        if (query.page > result.pagination.totalPages) {
          setFilters((previous) => ({
            ...previous,
            page: result.pagination.totalPages,
          }));
          return;
        }
        setNotes(result.data);
        setPagination(result.pagination);
        const preferred = preferredId.current;
        preferredId.current = undefined;
        setSelectedId(
          (previous) =>
            preferred ??
            (result.data.some((item) => item.id === previous)
              ? previous
              : result.data[0]?.id),
        );
      } catch (error) {
        if (requestId === listRequest.current) {
          report(error);
          setLoadError(true);
        }
      } finally {
        if (requestId === listRequest.current) setLoadingNotes(false);
      }
    },
    [report],
  );

  // These effects synchronize server resources and their loading indicators.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchCategories();
  }, [fetchCategories]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNotes(filters);
  }, [fetchNotes, filters]);
  useEffect(() => {
    const requestId = ++detailRequest.current;
    if (!selectedId) return;
    void requestApi<ApiSuccess<Note>>(`/api/notes/${selectedId}`)
      .then((result) => {
        if (requestId === detailRequest.current) {
          noteCache.current.set(result.data.id, result.data);
          setNote(result.data);
        }
      })
      .catch((error) => {
        if (requestId === detailRequest.current) {
          report(error);
          setFailedDetailId(selectedId);
        }
      });
    return () => {
      detailRequest.current += 1;
    };
  }, [selectedId, report, detailRevision]);

  const refresh = () => {
    setFailedDetailId(undefined);
    setDetailRevision((value) => value + 1);
    void fetchCategories();
    void fetchNotes(filters);
  };
  const changeFilters = (patch: Partial<Filters>) =>
    setFilters((previous) => ({ ...previous, ...patch, page: 1 }));

  const createNote = async () => {
    if (createBusy.current) return;
    const categoryId = filters.categoryId ?? categories[0]?.id;
    if (!categoryId) {
      toast.info("先创建一个分类，开始记录。");
      setMobilePanel("categories");
      return;
    }
    createBusy.current = true;
    setCreating(true);
    try {
      const result = await requestApi<ApiSuccess<Note>>(
        "/api/notes",
        jsonRequest("POST", { categoryId, title: "未命名笔记", content: "" }),
      );
      preferredId.current = result.data.id;
      setSelectedId(result.data.id);
      setFilters({ page: 1, q: "", categoryId });
      setMobilePanel(null);
      toast.success("笔记已创建。");
    } catch (error) {
      report(error);
    } finally {
      createBusy.current = false;
      setCreating(false);
    }
  };

  const patchNote = async (
    id: string,
    payload: Partial<NoteDraft> & { starred?: boolean; pinned?: boolean },
  ) => {
    if (mutationBusy.current) throw new Error("正在保存，请稍后重试。");
    mutationBusy.current = true;
    setSaving(true);
    try {
      const result = await requestApi<ApiSuccess<Note>>(
        `/api/notes/${id}`,
        jsonRequest("PATCH", payload),
      );
      noteCache.current.set(id, result.data);
      if (selectionRef.current === id) detailRequest.current += 1;
      setNote((current) => (current?.id === id ? result.data : current));
      if (
        payload.content === undefined &&
        payload.title === undefined &&
        payload.categoryId === undefined
      ) {
        setDrafts((current) => {
          const draft = current[id];
          return draft && draft.expectedVersion === result.data.version - 1
            ? {
                ...current,
                [id]: { ...draft, expectedVersion: result.data.version },
              }
            : current;
        });
      }
      void fetchNotes(filtersRef.current);
      return result.data;
    } catch (error) {
      report(error);
      throw error;
    } finally {
      mutationBusy.current = false;
      setSaving(false);
    }
  };

  const saveDraft = async (id: string, submitted: NoteDraft) => {
    const saved = await patchNote(id, submitted);
    setDrafts((current) => {
      const next = { ...current };
      const remaining = reconcileSavedDraft(current[id], submitted, saved);
      if (remaining) next[id] = remaining;
      else delete next[id];
      return next;
    });
    toast.success("笔记已保存。");
  };

  const categoryPanel = (
    <CategoryPane
      categories={categories}
      activeCategoryId={filters.categoryId}
      activeView={
        filters.starred ? "starred" : filters.pinned ? "pinned" : "all"
      }
      loading={loadingCategories}
      onSelectView={(view) => {
        changeFilters({
          categoryId: undefined,
          starred: view === "starred" ? true : undefined,
          pinned: view === "pinned" ? true : undefined,
        });
        setMobilePanel(null);
      }}
      onSelectCategory={(categoryId) => {
        changeFilters({ categoryId, starred: undefined, pinned: undefined });
        setMobilePanel(null);
      }}
      onCreateCategory={async (name) => {
        try {
          await requestApi("/api/categories", jsonRequest("POST", { name }));
          await fetchCategories();
          toast.success("分类已创建。");
        } catch (error) {
          report(error);
          throw error;
        }
      }}
      onRenameCategory={async (id, name) => {
        try {
          await requestApi(
            `/api/categories/${id}`,
            jsonRequest("PATCH", { name }),
          );
          refresh();
          toast.success("分类已更新。");
        } catch (error) {
          report(error);
          throw error;
        }
      }}
      onDeleteCategory={async (id) => {
        try {
          await requestApi(`/api/categories/${id}`, { method: "DELETE" });
          if (filters.categoryId === id)
            changeFilters({ categoryId: undefined });
          await fetchCategories();
          toast.success("分类已删除。");
        } catch (error) {
          report(error);
          throw error;
        }
      }}
    />
  );

  const notePanel = (
    <NoteList
      notes={notes}
      selectedNoteId={selectedId}
      search={filters.q}
      pagination={pagination}
      title={
        categories.find((category) => category.id === filters.categoryId)
          ?.name ??
        (filters.starred
          ? "我的收藏"
          : filters.pinned
            ? "置顶笔记"
            : "全部笔记")
      }
      loading={loadingNotes}
      creating={creating}
      busy={saving}
      hasCategories={categories.length > 0}
      draftIds={Object.keys(drafts)}
      error={loadError}
      onRetry={() => void fetchNotes(filters)}
      onSelectNote={(id) => {
        setSelectedId(id);
        setMobilePanel(null);
      }}
      onSearchChange={(q) => changeFilters({ q })}
      onCreateNote={createNote}
      onDeleteNote={async (id) => {
        try {
          await requestApi(`/api/notes/${id}`, { method: "DELETE" });
          noteCache.current.delete(id);
          setDrafts((current) => {
            const next = { ...current };
            delete next[id];
            return next;
          });
          if (selectedId === id) {
            setSelectedId(undefined);
            setNote(null);
          }
          await fetchNotes(filtersRef.current);
          toast.success("笔记已删除。");
        } catch (error) {
          report(error);
          throw error;
        }
      }}
      onTogglePinned={async (id, pinned) => {
        await patchNote(id, { pinned });
      }}
      onToggleStarred={async (id, starred) => {
        await patchNote(id, { starred });
      }}
      onPageChange={(page) => setFilters((previous) => ({ ...previous, page }))}
    />
  );

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="brand-mark">
            <Cloud size={25} strokeWidth={1.7} />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              云尾笔记
              <span className="ml-3 hidden text-[10px] font-medium tracking-[0.2em] text-muted-foreground sm:inline">
                YUNWEI NOTES
              </span>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              让每一个想法，都有归处。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            <ShieldCheck size={14} /> 私有空间
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="刷新列表"
            title="刷新列表"
            disabled={loadingNotes}
            onClick={refresh}
          >
            <RefreshCw
              size={16}
              className={loadingNotes ? "animate-spin" : ""}
            />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="退出登录"
            title="退出登录"
            onClick={async () => {
              if (
                Object.keys(drafts).length &&
                !window.confirm("还有未保存的草稿。确认放弃草稿并退出登录？")
              )
                return;
              try {
                await requestApi("/api/auth/logout", { method: "POST" });
                setDrafts({});
                router.replace("/login");
                router.refresh();
              } catch (error) {
                report(error);
              }
            }}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </header>
      <MobileNav
        panel={mobilePanel}
        onPanelChange={setMobilePanel}
        categoryPanel={categoryPanel}
        notePanel={notePanel}
      />
      <div className="workspace-grid">
        <aside className="hidden min-h-0 lg:block" aria-label="分类导航">
          {categoryPanel}
        </aside>
        <section className="hidden min-h-0 lg:block" aria-label="笔记列表">
          {notePanel}
        </section>
        <section className="min-h-0 min-w-0" aria-label="笔记编辑器">
          <NoteEditor
            key={note?.id ?? "empty"}
            note={note}
            loading={loadingDetail}
            categories={categories}
            saving={saving}
            uploading={Boolean(note && uploadingIds[note.id])}
            draft={note ? (drafts[note.id] ?? draftFromNote(note)) : null}
            dirty={Boolean(note && drafts[note.id])}
            onDraftChange={(draft) => {
              if (!note) return;
              setDrafts((current) => {
                const next = { ...current };
                if (!saving && sameDraft(draft, draftFromNote(note)))
                  delete next[note.id];
                else next[note.id] = draft;
                return next;
              });
            }}
            onSave={saveDraft}
            onCreate={createNote}
            onToggle={async (id, payload) => {
              await patchNote(id, payload);
            }}
            onUpload={async (id, file) => {
              const form = new FormData();
              form.append("noteId", id);
              form.append("file", file);
              setUploadingIds((current) => ({ ...current, [id]: true }));
              try {
                const result = await requestApi<UploadAttachmentResponse>(
                  "/api/attachments",
                  { method: "POST", body: form },
                );
                const latest = noteCache.current.get(id);
                if (latest)
                  setDrafts((current) => {
                    const draft = current[id] ?? draftFromNote(latest);
                    return {
                      ...current,
                      [id]: {
                        ...draft,
                        content: `${draft.content}\n${result.markdown}\n`,
                      },
                    };
                  });
              } catch (error) {
                report(error);
                throw error;
              } finally {
                setUploadingIds((current) => {
                  const next = { ...current };
                  delete next[id];
                  return next;
                });
              }
            }}
          />
        </section>
      </div>
    </main>
  );
}
