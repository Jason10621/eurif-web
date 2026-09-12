import { createClient } from "@/lib/supabase/server";
import type {
  AnalysisResult,
  Phase,
  ProjectGoal,
  ProjectInfo,
  Profile,
  TaskWithAssignee,
  LogWithAuthor,
  ResourceWithUploader,
  Announcement,
} from "@/lib/types";

export interface DashboardData {
  project: ProjectInfo | null;
  phases: Phase[];
  goals: ProjectGoal[];
  analysis: AnalysisResult[];
  members: Pick<Profile, "id" | "name" | "part" | "role">[];
  tasks: TaskWithAssignee[];
  logs: LogWithAuthor[];
  resources: ResourceWithUploader[];
  announcements: Announcement[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();

  const [project, phases, goals, analysis, members, tasks, logs, resources, announcements] =
    await Promise.all([
      supabase.from("project_info").select("*").eq("id", 1).maybeSingle(),
      supabase.from("phases").select("*").order("order_index"),
      supabase.from("project_goals").select("*").order("order_index"),
      supabase.from("analysis_results").select("*").order("id"),
      supabase.from("profiles").select("id,name,part,role").order("role"),
      supabase
        .from("tasks")
        .select("*, assignee:assignee_id(name,part)")
        .order("created_at", { ascending: false }),
      supabase
        .from("logs")
        .select("*, author:author_id(name,part)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("resources")
        .select("*, uploader:uploaded_by(name)")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  return {
    project: (project.data as ProjectInfo) ?? null,
    phases: (phases.data as Phase[]) ?? [],
    goals: (goals.data as ProjectGoal[]) ?? [],
    analysis: (analysis.data as AnalysisResult[]) ?? [],
    members: (members.data as DashboardData["members"]) ?? [],
    announcements: (announcements.data as Announcement[]) ?? [],
    tasks: (tasks.data as TaskWithAssignee[]) ?? [],
    logs: (logs.data as LogWithAuthor[]) ?? [],
    resources: (resources.data as ResourceWithUploader[]) ?? [],
  };
}

/* ---------------- derived metrics ---------------- */

export function overallProgress(goals: ProjectGoal[]): number {
  const total = goals.reduce((s, g) => s + Number(g.weight), 0);
  if (!total) return 0;
  const done = goals
    .filter((g) => g.done)
    .reduce((s, g) => s + Number(g.weight), 0);
  return Math.round((done / total) * 100);
}

export function goalsByCategory(goals: ProjectGoal[]) {
  const map = new Map<string, { done: number; total: number }>();
  for (const g of goals) {
    const e = map.get(g.category) ?? { done: 0, total: 0 };
    e.total += 1;
    if (g.done) e.done += 1;
    map.set(g.category, e);
  }
  return [...map.entries()].map(([category, v]) => ({
    category,
    done: v.done,
    remaining: v.total - v.done,
    total: v.total,
    pct: v.total ? Math.round((v.done / v.total) * 100) : 0,
  }));
}

export function currentPhase(phases: Phase[]): Phase | null {
  if (!phases.length) return null;
  return (
    phases.find((p) => p.status === "active") ??
    phases.find((p) => p.status === "planned") ??
    phases[phases.length - 1]
  );
}

export function phaseCompletion(phases: Phase[]): number {
  if (!phases.length) return 0;
  return Math.round(
    phases.reduce((s, p) => s + p.progress, 0) / phases.length,
  );
}

export function taskStatsByMember(
  tasks: TaskWithAssignee[],
  members: DashboardData["members"],
) {
  return members
    .map((m) => {
      const mine = tasks.filter((t) => t.assignee_id === m.id);
      return {
        name: m.name,
        todo: mine.filter((t) => t.status === "todo").length,
        in_progress: mine.filter((t) => t.status === "in_progress").length,
        done: mine.filter((t) => t.status === "done").length,
        total: mine.length,
      };
    })
    .filter((m) => m.total > 0);
}
