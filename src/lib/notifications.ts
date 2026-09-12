import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types";

export async function getNotificationState(): Promise<{
  unread: number;
  items: AppNotification[];
}> {
  const supabase = await createClient();
  const [{ count }, { data }] = await Promise.all([
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return {
    unread: count ?? 0,
    items: (data as AppNotification[]) ?? [],
  };
}
