"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader } from "@/components/ui";
import { Input, Select, Button } from "@/components/form";
import { cn } from "@/lib/utils";
import type { Phase, ProjectGoal, ProjectInfo } from "@/lib/types";

export function ProgressEditor({
  project,
  phases,
  goals,
}: {
  project: ProjectInfo | null;
  phases: Phase[];
  goals: ProjectGoal[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // project_info
  const [collected, setCollected] = useState(project?.collected_sample ?? 0);
  const [target, setTarget] = useState(project?.target_sample ?? 40);
  const [endDate, setEndDate] = useState(project?.end_date ?? "");

  async function saveProject() {
    setSavingKey("project");
    await supabase
      .from("project_info")
      .update({ collected_sample: collected, target_sample: target, end_date: endDate || null })
      .eq("id", 1);
    setSavingKey(null);
    router.refresh();
  }

  async function toggleGoal(g: ProjectGoal) {
    setSavingKey("g" + g.id);
    await supabase.from("project_goals").update({ done: !g.done }).eq("id", g.id);
    setSavingKey(null);
    router.refresh();
  }

  async function updatePhase(p: Phase, patch: Partial<Phase>) {
    setSavingKey("p" + p.id);
    await supabase.from("phases").update(patch).eq("id", p.id);
    setSavingKey(null);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {/* project info */}
      <Card>
        <CardHeader title="프로젝트 개요" desc="대시보드 KPI · 표본 수집 게이지" />
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs">
            <span className="mb-1 block text-text-secondary">수집 표본</span>
            <Input
              type="number"
              value={collected}
              onChange={(e) => setCollected(Number(e.target.value))}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-text-secondary">목표 표본</span>
            <Input
              type="number"
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </label>
          <label className="text-xs">
            <span className="mb-1 block text-text-secondary">연구 마감일</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
        </div>
        <Button size="sm" className="mt-3" onClick={saveProject} loading={savingKey === "project"}>
          <Save className="h-3.5 w-3.5" /> 저장
        </Button>
      </Card>

      {/* goals */}
      <Card>
        <CardHeader
          title="목표 체크리스트"
          desc="전체 진척도 도넛 · 카테고리별 막대에 반영"
        />
        <div className="space-y-1">
          {goals.map((g) => (
            <button
              key={g.id}
              onClick={() => toggleGoal(g)}
              disabled={savingKey === "g" + g.id}
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-2"
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                  g.done
                    ? "border-status-done bg-status-done text-white"
                    : "border-border-strong",
                )}
              >
                {savingKey === "g" + g.id ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : g.done ? (
                  <Check className="h-2.5 w-2.5" />
                ) : null}
              </span>
              <span className={cn(g.done && "text-muted line-through")}>{g.title}</span>
              <span className="ml-auto text-[11px] text-muted">{g.category}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* phases */}
      <Card>
        <CardHeader title="프로젝트 단계" desc="스텝퍼 · 간트 타임라인에 반영" />
        <div className="space-y-3">
          {phases.map((p) => (
            <div key={p.id} className="rounded-lg border border-border p-3">
              <p className="mb-2 text-sm font-semibold">
                P{p.phase_no}. {p.name}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={p.status}
                  onChange={(e) =>
                    updatePhase(p, { status: e.target.value as Phase["status"] })
                  }
                  className="w-28"
                >
                  <option value="planned">예정</option>
                  <option value="active">진행 중</option>
                  <option value="done">완료</option>
                </Select>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={p.progress}
                    className="w-20"
                    onBlur={(e) => {
                      const v = Math.max(0, Math.min(100, Number(e.target.value)));
                      if (v !== p.progress) updatePhase(p, { progress: v });
                    }}
                  />
                  <span className="text-xs text-muted">% 진행</span>
                </div>
                {savingKey === "p" + p.id && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
