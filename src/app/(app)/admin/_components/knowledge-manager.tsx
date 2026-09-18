"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, Badge } from "@/components/ui";
import { Field, Input, Select, Button } from "@/components/form";
import { RESOURCE_CATEGORIES } from "@/lib/types";
import { fmtDate } from "@/lib/utils";
import type { DocRow } from "@/lib/admin";

export function KnowledgeManager({ docs, aiConfigured }: { docs: DocRow[]; aiConfigured: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("연구자료");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalChunks = docs.reduce((s, d) => s + (d.chunk_count || 0), 0);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title.trim());
      fd.append("category", category);
      const res = await fetch("/api/ai/ingest-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      setMsg({ ok: true, text: `"${title || file.name}" 인덱싱 완료 (${data.chunkCount}개 청크)` });
      setFile(null);
      setTitle("");
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "오류" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: DocRow) {
    if (!confirm(`"${d.title}" 문서를 지식베이스에서 삭제할까요?`)) return;
    setDeletingId(d.id);
    await fetch(`/api/ai/documents/${d.id}`, { method: "DELETE" });
    setDeletingId(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="ULIF AI 지식베이스"
        desc={`${docs.length}개 문서 · ${totalChunks}개 청크 인덱싱됨`}
      />

      {!aiConfigured && (
        <p className="mb-4 rounded-lg bg-status-warning/10 px-3 py-2 text-xs text-[#8a5a00] dark:text-status-warning">
          ⚠️ 문서를 추가하려면 <code>GOOGLE_GENERATIVE_AI_API_KEY</code> 환경변수가 필요합니다.
          (로컬 <code>.env.local</code> + Vercel 환경변수)
        </p>
      )}

      <form onSubmit={upload} className="mb-5 rounded-xl border border-border p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="파일" htmlFor="kb-file" hint="PDF · TXT · MD · DOCX (최대 8MB)">
            <Input
              id="kb-file"
              type="file"
              accept=".pdf,.txt,.md,.docx,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ""));
              }}
              className="file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2 file:py-1 file:text-xs"
            />
          </Field>
          <Field label="카테고리" htmlFor="kb-cat">
            <Select id="kb-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="문서 제목" htmlFor="kb-title">
          <Input
            id="kb-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="AI가 인용할 때 표시할 이름"
          />
        </Field>
        {msg && (
          <p
            className={`mb-3 flex items-center gap-1.5 text-xs ${
              msg.ok ? "text-status-done" : "text-status-critical"
            }`}
          >
            {msg.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            {msg.text}
          </p>
        )}
        <Button type="submit" loading={busy} disabled={!file || !aiConfigured}>
          <Upload className="h-3.5 w-3.5" /> 업로드 & 인덱싱
        </Button>
        {busy && (
          <p className="mt-2 text-[11px] text-muted">
            텍스트 추출 → 청크 분할 → 임베딩 중… (문서 크기에 따라 최대 1분)
          </p>
        )}
      </form>

      <div className="space-y-2">
        {docs.length === 0 && (
          <p className="text-sm text-muted">
            아직 문서가 없습니다. <code>node scripts/ingest-knowledge.mjs</code>로 기본
            자료를 넣거나 위에서 파일을 추가하세요.
          </p>
        )}
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
          >
            <FileText className="h-4 w-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{d.title}</p>
              <p className="truncate text-[11px] text-muted">
                {d.source} · {fmtDate(d.created_at)}
                {d.error ? ` · ${d.error}` : ""}
              </p>
            </div>
            <Badge
              tone={
                d.status === "ready" ? "done" : d.status === "error" ? "critical" : "planned"
              }
            >
              {d.status === "ready"
                ? `${d.chunk_count}청크`
                : d.status === "error"
                  ? "오류"
                  : d.status === "processing"
                    ? "처리 중"
                    : "대기"}
            </Badge>
            <button
              onClick={() => remove(d)}
              disabled={deletingId === d.id}
              className="rounded-md p-1.5 text-muted hover:bg-status-critical/10 hover:text-status-critical"
              aria-label="삭제"
            >
              {deletingId === d.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
