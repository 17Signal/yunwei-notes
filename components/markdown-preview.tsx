"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownPreviewProps = {
  content: string;
};

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="markdown-body min-h-[220px] rounded-lg border border-border/80 bg-card p-4 text-sm shadow-sm">
      {content.trim().length === 0 ? (
        <p className="text-muted-foreground">暂无内容预览。</p>
      ) : (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      )}
    </div>
  );
}
