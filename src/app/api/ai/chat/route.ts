import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gemini, aiConfigured, CHAT_MODEL } from "@/lib/ai/gemini";
import { retrieve, buildContextBlock, type Source } from "@/lib/ai/retrieval";
import { SYSTEM_PROMPT, userTurnWithContext } from "@/lib/ai/prompt";

export const maxDuration = 60;

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
    .min(1),
  conversationId: z.string().uuid().optional().nullable(),
});

function dedupeSources(sources: Source[]) {
  const seen = new Map<string, number>();
  for (const s of sources) {
    seen.set(s.documentTitle, Math.max(seen.get(s.documentTitle) ?? 0, s.similarity));
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([title, similarity]) => ({ title, similarity: Number(similarity.toFixed(3)) }));
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!aiConfigured()) {
    return Response.json(
      { error: "EURIF AI 가 아직 설정되지 않았습니다. (관리자에게 Gemini API 키 등록 요청)" },
      { status: 503 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const { messages } = parsed.data;
  let conversationId = parsed.data.conversationId ?? undefined;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return Response.json({ error: "질문이 없습니다." }, { status: 400 });

  // --- retrieve context ---
  let sources: Source[] = [];
  try {
    sources = await retrieve(lastUser.content, 8);
  } catch {
    // fall through — answer without retrieved context
  }
  const context = buildContextBlock(sources);
  const sourceSummary = dedupeSources(sources);

  // --- build conversation contents ---
  const history = messages.slice(0, -1).slice(-6).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const contents = [
    ...history,
    { role: "user", parts: [{ text: userTurnWithContext(lastUser.content, context) }] },
  ];

  const admin = createAdminClient();

  // --- stream generation (retry transient 429/503) ---
  let genStream;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      genStream = await gemini().models.generateContentStream({
        model: CHAT_MODEL,
        contents,
        // maxOutputTokens is shared with the model's internal thinking budget on
        // Gemini 3.x, so keep it generous to avoid mid-answer truncation.
        config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.4, maxOutputTokens: 8192 },
      });
      break;
    } catch (e) {
      lastErr = e;
      const m = e instanceof Error ? e.message : String(e);
      if (!/\b429\b|\b503\b|RESOURCE_EXHAUSTED|UNAVAILABLE|overloaded|high demand|quota/i.test(m)) {
        break;
      }
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }

  if (!genStream) {
    const raw = lastErr instanceof Error ? lastErr.message : String(lastErr);
    let error = "AI 응답 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
    let status = 502;
    if (/\b429\b|RESOURCE_EXHAUSTED|quota/i.test(raw)) {
      error =
        "무료 AI 사용량이 잠깐 한도에 도달했어요. 30초쯤 뒤에 다시 물어봐 주세요.";
      status = 429;
    } else if (/\b503\b|UNAVAILABLE|overloaded|high demand/i.test(raw)) {
      error = "AI 서버가 혼잡합니다. 잠시 후 다시 시도해주세요.";
      status = 503;
    }
    return Response.json({ error }, { status });
  }

  // --- generation started OK → now persist the conversation + user message ---
  if (!conversationId) {
    const { data } = await admin
      .from("ai_conversations")
      .insert({ user_id: user.id, title: lastUser.content.slice(0, 40) })
      .select("id")
      .single();
    conversationId = data?.id;
  }
  if (conversationId) {
    await admin
      .from("ai_messages")
      .insert({ conversation_id: conversationId, role: "user", content: lastUser.content });
  }

  const encoder = new TextEncoder();
  let full = "";

  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of genStream) {
          const t = chunk.text;
          if (t) {
            full += t;
            controller.enqueue(encoder.encode(t));
          }
        }
      } catch {
        const msg = "\n\n(응답 생성 중 오류가 발생했습니다.)";
        full += msg;
        controller.enqueue(encoder.encode(msg));
      } finally {
        // Persist the assistant message BEFORE closing the stream. On serverless
        // (Vercel) the function can be frozen the moment the response ends, so a
        // fire-and-forget insert after close() would be dropped.
        if (conversationId && full.trim()) {
          try {
            await admin.from("ai_messages").insert({
              conversation_id: conversationId,
              role: "assistant",
              content: full,
              sources: sourceSummary,
            });
            await admin
              .from("ai_conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", conversationId);
          } catch {
            // non-fatal — the client already has the full answer
          }
        }
        controller.close();
      }
    },
  });

  return new Response(rs, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-conversation-id": conversationId ?? "",
      "x-sources": encodeURIComponent(JSON.stringify(sourceSummary)),
    },
  });
}
