"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeMath } from "@/lib/ai/sanitize";
import type { ChatMessage } from "@/lib/ai/types";

export function ChatThread({
  messages,
  streaming,
  compact,
}: {
  messages: ChatMessage[];
  streaming: boolean;
  compact?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className={cn("space-y-4", compact ? "text-[13px]" : "text-sm")}>
      {messages.map((m, i) =>
        m.role === "user" ? (
          <div key={i} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-primary-fg">
              {m.content}
            </div>
          </div>
        ) : (
          <div key={i} className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              {m.pending && !m.content ? (
                <div className="flex items-center gap-2 py-1.5 text-muted">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  자료 검색 중…
                </div>
              ) : (
                <div
                  className={cn(
                    "prose-eurif max-w-none rounded-2xl rounded-tl-sm bg-surface-2 px-3.5 py-2.5",
                  )}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {sanitizeMath(m.content)}
                  </ReactMarkdown>
                  {streaming && i === messages.length - 1 && (
                    <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-muted align-middle" />
                  )}
                </div>
              )}
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.sources.slice(0, 5).map((s) => (
                    <span
                      key={s.title}
                      className="inline-flex items-center gap-1 rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] text-muted"
                      title={`유사도 ${s.similarity}`}
                    >
                      <FileText className="h-2.5 w-2.5" />
                      {s.title.length > 22 ? s.title.slice(0, 22) + "…" : s.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      )}
      <div ref={endRef} />
    </div>
  );
}
