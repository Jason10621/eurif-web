"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { Button } from "@/components/form";
import { fmtRelative } from "@/lib/utils";
import type { NotifGroup } from "@/lib/admin";

const TYPE_LABEL: Record<string, string> = {
  task: "과제 배정",
  task_done: "과제 완료",
  log: "업무 일지",
  resource: "자료",
  phase: "단계 변경",
  announce: "공지",
};

export function NotificationAdmin({ groups }: { groups: NotifGroup[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function deleteSelected() {
    if (!selected.size) return;
    if (!confirm(`선택한 ${selected.size}개 알림을 전 조원 기록에서 삭제할까요?`)) return;
    setBusy(true);
    const chosen = groups.filter((g) => selected.has(g.key));
    const groupIds = chosen.filter((g) => g.groupId).map((g) => g.groupId as string);
    const ids = chosen.filter((g) => !g.groupId).flatMap((g) => g.ids);
    await fetch("/api/admin/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupIds, ids }),
    });
    setSelected(new Set());
    setBusy(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="보낸 알림 관리"
        desc="예전에 조원들에게 전달된 알림을 골라 완전히 삭제 (모두의 기록에서 사라짐)"
        action={
          selected.size > 0 && (
            <Button size="sm" variant="danger" onClick={deleteSelected} loading={busy}>
              <Trash2 className="h-3.5 w-3.5" /> {selected.size}개 삭제
            </Button>
          )
        }
      />

      {groups.length === 0 ? (
        <p className="text-sm text-muted">보낸 알림이 없습니다.</p>
      ) : (
        <div className="space-y-1">
          {groups.map((g) => (
            <label
              key={g.key}
              className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(g.key)}
                onChange={() => toggle(g.key)}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  <span className="mr-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                    {TYPE_LABEL[g.type] ?? g.type}
                  </span>
                  {g.title}
                </p>
                {g.body && (
                  <p className="mt-0.5 truncate text-[11px] text-text-secondary">{g.body}</p>
                )}
                <p className="mt-0.5 text-[10px] text-muted">
                  수신 {g.recipients}명 · {fmtRelative(g.created_at)}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
      {busy && (
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> 삭제 중…
        </p>
      )}
    </Card>
  );
}
