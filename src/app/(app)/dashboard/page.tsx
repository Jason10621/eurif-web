import {
  getDashboardData,
  overallProgress,
  goalsByCategory,
  currentPhase,
  phaseCompletion,
  taskStatsByMember,
} from "@/lib/dashboard";
import { Card, CardHeader, StatTile, PageHeader, Badge, EmptyState } from "@/components/ui";
import { fmtDate, daysUntil } from "@/lib/utils";
import { ListChecks } from "lucide-react";

import { OverallProgress } from "./_components/overall-progress";
import { GoalsByCategory } from "./_components/goals-by-category";
import { PhaseStepper } from "./_components/phase-stepper";
import { PhaseGantt } from "./_components/phase-gantt";
import { ContributionChart } from "./_components/contribution-chart";
import { ModelCard } from "./_components/model-card";
import { TaskStatusChart } from "./_components/task-status-chart";
import { ActivityFeed } from "./_components/activity-feed";
import { AnnouncementBanner } from "./_components/announcement-banner";

export const metadata = { title: "팀 대시보드" };

export default async function DashboardPage() {
  const data = await getDashboardData();
  const { project, phases, goals, analysis, members, tasks, logs, resources, announcements } =
    data;

  const progress = overallProgress(goals);
  const doneGoals = goals.filter((g) => g.done).length;
  const byCategory = goalsByCategory(goals);
  const cur = currentPhase(phases);
  const phaseAvg = phaseCompletion(phases);
  const taskRows = taskStatsByMember(tasks, members);
  const tasksDone = tasks.filter((t) => t.status === "done").length;

  const dday = daysUntil(project?.end_date);
  const sample = project
    ? { got: project.collected_sample, target: project.target_sample }
    : { got: 0, target: 40 };
  const samplePct = sample.target
    ? Math.round((sample.got / sample.target) * 100)
    : 0;

  return (
    <>
      <PageHeader
        title={project?.title ?? "EURIF 팀 대시보드"}
        desc={project?.subtitle ?? undefined}
      />

      <AnnouncementBanner announcements={announcements} />

      {/* KPI row */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="전체 진척도"
          value={`${progress}%`}
          sub={`목표 ${doneGoals}/${goals.length} · 단계 평균 ${phaseAvg}%`}
          accent="primary"
        />
        <StatTile
          label="현재 단계"
          value={cur ? `P${cur.phase_no}` : "-"}
          sub={cur?.name ?? "단계 없음"}
          accent="primary"
        />
        <StatTile
          label="표본 수집"
          value={`${sample.got}/${sample.target}`}
          sub={`목표의 ${samplePct}%`}
          accent={sample.got >= sample.target ? "done" : "warning"}
        />
        <StatTile
          label="연구 마감"
          value={dday != null ? (dday >= 0 ? `D-${dday}` : `D+${-dday}`) : "-"}
          sub={project?.end_date ? fmtDate(project.end_date) : "미정"}
          accent={dday != null && dday < 21 ? "critical" : "muted"}
        />
      </div>

      {/* progress + goals */}
      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader
            title="전체 진척도"
            desc="목표 가중치 기준 완료율"
          />
          <OverallProgress
            value={progress}
            doneCount={doneGoals}
            totalCount={goals.length}
          />
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title="목표 카테고리별 진척"
            desc="완료(파랑) / 남은 작업(회색)"
          />
          <GoalsByCategory data={byCategory} />
        </Card>
      </div>

      {/* phase stepper */}
      <Card className="mb-5">
        <CardHeader
          title="프로젝트 단계"
          desc="Phase 1 → 6 · 관찰연구 데이터 파이프라인"
          action={
            cur && (
              <Badge tone="active">
                진행 {cur.progress}%
              </Badge>
            )
          }
        />
        <PhaseStepper phases={phases} current={cur} />
      </Card>

      {/* gantt timeline */}
      <Card className="mb-5">
        <CardHeader title="프로젝트 타임라인" desc="단계별 일정 (Gantt)" />
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <PhaseGantt phases={phases} />
          </div>
        </div>
      </Card>

      {/* regression model + contributions */}
      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="예상 변수 기여도"
            desc="표준화 회귀계수 β* — 클수록 수면 위상 지연에 강한 영향"
          />
          <ContributionChart analysis={analysis} />
        </Card>
        <Card>
          <CardHeader
            title="다중선형회귀 모형"
            desc="세 독립변수 → 수면 위상 지연량(Y)"
          />
          <ModelCard analysis={analysis} />
        </Card>
      </div>

      {/* tasks + activity */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="팀원별 과제 현황"
            desc={`완료 ${tasksDone} / 전체 ${tasks.length}`}
          />
          {taskRows.length ? (
            <TaskStatusChart data={taskRows} />
          ) : (
            <EmptyState
              icon={<ListChecks className="h-6 w-6" />}
              title="등록된 과제가 없습니다"
              desc="조장이 개인 워크스페이스에서 과제를 배정하면 표시됩니다"
            />
          )}
        </Card>
        <Card>
          <CardHeader title="최근 활동" desc="업무 일지 · 자료 업데이트" />
          <ActivityFeed logs={logs} resources={resources} />
        </Card>
      </div>
    </>
  );
}
