import { createClient } from "@/lib/supabase/server";
import type {
  Phase,
  Profile,
  TaskWithAssignee,
  LogWithAuthor,
} from "@/lib/types";

export async function getWorkspaceData(userId: string) {
  const supabase = await createClient();

  const [tasks, logs, members, phases] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:assignee_id(name,part)")
      .order("status")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("logs")
      .select("*, author:author_id(name,part)")
      .eq("author_id", userId)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id,name,part,role").order("role"),
    supabase.from("phases").select("*").order("order_index"),
  ]);

  return {
    tasks: (tasks.data as TaskWithAssignee[]) ?? [],
    logs: (logs.data as LogWithAuthor[]) ?? [],
    members: (members.data as Pick<Profile, "id" | "name" | "part" | "role">[]) ?? [],
    phases: (phases.data as Phase[]) ?? [],
  };
}
