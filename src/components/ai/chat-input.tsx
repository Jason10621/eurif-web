"use client";

import { useRef, useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChatInput({
  onSend,
  disabled,
  placeholder = "ULIF 프로젝트에 대해 무엇이든 물어보세요…",
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  }

  return (
    <div className="flex items-end gap-2 rounded-2xl border border-border-strong bg-surface p-2 focus-within:border-primary">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted disabled:opacity-60"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="보내기"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-fg transition disabled:opacity-40",
        )}
      >
        {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </div>
  );
}
