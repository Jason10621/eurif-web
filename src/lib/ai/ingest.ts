import "server-only";
import { embed } from "./gemini";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_CHARS = 1400;
const OVERLAP_CHARS = 250;

/** split text into overlapping chunks, keeping the nearest heading as a prefix */
export function chunkText(text: string, docTitle: string): string[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const chunks: string[] = [];
  let cur = "";
  let heading = "";

  const flush = () => {
    const body = cur.trim();
    if (body.length >= 30) {
      chunks.push(`# ${docTitle}${heading ? ` — ${heading}` : ""}\n\n${body}`);
      const tail = cur.slice(-OVERLAP_CHARS);
      const nl = tail.indexOf("\n");
      cur = nl >= 0 ? tail.slice(nl + 1) : "";
    } else {
      cur = "";
    }
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      if (cur.trim().length > 200) flush();
      heading = h[2].trim();
      if (h[1].length > 1) cur += (cur ? "\n" : "") + line;
      continue;
    }
    if (cur.length + line.length + 1 > MAX_CHARS) flush();
    cur += (cur ? "\n" : "") + line;
  }
  flush();
  return chunks;
}

/** Extract plain text from an uploaded file buffer. */
export async function extractText(
  buf: ArrayBuffer,
  mime: string,
  filename: string,
): Promise<string> {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf") || mime === "application/pdf") {
    const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await pdfExtract(pdf, { mergePages: true });
    return text;
  }
  if (
    name.endsWith(".docx") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return value;
  }
  // txt / md / csv / json
  return new TextDecoder().decode(buf);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Full pipeline for one document: create the row, chunk + embed the text,
 * insert the chunks, mark ready. Returns the document id.
 */
export async function ingestDocument(opts: {
  title: string;
  source: string;
  text: string;
  mimeType?: string;
  byteSize?: number;
  category?: string;
  storagePath?: string;
  uploadedBy?: string;
}): Promise<{ documentId: string; chunkCount: number }> {
  const supabase = createAdminClient();

  await supabase.from("documents").delete().eq("source", opts.source);

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      title: opts.title,
      source: opts.source,
      mime_type: opts.mimeType ?? "text/plain",
      byte_size: opts.byteSize ?? opts.text.length,
      category: opts.category ?? "연구자료",
      storage_path: opts.storagePath ?? null,
      uploaded_by: opts.uploadedBy ?? null,
      status: "processing",
    })
    .select("id")
    .single();
  if (docErr || !doc) throw new Error(docErr?.message ?? "문서 생성 실패");

  const chunks = chunkText(opts.text, opts.title);
  if (!chunks.length) {
    await supabase
      .from("documents")
      .update({ status: "error", error: "추출된 텍스트가 없습니다." })
      .eq("id", doc.id);
    throw new Error("문서에서 텍스트를 추출하지 못했습니다.");
  }

  try {
    const rows = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embed(chunks[i], "RETRIEVAL_DOCUMENT");
      rows.push({
        document_id: doc.id,
        chunk_index: i,
        content: chunks[i],
        token_count: Math.round(chunks[i].length / 2),
        embedding,
      });
      await sleep(80);
    }
    const { error: chunkErr } = await supabase.from("document_chunks").insert(rows);
    if (chunkErr) throw new Error(chunkErr.message);

    await supabase
      .from("documents")
      .update({
        status: "ready",
        chunk_count: rows.length,
        processed_at: new Date().toISOString(),
      })
      .eq("id", doc.id);

    return { documentId: doc.id, chunkCount: rows.length };
  } catch (e) {
    await supabase
      .from("documents")
      .update({ status: "error", error: e instanceof Error ? e.message : "인덱싱 실패" })
      .eq("id", doc.id);
    throw e;
  }
}
