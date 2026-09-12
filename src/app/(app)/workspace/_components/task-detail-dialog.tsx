"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Paperclip, X, Download, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/dialog";
import { Textarea, Button } from "@/components/form";
import { Badge } from "@/components/ui";
import { cn, fmtDate, fmtBytes, fmtRelative } from "@/lib/utils";
import type { Phase, TaskAttachment, TaskStatus, TaskWithAssignee } from "@/lib/types";

const STATUS_META: Record<TaskStatus, { label: string; tone: "planned" | "active" | "done" }> = {
  todo: { label: "예정", tone: "planned" },
  in_progress: { label: "진행 중", tone: "active" },
  done: { label: "완료", tone: "done" },
};

function sanitize(name: string) {
  return name.replace(/[^\w.\-가-힣]/g, "_").slice(0, 120);
}

export function TaskDetailDialog({
  open,
  onClose,
  task,
  phases,
  currentUser,
}: {
  open: boolean;
  onClose: () => void;
  task: TaskWithAssignee | null;
  phases: Phase[];
  currentUser: { id: string; role: string };
}) {
  const router = useRouter();
  const supabase = createClient();
  const isLeader = currentUser.role === "leader";
  const isAssignee = task?.assignee_id === currentUser.id;

  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [note, setNote] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !task) return;
    setNote(task.submission_note ?? "");
    setPendingFiles([]);
    setError(null);
    loadAttachments(task.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  async function loadAttachments(taskId: string) {
    setLoadingAttachments(true);
    const { data } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    const rows = (data as TaskAttachment[]) ?? [];
    setAttachments(rows);
    const entries = await Promise.all(
      rows.map(async (a) => {
        const { data: signed } = await supabase.storage
          .from("task-submissions")
          .createSignedUrl(a.storage_path, 3600);
        return [a.id, signed?.signedUrl ?? ""] as const;
      }),
    );
    setUrls(Object.fromEntries(entries));
    setLoadingAttachments(false);
  }

  function addFiles(list: FileList | File[]) {
    setPendingFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function handleSubmitTask() {
    if (!task) return;
    setSubmitting(true);
    setError(null);
    try {
      for (const file of pendingFiles) {
        const path = `${task.id}/${Date.now()}-${sanitize(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from("task-submissions")
          .upload(path, file, { upsert: false });
        if (upErr) throw new Error(`"${file.name}" 업로드 실패: ${upErr.message}`);
        const { error: rowErr } = await supabase.from("task_attachments").insert({
          task_id: task.id,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          uploaded_by: currentUser.id,
        });
        if (rowErr) throw new Error(`"${file.name}" 기록 실패: ${rowErr.message}`);
      }

      const { error: taskErr } = await supabase
        .from("tasks")
        .update({
          status: "done",
          submission_note: note.trim() || null,
          submitted_by: currentUser.id,
          submitted_at: new Date().toISOString(),
        })
        .eq("id", task.id);
      if (taskErr) throw taskErr;

      setPendingFiles([]);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function setStatus(next: TaskStatus) {
    if (!task) return;
    setStatusBusy(true);
    await supabase
      .from("tasks")
      .update({
        status: next,
        completed_at: next === "done" ? new Date().toISOString() : null,
      })
      .eq("id", task.id);
    setStatusBusy(false);
    router.refresh();
  }

  async function reject() {
    if (!task) return;
    if (!confirm("이 제출을 반려하고 과제를 다시 진행 중으로 돌릴까요?")) return;
    setStatusBusy(true);
    await supabase
      .from("tasks")
      .update({
        status: "in_progress",
        completed_at: null,
        rejected_at: new Date().toISOString(),
        rejected_by: currentUser.id,
      })
      .eq("id", task.id);
    setStatusBusy(false);
    router.refresh();
  }

  if (!task) return null;

  const phase = task.phase_id ? phases.find((p) => p.id === task.phase_id) : null;
  const canSubmit = isAssignee && !isLeader && task.status !== "done";
  const wasRejected = !!task.rejected_at && task.status !== "done";

  return (
    <Dialog open={open} onClose={onClose} title="과제 상세">
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_META[task.status].tone}>{STATUS_META[task.status].label}</Badge>
            {task.priority === "high" && <Badge tone="critical">우선순위 높음</Badge>}
            {phase && <Badge tone="neutral">P{phase.phase_no}. {phase.name}</Badge>}
          </div>
          <h3 className="text-base font-semibold">{task.title}</h3>
          {task.description && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">{task.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>담당자 {task.assignee?.name ?? "미배정"}</span>
            {task.due_date && <span>마감 {fmtDate(task.due_date)}</span>}
          </div>
        </div>

        {/* 조장 전용: 상태 직접 변경 */}
        {isLeader && (
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="mb-2 text-xs font-semibold text-text-secondary">상태 변경 (조장)</p>
            <div className="flex gap-1.5">
              {(Object.keys(STATUS_META) as TaskStatus[]).map((s) => (
                <button
                  key={s}
                  disabled={statusBusy}
                  onClick={() => setStatus(s)}
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-semibold transition disabled:opacity-50",
                    task.status === s
                      ? "ring-2 ring-primary/50"
                      : "opacity-60 hover:opacity-100",
                  )}
                >
                  <Badge tone={STATUS_META[s].tone}>{STATUS_META[s].label}</Badge>
                </button>
              ))}
              {task.status === "done" && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="ml-auto"
                  loading={statusBusy}
                  onClick={reject}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> 거부
                </Button>
              )}
            </div>
          </div>
        )}

        {wasRejected && (
          <div className="rounded-xl border border-status-critical/30 bg-status-critical/5 px-3 py-2 text-xs text-status-critical">
            조장이 이 제출을 반려했습니다 ({fmtRelative(task.rejected_at)}). 내용을 보완해 다시
            제출해 주세요.
          </div>
        )}

        {/* 제출 내역 (있으면 항상 표시) */}
        {(task.submission_note || attachments.length > 0) && (
          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="mb-2 text-xs font-semibold text-text-secondary">
              제출 내역{task.submitted_at ? ` · ${fmtRelative(task.submitted_at)}` : ""}
            </p>
            {task.submission_note && (
              <p className="mb-2 whitespace-pre-wrap rounded-lg bg-surface-2 p-2.5 text-xs">
                “{task.submission_note}”
              </p>
            )}
            {loadingAttachments ? (
              <p className="text-xs text-muted">불러오는 중…</p>
            ) : attachments.length > 0 ? (
              <ul className="space-y-1">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 text-xs">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{a.file_name}</span>
                    <span className="shrink-0 text-muted">{fmtBytes(a.file_size)}</span>
                    {urls[a.id] && (
                      <a
                        href={urls[a.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-primary hover:underline"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {/* 조원: 제출 폼 */}
        {canSubmit && (
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-xs font-semibold text-text-secondary">과제 제출</p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
                dragOver ? "border-primary bg-primary/5" : "border-border-strong hover:bg-surface-2",
              )}
            >
              <UploadCloud className="h-6 w-6 text-muted" />
              <p className="text-xs font-medium">파일을 끌어다 놓거나 클릭해서 선택</p>
              <p className="text-[11px] text-muted">형식·개수 제한 없음 (사진, PDF, 문서 등)</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
              />
            </div>

            {pendingFiles.length > 0 && (
              <ul className="space-y-1">
                {pendingFiles.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="shrink-0 text-muted">{fmtBytes(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                      className="shrink-0 text-muted hover:text-status-critical"
                      aria-label="제거"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <p className="mb-1 text-xs font-medium text-text-secondary">조장에게 하고 싶은 말</p>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="진행하며 어려웠던 점, 확인이 필요한 부분 등을 남겨주세요"
              />
            </div>

            {error && <p className="text-xs text-status-critical">{error}</p>}

            <div className="flex justify-end">
              <Button onClick={handleSubmitTask} loading={submitting}>
                과제 제출
              </Button>
            </div>
          </div>
        )}

        {!isLeader && !canSubmit && task.status === "done" && (
          <p className="text-xs text-muted">
            제출이 완료된 과제입니다. 조장이 반려하면 다시 제출할 수 있습니다.
          </p>
        )}
      </div>
    </Dialog>
  );
}
