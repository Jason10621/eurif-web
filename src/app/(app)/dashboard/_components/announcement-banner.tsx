"use client";

import { useEffect, useState } from "react";
import { Megaphone, Pin, X } from "lucide-react";
import { fmtRelative } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

const KEY = "eurif-dismissed-announcements";

export function AnnouncementBanner({ announcements }: { announcements: Announcement[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    // deferred out of the synchronous effect body
    const t = setTimeout(() => {
      try {
        setDismissed(JSON.parse(localStorage.getItem(KEY) || "[]"));
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function dismiss(id: string) {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(-50)));
    } catch {
      /* ignore */
    }
  }

  const shown = announcements.filter((a) => a.pinned || !dismissed.includes(a.id));
  if (!shown.length) return null;

  return (
    <div className="mb-6 space-y-2">
      {shown.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary-soft px-4 py-3"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-fg">
            <Megaphone className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text">
              {a.pinned && <Pin className="mr-1 inline h-3 w-3 text-primary" />}
              {a.title}
            </p>
            {a.body && (
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-text-secondary">{a.body}</p>
            )}
            <p className="mt-1 text-[11px] text-muted">{fmtRelative(a.created_at)}</p>
          </div>
          {!a.pinned && (
            <button
              onClick={() => dismiss(a.id)}
              aria-label="닫기"
              className="rounded-md p-1 text-muted hover:bg-surface/60"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
