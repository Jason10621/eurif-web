"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Badge, EmptyState } from "@/components/ui";
import { Field, Input, Textarea, Select, Button } from "@/components/form";
import { fmtDate } from "@/lib/utils";
import type { Phase, LogWithAuthor } from "@/lib/types";

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function LogEditor({
  phases,
  userId,
  log,
  onDone,
  onCancel,
}: {
  phases: Phase[];
  userId: string;
  log?: LogWithAuthor;
  onDone: () => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const [logDate, setLogDate] = useState(log?.log_date ?? todayISO());
  const [title, setTitle] = useState(log?.title ?? "");
  const [content, setContent] = useState(log?.content ?? "");
  const [tags, setTags] = useState((log?.tags ?? []).join(", "));
  const [phaseId, setPhaseId] = useState(log?.phase_id ? String(log.phase_id) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      log_date: logDate,
      title: title.trim() || null,
      content: content.trim(),
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      phase_id: phaseId ? Number(phaseId) : null,
    };
    const { error } = log
      ? await supabase.from("logs").update(payload).eq("id", log.id)
      : await supabase.from("logs").insert({ ...payload, author_id: userId });
    setSaving(false);
    if (error) return setError(error.message);
    onDone();
  }

  return (
    <Card className="border-primary/30">
      <form onSubmit={save}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="날짜" htmlFor="l-date">
            <Input
              id="l-date"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
            />
          </Field>
          <Field label="연결 단계" htmlFor="l-phase">
            <Select id="l-phase" value={phaseId} onChange={(e) => setPhaseId(e.target.value)}>
              <option value="">없음</option>
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  P{p.phase_no}. {p.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="제목" htmlFor="l-title">
          <Input
            id="l-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="오늘 한 일 요약"
          />
        </Field>
        <Field label="내용" htmlFor="l-content">
          <Textarea
            id="l-content"
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="실험 결과, 진행 상황, 특이사항 등"
            className="min-h-[120px]"
          />
        </Field>
        <Field label="태그" htmlFor="l-tags" hint="쉼표로 구분 (예: 데이터정제, 이상치)">
          <Input
            id="l-tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="카페인, 설문"
          />
        </Field>
        {error && <p className="mb-3 text-xs text-status-critical">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            취소
          </Button>
          <Button type="submit" loading={saving}>
            {log ? "저장" : "작성"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function WorkLog({
  logs,
  phases,
  userId,
}: {
  logs: LogWithAuthor[];
  phases: Phase[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const phaseName = (id: number | null) =>
    id ? phases.find((p) => p.id === id)?.name : null;

  async function remove(id: string) {
    if (!confirm("이 일지를 삭제할까요?")) return;
    await supabase.from("logs").delete().eq("id", id);
    router.refresh();
  }

  function done() {
    setCreating(false);
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          내 업무 일지 <span className="text-muted">({logs.length})</span>
        </h2>
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> 새 일지
          </Button>
        )}
      </div>

      {creating && (
        <LogEditor
          phases={phases}
          userId={userId}
          onDone={done}
          onCancel={() => setCreating(false)}
        />
      )}

      {logs.length === 0 && !creating ? (
        <EmptyState title="작성한 일지가 없습니다" desc="'새 일지'로 오늘 한 일을 기록하세요" />
      ) : (
        logs.map((l) =>
          editingId === l.id ? (
            <LogEditor
              key={l.id}
              phases={phases}
              userId={userId}
              log={l}
              onDone={done}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <time className="text-xs font-semibold tabular-nums text-primary">
                      {fmtDate(l.log_date)}
                    </time>
                    {phaseName(l.phase_id) && (
                      <Badge tone="neutral">{phaseName(l.phase_id)}</Badge>
                    )}
                  </div>
                  {l.title && <p className="mt-1 text-sm font-semibold">{l.title}</p>}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <button
                    onClick={() => setEditingId(l.id)}
                    className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
                    aria-label="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(l.id)}
                    className="rounded-md p-1.5 text-muted hover:bg-status-critical/10 hover:text-status-critical"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {l.content}
              </p>
              {l.tags && l.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {l.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ),
        )
      )}
    </div>
  );
}
