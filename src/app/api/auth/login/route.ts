import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  // trim — a stray space from copy-paste should not block login
  password: z.string().trim().min(1).max(200),
});

const GENERIC = "이름 또는 비밀번호가 올바르지 않습니다.";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "이름과 비밀번호를 입력하세요." }, { status: 400 });
  }
  const { name, password } = parsed.data;

  // Look up the internal email for this display name (service role — bypasses RLS).
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("name", name)
    .maybeSingle();

  if (!profile?.email) {
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: GENERIC }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
