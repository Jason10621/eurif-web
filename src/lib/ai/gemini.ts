import "server-only";
import { GoogleGenAI } from "@google/genai";

export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIM = 768;
export const CHAT_MODEL = "gemini-3.6-flash";

let client: GoogleGenAI | null = null;

export function gemini(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GOOGLE_GENERATIVE_AI_API_KEY 가 설정되지 않았습니다. (.env.local / Vercel 환경변수)",
      );
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export function aiConfigured(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "QUESTION_ANSWERING";

/** Embed a single string → 768-dim vector. */
export async function embed(text: string, taskType: EmbedTask): Promise<number[]> {
  const res = await gemini().models.embedContent({
    model: EMBED_MODEL,
    contents: text,
    config: { outputDimensionality: EMBED_DIM, taskType },
  });
  const values = res.embeddings?.[0]?.values;
  if (!values || values.length !== EMBED_DIM) {
    throw new Error("임베딩 생성에 실패했습니다.");
  }
  return values;
}
