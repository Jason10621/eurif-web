import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { aiConfigured } from "@/lib/ai/gemini";
import { extractText, ingestDocument } from "@/lib/ai/ingest";

export const maxDuration = 60;

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "leader") {
    return Response.json({ error: "조장만 문서를 추가할 수 있습니다." }, { status: 403 });
  }

  if (!aiConfigured()) {
    return Response.json({ error: "Gemini API 키가 설정되지 않았습니다." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const title = (form.get("title") as string | null)?.trim();
  const category = (form.get("category") as string | null)?.trim() || "연구자료";

  if (!(file instanceof File)) {
    return Response.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "파일이 너무 큽니다 (최대 8MB)." }, { status: 413 });
  }

  const buf = await file.arrayBuffer();
  let text: string;
  try {
    text = await extractText(buf, file.type, file.name);
  } catch (e) {
    return Response.json(
      { error: `텍스트 추출 실패: ${e instanceof Error ? e.message : "알 수 없음"}` },
      { status: 422 },
    );
  }
  if (text.trim().length < 40) {
    return Response.json(
      { error: "문서에서 읽을 수 있는 텍스트가 거의 없습니다 (스캔 이미지 PDF 등)." },
      { status: 422 },
    );
  }

  // store the original file
  const admin = createAdminClient();
  const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^\w.\-가-힣]/g, "_")}`;
  await admin.storage.from("ai-documents").upload(storagePath, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  try {
    const { chunkCount } = await ingestDocument({
      title: title || file.name.replace(/\.[^.]+$/, ""),
      source: `upload:${file.name}`,
      text,
      mimeType: file.type,
      byteSize: file.size,
      category,
      storagePath,
      uploadedBy: user.id,
    });
    return Response.json({ ok: true, chunkCount });
  } catch (e) {
    return Response.json(
      { error: `인덱싱 실패: ${e instanceof Error ? e.message : "알 수 없음"}` },
      { status: 500 },
    );
  }
}
