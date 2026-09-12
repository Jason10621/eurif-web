"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  FileText,
  Link2,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, EmptyState } from "@/components/ui";
import { Button } from "@/components/form";
import { cn, fmtDate } from "@/lib/utils";
import { RESOURCE_CATEGORIES, type ResourceItem } from "@/lib/types";
import { ResourceDialog } from "./resource-dialog";

function fmtSize(bytes: number | null) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export function ResourceHub({
  resources,
  currentUser,
}: {
  resources: ResourceItem[];
  currentUser: { id: string; role: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const [filter, setFilter] = useState<string>("전체");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ResourceItem | null>(null);

  const counts = new Map<string, number>();
  for (const r of resources) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);

  const shown =
    filter === "전체" ? resources : resources.filter((r) => r.category === filter);

  async function remove(r: ResourceItem) {
    if (!confirm(`"${r.title}" 자료를 삭제할까요?`)) return;
    if (r.storage_path) {
      await supabase.storage.from("resources").remove([r.storage_path]);
    }
    await supabase.from("resources").delete().eq("id", r.id);
    router.refresh();
  }

  const canManage = (r: ResourceItem) =>
    currentUser.role === "leader" || r.uploaded_by === currentUser.id;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["전체", ...RESOURCE_CATEGORIES].map((c) => {
            const n = c === "전체" ? resources.length : counts.get(c) ?? 0;
            return (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  filter === c
                    ? "bg-primary text-primary-fg"
                    : "bg-surface-2 text-text-secondary hover:bg-surface-3",
                )}
              >
                {c} {n > 0 && <span className="opacity-70">{n}</span>}
              </button>
            );
          })}
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" /> 자료 추가
        </Button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={filter === "전체" ? "등록된 자료가 없습니다" : `'${filter}' 자료가 없습니다`}
          desc="'자료 추가'로 논문 링크나 파일을 공유하세요"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((r) => (
            <Card key={r.id} className="flex flex-col p-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge tone="neutral">{r.category}</Badge>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                  {r.storage_path ? (
                    <FileText className="h-3 w-3" />
                  ) : (
                    <Link2 className="h-3 w-3" />
                  )}
                  {r.storage_path ? fmtSize(r.file_size) : "링크"}
                </span>
              </div>

              <p className="text-sm font-semibold leading-snug">{r.title}</p>
              {r.description && (
                <p className="mt-1 line-clamp-3 flex-1 text-xs text-text-secondary">
                  {r.description}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5 text-[11px] text-muted">
                <span>
                  {r.uploader?.name ?? "?"}
                  {r.part && r.part !== "공통" ? ` · ${r.part}` : ""} · {fmtDate(r.created_at)}
                </span>
              </div>

              <div className="mt-2 flex items-center gap-1.5">
                {r.downloadUrl && (
                  <a
                    href={r.downloadUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-3"
                  >
                    {r.storage_path ? (
                      <>
                        <Download className="h-3.5 w-3.5" /> 다운로드
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3.5 w-3.5" /> 열기
                      </>
                    )}
                  </a>
                )}
                {canManage(r) && (
                  <>
                    <button
                      onClick={() => {
                        setEditing(r);
                        setDialogOpen(true);
                      }}
                      className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
                      aria-label="수정"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => remove(r)}
                      className="rounded-md p-1.5 text-muted hover:bg-status-critical/10 hover:text-status-critical"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ResourceDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        userId={currentUser.id}
        resource={editing}
      />
    </div>
  );
}
