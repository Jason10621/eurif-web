"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  FolderOpen,
  Bot,
  Settings,
  SlidersHorizontal,
  LogOut,
  Menu,
  X,
  MoonStar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile, AppNotification } from "@/lib/types";
import { NotificationBell } from "@/components/notification-bell";

const NAV = [
  { href: "/dashboard", label: "팀 대시보드", icon: LayoutDashboard },
  { href: "/workspace", label: "개인 워크스페이스", icon: UserRound },
  { href: "/resources", label: "자료실", icon: FolderOpen },
  { href: "/ai", label: "ULIF AI", icon: Bot },
];

export function AppNav({
  profile,
  notif,
}: {
  profile: Profile;
  notif: { unread: number; items: AppNotification[] };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const links = (
    <>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-primary text-primary-fg"
                : "text-text-secondary hover:bg-surface-2 hover:text-text",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
      {profile.role === "leader" && (
        <Link
          href="/admin"
          onClick={() => setOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
            pathname.startsWith("/admin")
              ? "bg-primary text-primary-fg"
              : "text-text-secondary hover:bg-surface-2 hover:text-text",
          )}
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0" />
          관리자
        </Link>
      )}
    </>
  );

  const footer = (
    <div className="border-t border-border pt-3">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
          {profile.name.slice(-2)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{profile.name}</p>
          <p className="truncate text-xs text-muted">
            {profile.role === "leader" ? "조장" : "조원"}
            {profile.part ? ` · ${profile.part}` : ""}
          </p>
        </div>
      </div>
      <Link
        href="/settings"
        onClick={() => setOpen(false)}
        className={cn(
          "mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
          pathname.startsWith("/settings")
            ? "bg-surface-2 text-text"
            : "text-text-secondary hover:bg-surface-2 hover:text-text",
        )}
      >
        <Settings className="h-4 w-4" />
        설정
      </Link>
      <button
        onClick={logout}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-surface-2 hover:text-status-critical"
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <MoonStar className="h-5 w-5 text-primary" />
          ULIF
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell
            userId={profile.id}
            initialUnread={notif.unread}
            initialItems={notif.items}
            variant="bar"
          />
          <button
            onClick={() => setOpen(true)}
            aria-label="메뉴 열기"
            className="rounded-lg p-1.5 hover:bg-surface-2"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <nav className="absolute left-0 top-0 flex h-full w-72 flex-col gap-1 border-r border-border bg-surface p-4">
            <div className="mb-4 flex items-center justify-between">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-bold"
                onClick={() => setOpen(false)}
              >
                <MoonStar className="h-5 w-5 text-primary" />
                ULIF
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="메뉴 닫기"
                className="rounded-lg p-1.5 hover:bg-surface-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {links}
            <div className="mt-auto">{footer}</div>
          </nav>
        </div>
      )}

      {/* Desktop sidebar */}
      <nav className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-1 border-r border-border bg-surface p-4 md:flex">
        <div className="mb-5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-2 text-lg font-bold tracking-tight"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
              <MoonStar className="h-4 w-4" />
            </span>
            ULIF
          </Link>
          <NotificationBell
            userId={profile.id}
            initialUnread={notif.unread}
            initialItems={notif.items}
            variant="sidebar"
          />
        </div>
        {links}
        <div className="mt-auto">{footer}</div>
      </nav>
    </>
  );
}
