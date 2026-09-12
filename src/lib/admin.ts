import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Phase,
  ProjectGoal,
  ProjectInfo,
  AnalysisResult,
  Profile,
  Announcement,
  AppNotification,
} from "@/lib/types";

export interface DocRow {
  id: string;
  title: string;
  source: string | null;
  status: string;
  chunk_count: number;
  category: string | null;
  error: string | null;
  created_at: string;
}

/** one card per fan-out event (grouped by group_id) */
export interface NotifGroup {
  key: string;
  ids: string[];
  groupId: string | null;
  type: string;
  title: string;
  body: string | null;
  recipients: number;
  created_at: string;
}

export async function getAdminData() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const [docs, project, phases, goals, analysis, members, announcements, notifs] =
    await Promise.all([
      supabase
        .from("documents")
        .select("id,title,source,status,chunk_count,category,error,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("project_info").select("*").eq("id", 1).maybeSingle(),
      supabase.from("phases").select("*").order("order_index"),
      supabase.from("project_goals").select("*").order("order_index"),
      supabase.from("analysis_results").select("*").order("id"),
      supabase.from("profiles").select("id,name,part,role,student_no").order("role"),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      // all recipients' notifications — needs service role (RLS is per-user)
      admin
        .from("notifications")
        .select("id,group_id,type,title,body,created_at")
        .order("created_at", { ascending: false })
        .limit(400),
    ]);

  // group notifications by group_id (fallback: id)
  const groups = new Map<string, NotifGroup>();
  for (const n of (notifs.data as Array<
    Pick<AppNotification, "id" | "group_id" | "type" | "title" | "body" | "created_at">
  >) ?? []) {
    const key = n.group_id ?? n.id;
    const g = groups.get(key);
    if (g) {
      g.ids.push(n.id);
      g.recipients += 1;
    } else {
      groups.set(key, {
        key,
        ids: [n.id],
        groupId: n.group_id,
        type: n.type,
        title: n.title,
        body: n.body,
        recipients: 1,
        created_at: n.created_at,
      });
    }
  }

  return {
    docs: (docs.data as DocRow[]) ?? [],
    project: (project.data as ProjectInfo) ?? null,
    phases: (phases.data as Phase[]) ?? [],
    goals: (goals.data as ProjectGoal[]) ?? [],
    analysis: (analysis.data as AnalysisResult[]) ?? [],
    members:
      (members.data as Pick<Profile, "id" | "name" | "part" | "role" | "student_no">[]) ?? [],
    announcements: (announcements.data as Announcement[]) ?? [],
    notifGroups: [...groups.values()].slice(0, 60),
  };
}
