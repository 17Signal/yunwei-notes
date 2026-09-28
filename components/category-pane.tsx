"use client";

import { useState } from "react";
import {
  Folder,
  FolderOpen,
  Library,
  Loader2,
  Pencil,
  Pin,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";

type Props = {
  categories: Category[];
  activeCategoryId?: string;
  activeView: "all" | "starred" | "pinned";
  loading: boolean;
  onSelectView: (view: "all" | "starred" | "pinned") => void;
  onSelectCategory: (id?: string) => void;
  onCreateCategory: (name: string) => Promise<void>;
  onRenameCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
};

export function CategoryPane({
  categories,
  activeCategoryId,
  activeView,
  loading,
  onSelectView,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: Props) {
  const [dialog, setDialog] = useState<{ id?: string; name: string } | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  return (
    <div className="panel category-panel">
      <p className="eyebrow mb-4 px-2">我的知识库</p>
      <nav className="space-y-1" aria-label="快捷筛选">
        {(
          [
            { view: "all", name: "全部笔记", icon: Library },
            { view: "starred", name: "我的收藏", icon: Star },
            { view: "pinned", name: "置顶笔记", icon: Pin },
          ] as const
        ).map(({ view, name, icon: Icon }) => (
          <button
            type="button"
            key={view}
            aria-current={
              !activeCategoryId && activeView === view ? "page" : undefined
            }
            className={cn(
              "nav-item",
              !activeCategoryId && activeView === view && "active",
            )}
            onClick={() => onSelectView(view)}
          >
            <Icon size={17} />
            {name}
          </button>
        ))}
      </nav>
      <div className="mb-3 mt-7 flex items-center justify-between px-2">
        <h2 className="eyebrow">
          分类{" "}
          <span className="ml-1 opacity-60">
            {categories.length.toString().padStart(2, "0")}
          </span>
        </h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          aria-label="新建分类"
          title="新建分类"
          onClick={() => setDialog({ name: "" })}
        >
          <Plus size={16} />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {categories.map((category) => {
          const active = category.id === activeCategoryId;
          return (
            <div
              key={category.id}
              className={cn("category-row group", active && "active")}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2.5 py-3 pl-2 text-left text-sm"
                aria-current={active ? "page" : undefined}
                onClick={() => onSelectCategory(category.id)}
              >
                {active ? (
                  <FolderOpen size={16} className="shrink-0 text-primary" />
                ) : (
                  <Folder
                    size={16}
                    className="shrink-0 text-muted-foreground"
                  />
                )}
                <span className="truncate">{category.name}</span>
              </button>
              <div className="flex shrink-0 items-center opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label={`重命名分类 ${category.name}`}
                  onClick={() =>
                    setDialog({ id: category.id, name: category.name })
                  }
                >
                  <Pencil size={12} />
                </Button>
                <DeleteConfirmDialog
                  title="删除分类"
                  description={`确认删除「${category.name}」？包含笔记的分类需要先移空。`}
                  onConfirm={() => onDeleteCategory(category.id)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      aria-label={`删除分类 ${category.name}`}
                    >
                      <Trash2 size={12} />
                    </Button>
                  }
                />
              </div>
            </div>
          );
        })}
        {loading && (
          <p
            className="flex items-center gap-2 p-3 text-xs text-muted-foreground"
            role="status"
          >
            <Loader2 size={14} className="animate-spin" />
            加载分类…
          </p>
        )}
        {!loading && !categories.length && (
          <button
            type="button"
            className="m-1 rounded-lg border border-dashed p-4 text-left text-xs leading-6 text-muted-foreground"
            onClick={() => setDialog({ name: "" })}
          >
            还没有分类。
            <br />
            <span className="text-primary">创建第一个分类 →</span>
          </button>
        )}
      </div>
      <div className="sidebar-tip">
        <span className="mb-2 block text-sm text-foreground">
          慢慢记录，慢慢积累。
        </span>
        把零散的想法，整理成自己的知识。
      </div>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => !open && !pending && setDialog(null)}
      >
        <DialogContent>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!dialog || pending || !dialog.name.trim()) return;
              setPending(true);
              try {
                if (dialog.id)
                  await onRenameCategory(dialog.id, dialog.name.trim());
                else await onCreateCategory(dialog.name.trim());
                setDialog(null);
              } catch {
                /* The API layer keeps the dialog open and displays the error. */
              } finally {
                setPending(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {dialog?.id ? "重命名分类" : "新建分类"}
              </DialogTitle>
              <DialogDescription>
                为笔记选择一个归处，名称最多 80 个字符。
              </DialogDescription>
            </DialogHeader>
            <label className="sr-only" htmlFor="category-name">
              分类名称
            </label>
            <Input
              id="category-name"
              className="my-5"
              value={dialog?.name ?? ""}
              maxLength={80}
              required
              autoFocus
              disabled={pending}
              placeholder="例如：工作记录、学习笔记、生活灵感"
              onChange={(event) =>
                setDialog((current) =>
                  current ? { ...current, name: event.target.value } : null,
                )
              }
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setDialog(null)}
              >
                取消
              </Button>
              <Button type="submit" disabled={pending || !dialog?.name.trim()}>
                {pending && <Loader2 size={14} className="animate-spin" />}
                {dialog?.id ? "保存分类" : "创建分类"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
