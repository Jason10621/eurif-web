import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "leader") {
    return Response.json({ error: "조장만 삭제할 수 있습니다." }, { status: 403 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("storage_path")
    .eq("id", id)
    .single();
  if (doc?.storage_path) {
    await admin.storage.from("ai-documents").remove([doc.storage_path]);
  }
  const { error } = await admin.from("documents").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
