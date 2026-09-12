"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ListChecks,
  CheckCircle2,
  FileText,
  FolderOpen,
  GitBranch,
  Megaphone,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn, fmtRelative } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/lib/types";

const ICON: Record<NotificationType, React.ElementType> = {
  task: ListChecks,
  task_done: CheckCircle2,
  log: FileText,
  resource: FolderOpen,
  phase: GitBranch,
  announce: Megaphone,
};

export function NotificationBell({
  userId,
  initialUnread,
  initialItems,
  variant = "sidebar",
}: {
  userId: string;
  initialUnread: number;
  initialItems: AppNotification[];
  variant?: "sidebar" | "bar";
}) {
  const router = useRouter();
  const supabase = createClient();
  const [items, setItems] = useState<AppNotification[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`notif-${userId}-${variant}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setItems((prev) => [n, ...prev].slice(0, 20));
          setUnread((c) => c + 1);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, variant]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function openPanel() {
    setOpen((v) => !v);
    // refetch latest on open
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setItems(data as AppNotification[]);
  }

  async function markAllRead() {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).eq("read", false);
  }

  async function openItem(n: AppNotification) {
    if (!n.read) {
      setUnread((c) => Math.max(0, c - 1));
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="relative">
      <button
        onClick={openPanel}
        aria-label={`알림${unread > 0 ? ` ${unread}개` : ""}`}
        className={cn(
          "relative rounded-lg p-1.5 transition hover:bg-surface-2",
          variant === "sidebar" ? "text-text-secondary" : "text-text-secondary",
        )}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className={cn(
            "absolute z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl",
            variant === "bar" ? "right-0 top-11" : "left-full top-0 ml-2",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">알림</p>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="rounded-md px-2 py-1 text-[11px] text-primary hover:bg-surface-2"
                >
                  모두 읽음
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded-md p-1 text-muted hover:bg-surface-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted">알림이 없습니다</p>
            ) : (
              items.map((n) => {
                const Icon = ICON[n.type] ?? Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-2.5 border-b border-border px-4 py-3 text-left transition last:border-0 hover:bg-surface-2",
                      !n.read && "bg-primary-soft/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                        n.read ? "bg-surface-2 text-muted" : "bg-primary-soft text-primary",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs", !n.read && "font-semibold")}>{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-[10px] text-muted">
                        {fmtRelative(n.created_at)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
