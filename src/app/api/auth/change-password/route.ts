import { z } from "zod";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ currentPassword: z.string().trim().min(1) });

/**
 * Verifies the logged-in user's current password. The actual password change is
 * done client-side with supabase.auth.updateUser() so the caller's session stays
 * valid (a server-side admin update revokes it).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "현재 비밀번호를 입력하세요." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();
  if (!profile?.email) {
    return Response.json({ error: "프로필을 찾을 수 없습니다." }, { status: 400 });
  }

  const verifier = createSbClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await verifier.auth.signInWithPassword({
    email: profile.email,
    password: parsed.data.currentPassword,
  });
  if (error) {
    return Response.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 403 });
  }

  return Response.json({ ok: true });
}
