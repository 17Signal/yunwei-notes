"use client";

import type { ReactNode } from "react";
import { List, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type MobileNavProps = {
  categoryPanel: ReactNode;
  notePanel: ReactNode;
};

export function MobileNav({ categoryPanel, notePanel }: MobileNavProps) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full">
            <Tags className="h-4 w-4" />
            分类
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-2">
          <SheetHeader>
            <SheetTitle>分类</SheetTitle>
          </SheetHeader>
          <div className="mt-2 h-[calc(100dvh-5rem)]">{categoryPanel}</div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="w-full">
            <List className="h-4 w-4" />
            笔记
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-2">
          <SheetHeader>
            <SheetTitle>笔记</SheetTitle>
          </SheetHeader>
          <div className="mt-2 h-[calc(100dvh-5rem)]">{notePanel}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
