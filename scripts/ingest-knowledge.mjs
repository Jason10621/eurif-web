/**
 * EURIF AI 지식베이스 인제스트 (로컬 실행)
 *
 *   knowledge/*.md  →  청크 분할  →  Gemini 임베딩(768d)  →  Supabase document_chunks
 *
 * 실행:  eurif-web 폴더에서  node scripts/ingest-knowledge.mjs
 * 필요:  .env.local 의 SUPABASE_SERVICE_ROLE_KEY, GOOGLE_GENERATIVE_AI_API_KEY
 * 여러 번 실행해도 안전 (파일명 기준으로 기존 문서 교체).
 */
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const EMBED_MODEL = "gemini-embedding-001";
const EMBED_DIM = 768;
const MAX_CHARS = 1400;
const OVERLAP_CHARS = 250;

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// load .env.local (vercel env pull 결과물은 값이 큰따옴표로 감싸져 나옴 → 벗겨냄)
try {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let v = m[2].trim();
    if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    process.env[m[1]] = v;
  }
} catch {
  console.error("⚠  .env.local 을 읽지 못했습니다.");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음");
  process.exit(1);
}
if (!geminiKey) {
  console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY 없음 (aistudio.google.com/apikey)");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
const ai = new GoogleGenAI({ apiKey: geminiKey });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** split markdown into overlapping chunks, keeping the nearest heading as a prefix */
function chunkMarkdown(text, docTitle) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let cur = "";
  let heading = "";

  const flush = () => {
    const body = cur.trim();
    if (body.length < 30) {
      cur = "";
      return;
    }
    const prefix = `# ${docTitle}${heading ? ` — ${heading}` : ""}\n\n`;
    chunks.push(prefix + body);
    // carry the tail as overlap for the next chunk
    const tail = cur.slice(-OVERLAP_CHARS);
    const nl = tail.indexOf("\n");
    cur = nl >= 0 ? tail.slice(nl + 1) : "";
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      if (cur.trim().length > 200) flush();
      heading = h[2].trim();
      // don't add the top-level doc title line itself to the body
      if (h[1].length > 1) cur += (cur ? "\n" : "") + line;
      continue;
    }
    if (cur.length + line.length + 1 > MAX_CHARS) flush();
    cur += (cur ? "\n" : "") + line;
  }
  flush();
  return chunks;
}

async function embedWithRetry(text, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await ai.models.embedContent({
        model: EMBED_MODEL,
        contents: text,
        config: { outputDimensionality: EMBED_DIM, taskType: "RETRIEVAL_DOCUMENT" },
      });
      const v = res.embeddings?.[0]?.values;
      if (!v || v.length !== EMBED_DIM) throw new Error("bad embedding shape");
      return v;
    } catch (e) {
      const wait = 1500 * (i + 1);
      console.warn(`   임베딩 재시도 ${i + 1}/${tries} (${wait}ms) — ${e.message}`);
      await sleep(wait);
    }
  }
  throw new Error("임베딩 실패 (재시도 초과)");
}

const dir = join(root, "knowledge");
const files = readdirSync(dir).filter((f) => f.endsWith(".md")).sort();
if (!files.length) {
  console.error("❌ knowledge/*.md 파일이 없습니다.");
  process.exit(1);
}

console.log(`지식베이스 인제스트 시작 — ${files.length}개 파일\n`);
let totalChunks = 0;

for (const file of files) {
  const raw = readFileSync(join(dir, file), "utf8");
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : file.replace(/\.md$/, "");
  const chunks = chunkMarkdown(raw, title);

  // replace existing
  await supabase.from("documents").delete().eq("source", file);
  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      title,
      source: file,
      mime_type: "text/markdown",
      byte_size: Buffer.byteLength(raw),
      category: "연구자료",
      status: "processing",
    })
    .select("id")
    .single();
  if (docErr) {
    console.error(`❌ ${file}: ${docErr.message}`);
    continue;
  }

  process.stdout.write(`${file}  (${chunks.length} 청크) `);
  const rows = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await embedWithRetry(chunks[i]);
    rows.push({
      document_id: doc.id,
      chunk_index: i,
      content: chunks[i],
      token_count: Math.round(chunks[i].length / 2),
      embedding,
    });
    process.stdout.write(".");
    await sleep(120);
  }

  const { error: chunkErr } = await supabase.from("document_chunks").insert(rows);
  if (chunkErr) {
    console.log(" ❌");
    console.error(`   ${chunkErr.message}`);
    await supabase.from("documents").update({ status: "error", error: chunkErr.message }).eq("id", doc.id);
    continue;
  }

  await supabase
    .from("documents")
    .update({ status: "ready", chunk_count: rows.length, processed_at: new Date().toISOString() })
    .eq("id", doc.id);
  totalChunks += rows.length;
  console.log(" ✔");
}

console.log(`\n완료. 총 ${totalChunks}개 청크 인덱싱됨.`);
