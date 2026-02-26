"use client";

import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type UploadButtonProps = {
  disabled?: boolean;
  loading?: boolean;
  onFileSelected: (file: File) => Promise<void> | void;
};

export function UploadButton({ disabled, loading, onFileSelected }: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          await onFileSelected(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={disabled || loading}
        onClick={() => fileInputRef.current?.click()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        上传截图
      </Button>
    </>
  );
}
