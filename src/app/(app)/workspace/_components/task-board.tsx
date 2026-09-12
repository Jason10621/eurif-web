"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Flag, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, EmptyState } from "@/components/ui";
import { Button } from "@/components/form";
import { cn, fmtDate, daysUntil } from "@/lib/utils";
import type { Phase, Profile, TaskStatus, TaskWithAssignee } from "@/lib/types";
import { TaskDialog } from "./task-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";

type Member = Pick<Profile, "id" | "name" | "part" | "role">;

const STATUS: Record<TaskStatus, { label: string; tone: "planned" | "active" | "done"; next: TaskStatus }> = {
  todo: { label: "예정", tone: "planned", next: "in_progress" },
  in_progress: { label: "진행 중", tone: "active", next: "done" },
  done: { label: "완료", tone: "done", next: "todo" },
};

export function TaskBoard({
  tasks,
  members,
  phases,
  currentUser,
}: {
  tasks: TaskWithAssignee[];
  members: Member[];
  phases: Phase[];
  currentUser: { id: string; role: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const isLeader = currentUser.role === "leader";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaskWithAssignee | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // 최신 tasks prop 에서 다시 찾아 동기화 — router.refresh() 후에도 다이얼로그가 최신 상태를 보여줌
  const detailTask = tasks.find((t) => t.id === detailTaskId) ?? null;

  const myTasks = tasks.filter((t) => t.assignee_id === currentUser.id);

  function openDetail(t: TaskWithAssignee) {
    setDetailTaskId(t.id);
    setDetailOpen(true);
  }

  async function remove(t: TaskWithAssignee) {
    if (!confirm(`"${t.title}" 과제를 삭제할까요?`)) return;
    await supabase.from("tasks").delete().eq("id", t.id);
    router.refresh();
  }

  function TaskRow({ t, canManage }: { t: TaskWithAssignee; canManage: boolean }) {
    const d = daysUntil(t.due_date);
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3">
        <button
          onClick={() => openDetail(t)}
          title="상세 보기"
          className="mt-0.5 shrink-0"
        >
          <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge>
        </button>
        <div
          className="min-w-0 flex-1 cursor-pointer"
          onClick={() => openDetail(t)}
          role="button"
          tabIndex={0}
        >
          <p
            className={cn(
              "text-sm font-medium",
              t.status === "done" && "text-muted line-through",
            )}
          >
            {t.title}
          </p>
          {t.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
              {t.description}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <span>{t.assignee?.name ?? "미배정"}</span>
            {t.due_date && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  d != null && d < 0 && t.status !== "done" && "text-status-critical",
                  d != null && d >= 0 && d <= 2 && t.status !== "done" && "text-status-warning",
                )}
              >
                <CalendarDays className="h-3 w-3" />
                {fmtDate(t.due_date)}
                {d != null && t.status !== "done" && (d < 0 ? ` (${-d}일 지남)` : d === 0 ? " (오늘)" : ` (D-${d})`)}
              </span>
            )}
            {t.priority === "high" && (
              <span className="inline-flex items-center gap-0.5 text-status-critical">
                <Flag className="h-3 w-3" /> 높음
              </span>
            )}
          </div>
        </div>
        {canManage && (
          <div className="flex shrink-0 gap-0.5">
            <button
              onClick={() => {
                setEditing(t);
                setDialogOpen(true);
              }}
              className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
              aria-label="수정"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => remove(t)}
              className="rounded-md p-1.5 text-muted hover:bg-status-critical/10 hover:text-status-critical"
              aria-label="삭제"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* my tasks */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            내 과제 <span className="text-muted">({myTasks.length})</span>
          </h2>
          <p className="text-[11px] text-muted">과제를 눌러 상세 보기 · 제출</p>
        </div>
        {myTasks.length ? (
          <div className="space-y-2">
            {myTasks.map((t) => (
              <TaskRow key={t.id} t={t} canManage={isLeader} />
            ))}
          </div>
        ) : (
          <EmptyState title="배정된 과제가 없습니다" desc="조장이 배정하면 여기에 표시됩니다" />
        )}
      </section>

      {/* leader: all tasks */}
      {isLeader && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              전체 과제 관리 <span className="text-muted">({tasks.length})</span>
            </h2>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> 새 과제
            </Button>
          </div>
          {tasks.length ? (
            <div className="space-y-4">
              {members
                .filter((m) => tasks.some((t) => t.assignee_id === m.id))
                .map((m) => (
                  <Card key={m.id} className="p-4">
                    <p className="mb-2 text-xs font-semibold text-text-secondary">
                      {m.name} {m.part ? `· ${m.part}` : ""}
                    </p>
                    <div className="space-y-2">
                      {tasks
                        .filter((t) => t.assignee_id === m.id)
                        .map((t) => (
                          <TaskRow key={t.id} t={t} canManage />
                        ))}
                    </div>
                  </Card>
                ))}
            </div>
          ) : (
            <EmptyState title="과제가 없습니다" desc="'새 과제'로 첫 과제를 배정하세요" />
          )}
        </section>
      )}

      {isLeader && (
        <TaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          members={members}
          phases={phases}
          creatorId={currentUser.id}
          task={editing}
        />
      )}

      <TaskDetailDialog
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        task={detailTask}
        phases={phases}
        currentUser={currentUser}
      />
    </div>
  );
}
