import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------------- Card ---------------- */
export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface p-5 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  desc,
  action,
  className,
}: {
  title: React.ReactNode;
  desc?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Stat tile ---------------- */
export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: "primary" | "done" | "warning" | "critical" | "muted";
}) {
  const dot = {
    primary: "bg-primary",
    done: "bg-status-done",
    warning: "bg-status-warning",
    critical: "bg-status-critical",
    muted: "bg-muted",
  }[accent ?? "muted"];
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-text-secondary">{sub}</div>}
    </Card>
  );
}

/* ---------------- Badge ---------------- */
const badgeStyles: Record<string, string> = {
  done: "bg-status-done/12 text-status-done",
  active: "bg-primary/12 text-primary",
  planned: "bg-muted/15 text-muted",
  warning: "bg-status-warning/15 text-[#a9760a] dark:text-status-warning",
  critical: "bg-status-critical/12 text-status-critical",
  neutral: "bg-surface-2 text-text-secondary",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof badgeStyles;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        badgeStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Progress bar ---------------- */
export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number;
  className?: string;
  barClassName?: string;
}) {
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-all", barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({
  icon,
  title,
  desc,
}: {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
      {icon && <div className="mb-2 text-muted">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {desc && <p className="mt-1 text-xs text-muted">{desc}</p>}
    </div>
  );
}

/* ---------------- Page header ---------------- */
export function PageHeader({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      </div>
      {children}
    </div>
  );
}
