import "server-only";
import { embed } from "./gemini";
import { createAdminClient } from "@/lib/supabase/admin";

export interface Source {
  documentId: string;
  documentTitle: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

/** Embed the query, run pgvector similarity search over ready documents. */
export async function retrieve(query: string, matchCount = 8): Promise<Source[]> {
  const queryEmbedding = await embed(query, "RETRIEVAL_QUERY");

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    similarity_threshold: 0.25,
  });

  if (error) throw new Error(`검색 실패: ${error.message}`);

  return (
    (data as Array<{
      id: string;
      document_id: string;
      document_title: string;
      chunk_index: number;
      content: string;
      similarity: number;
    }>) ?? []
  ).map((r) => ({
    documentId: r.document_id,
    documentTitle: r.document_title,
    chunkIndex: r.chunk_index,
    content: r.content,
    similarity: r.similarity,
  }));
}

export function buildContextBlock(sources: Source[]): string {
  if (!sources.length) return "(관련 자료를 찾지 못했습니다.)";
  return sources
    .map((s, i) => `[자료 ${i + 1} · ${s.documentTitle}]\n${s.content}`)
    .join("\n\n---\n\n");
}
