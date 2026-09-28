"use client";

import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type UploadButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onFileSelected: (file: File) => Promise<void> | void;
};

export function UploadButton({
  disabled,
  loading,
  onFileSelected,
}: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        aria-label="选择图片"
        onChange={async (event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          if (!file) {
            return;
          }
          try {
            await onFileSelected(file);
          } finally {
            input.value = "";
          }
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || loading}
        onClick={() => fileInputRef.current?.click()}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        图片
      </Button>
    </>
  );
}
