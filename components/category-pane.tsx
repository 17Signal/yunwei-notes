"use client";

import { useMemo, useState } from "react";
import { Folder, FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Category } from "@/types/domain";

type CategoryPaneProps = {
  categories: Category[];
  activeCategoryId?: string;
  loading?: boolean;
  onSelectCategory: (categoryId?: string) => void;
  onCreateCategory: (name: string) => Promise<void>;
  onRenameCategory: (id: string, name: string) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
};

export function CategoryPane({
  categories,
  activeCategoryId,
  loading = false,
  onSelectCategory,
  onCreateCategory,
  onRenameCategory,
  onDeleteCategory,
}: CategoryPaneProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");

  const selectedCategoryName = useMemo(
    () => categories.find((category) => category.id === activeCategoryId)?.name,
    [activeCategoryId, categories]
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-card/90 p-3 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Categories</p>
          <h2 className="text-base font-semibold">分类</h2>
        </div>
        <Button size="icon" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="sr-only">New category</span>
        </Button>
      </div>

      <Button
        variant={activeCategoryId ? "outline" : "secondary"}
        className="justify-start"
        onClick={() => onSelectCategory(undefined)}
      >
        <Folder className="h-4 w-4" />
        全部分类
      </Button>

      <ScrollArea className="min-h-0 flex-1 pr-2">
        <div className="space-y-2">
          {categories.map((category) => {
            const active = category.id === activeCategoryId;
            return (
              <div
                key={category.id}
                className={cn(
                  "group flex items-center justify-between rounded-lg border px-2 py-1.5 transition-colors",
                  active ? "border-primary/40 bg-primary/5" : "border-transparent hover:border-border hover:bg-muted/40"
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium cursor-pointer"
                  onClick={() => onSelectCategory(category.id)}
                >
                  {active ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-muted-foreground" />}
                  <span className="truncate">{category.name}</span>
                </button>
                <div className="flex items-center gap-1 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditCategory(category);
                      setEditName(category.name);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Rename</span>
                  </Button>
                  <DeleteConfirmDialog
                    title="删除分类"
                    description={`确认删除分类「${category.name}」吗？若分类下有笔记会被阻止。`}
                    onConfirm={async () => onDeleteCategory(category.id)}
                    trigger={
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    }
                  />
                </div>
              </div>
            );
          })}
          {!loading && categories.length === 0 ? <p className="px-2 py-6 text-sm text-muted-foreground">暂无分类。</p> : null}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        当前筛选：<span className="font-medium text-foreground">{selectedCategoryName ?? "全部分类"}</span>
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建分类</DialogTitle>
            <DialogDescription>分类名称最多 80 个字符。</DialogDescription>
          </DialogHeader>
          <Input
            value={createName}
            maxLength={80}
            autoFocus
            placeholder="例如：工作 / 学习 / 灵感"
            onChange={(event) => setCreateName(event.target.value)}
          />
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                setCreateName("");
              }}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                try {
                  await onCreateCategory(createName);
                  setCreateOpen(false);
                  setCreateName("");
                } catch {
                  // Errors are surfaced by the API layer toast in AppShell.
                }
              }}
              disabled={createName.trim().length === 0}
            >
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editCategory)} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
            <DialogDescription>更新分类名称。</DialogDescription>
          </DialogHeader>
          <Input value={editName} maxLength={80} onChange={(event) => setEditName(event.target.value)} />
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditCategory(null)}>
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!editCategory) {
                  return;
                }
                try {
                  await onRenameCategory(editCategory.id, editName);
                  setEditCategory(null);
                } catch {
                  // Errors are surfaced by the API layer toast in AppShell.
                }
              }}
              disabled={editName.trim().length === 0}
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
