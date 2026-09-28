"use client";

import { useEffect, useState, type ReactNode } from "react";
import { List, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Panel = "categories" | "notes" | null;
type Props = {
  categoryPanel: ReactNode;
  notePanel: ReactNode;
  panel: Panel;
  onPanelChange: (panel: Panel) => void;
};

export function MobileNav({
  categoryPanel,
  notePanel,
  panel,
  onPanelChange,
}: Props) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <div className="grid grid-cols-2 gap-2 px-3 pb-3 lg:hidden">
      <Button variant="outline" onClick={() => onPanelChange("categories")}>
        <Tags size={16} />
        分类与收藏
      </Button>
      <Button variant="outline" onClick={() => onPanelChange("notes")}>
        <List size={16} />
        浏览笔记
      </Button>
      <Sheet
        open={!desktop && panel !== null}
        onOpenChange={(open) => !open && onPanelChange(null)}
      >
        <SheetContent
          side="left"
          className="flex w-[min(90vw,380px)] flex-col p-3"
        >
          <SheetHeader className="px-1 pb-3">
            <SheetTitle>
              {panel === "categories" ? "分类与收藏" : "浏览笔记"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              选择后自动返回写作空间。
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            {panel === "categories" ? categoryPanel : notePanel}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
