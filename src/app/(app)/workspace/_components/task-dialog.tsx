"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/dialog";
import { Field, Input, Textarea, Select, Button } from "@/components/form";
import type { Phase, Profile, TaskWithAssignee } from "@/lib/types";

type Member = Pick<Profile, "id" | "name" | "part" | "role">;

export function TaskDialog({
  open,
  onClose,
  members,
  phases,
  creatorId,
  task,
}: {
  open: boolean;
  onClose: () => void;
  members: Member[];
  phases: Phase[];
  creatorId: string;
  task?: TaskWithAssignee | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!task;

  const ALL = "__all__";

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? members[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "normal");
  const [phaseId, setPhaseId] = useState<string>(task?.phase_id ? String(task.phase_id) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const base = {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate || null,
      priority,
      phase_id: phaseId ? Number(phaseId) : null,
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("tasks")
        .update({ ...base, assignee_id: assigneeId })
        .eq("id", task!.id));
    } else if (assigneeId === ALL) {
      const targets = members.filter((m) => m.role === "member");
      const rows = targets.map((m) => ({
        ...base,
        assignee_id: m.id,
        created_by: creatorId,
      }));
      ({ error } = await supabase.from("tasks").insert(rows));
    } else {
      ({ error } = await supabase
        .from("tasks")
        .insert({ ...base, assignee_id: assigneeId, created_by: creatorId }));
    }

    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onClose={onClose} title={editing ? "과제 수정" : "새 과제"}>
      <form onSubmit={save}>
        <Field label="제목" htmlFor="t-title">
          <Input
            id="t-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="다음 시간까지 해야 할 일"
          />
        </Field>
        <Field label="내용" htmlFor="t-desc">
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="세부 지시사항, 참고 자료 등"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="담당자" htmlFor="t-assignee">
            <Select
              id="t-assignee"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              {!editing && (
                <option value={ALL}>
                  전체 조원 ({members.filter((m) => m.role === "member").length}명)
                </option>
              )}
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.part ? `· ${m.part}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="마감일" htmlFor="t-due">
            <Input
              id="t-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </Field>
          <Field label="우선순위" htmlFor="t-prio">
            <Select
              id="t-prio"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              <option value="low">낮음</option>
              <option value="normal">보통</option>
              <option value="high">높음</option>
            </Select>
          </Field>
          <Field label="연결 단계" htmlFor="t-phase">
            <Select id="t-phase" value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
              <option value="">없음</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  P{p.phase_no}. {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {error && <p className="mb-3 text-xs text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "저장" : "생성"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
