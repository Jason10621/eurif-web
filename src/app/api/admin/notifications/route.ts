import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "leader") {
    return Response.json({ error: "조장만 삭제할 수 있습니다." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
  const groupIds: string[] = Array.isArray(body?.groupIds) ? body.groupIds : [];
  if (!ids.length && !groupIds.length) {
    return Response.json({ error: "삭제할 항목이 없습니다." }, { status: 400 });
  }

  const admin = createAdminClient();
  let deleted = 0;

  if (groupIds.length) {
    const { count } = await admin
      .from("notifications")
      .delete({ count: "exact" })
      .in("group_id", groupIds);
    deleted += count ?? 0;
  }
  if (ids.length) {
    const { count } = await admin
      .from("notifications")
      .delete({ count: "exact" })
      .in("id", ids);
    deleted += count ?? 0;
  }

  return Response.json({ ok: true, deleted });
}
