import { FileText, Link2, Upload } from "lucide-react";
import type { LogWithAuthor, ResourceWithUploader } from "@/lib/types";
import { fmtRelative } from "@/lib/utils";
import { EmptyState } from "@/components/ui";

type Item =
  | { kind: "log"; at: string; who: string; title: string; body: string }
  | { kind: "resource"; at: string; who: string; title: string; category: string };

export function ActivityFeed({
  logs,
  resources,
}: {
  logs: LogWithAuthor[];
  resources: ResourceWithUploader[];
}) {
  const items: Item[] = [
    ...logs.map(
      (l): Item => ({
        kind: "log",
        at: l.created_at,
        who: l.author?.name ?? "알 수 없음",
        title: l.title || "업무 일지",
        body: l.content,
      }),
    ),
    ...resources.map(
      (r): Item => ({
        kind: "resource",
        at: r.created_at,
        who: r.uploader?.name ?? "알 수 없음",
        title: r.title,
        category: r.category,
      }),
    ),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  if (!items.length) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title="아직 활동 내역이 없습니다"
        desc="업무 일지나 자료가 등록되면 여기에 표시됩니다"
      />
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex gap-3 rounded-lg px-2 py-2.5 transition hover:bg-surface-2"
        >
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
            {it.kind === "log" ? (
              <FileText className="h-3.5 w-3.5" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">{it.who}</span>
              <span className="text-muted">
                {it.kind === "log" ? " 님이 일지 작성" : " 님이 자료 등록"}
              </span>
            </p>
            <p className="truncate text-xs text-text-secondary">
              {it.kind === "resource" && (
                <span className="mr-1 inline-flex items-center gap-0.5 text-muted">
                  <Link2 className="h-3 w-3" />
                  {it.category}
                </span>
              )}
              {it.title}
              {it.kind === "log" && it.body ? ` — ${it.body}` : ""}
            </p>
          </div>
          <time className="shrink-0 text-[11px] text-muted">
            {fmtRelative(it.at)}
          </time>
        </li>
      ))}
    </ul>
  );
}
