"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/dialog";
import { Field, Input, Textarea, Select, Button } from "@/components/form";
import { RESOURCE_CATEGORIES } from "@/lib/types";
import type { ResourceCategory, ResourceItem } from "@/lib/types";

const PARTS = ["정보학", "약학", "뇌과학·수면위상", "생명공학", "정책", "공통"];

function sanitize(name: string) {
  return name.replace(/[^\w.\-가-힣]/g, "_").slice(0, 120);
}

export function ResourceDialog({
  open,
  onClose,
  userId,
  resource,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  resource?: ResourceItem | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const editing = !!resource;

  const [mode, setMode] = useState<"link" | "file">(
    resource?.storage_path ? "file" : "link",
  );
  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [category, setCategory] = useState<ResourceCategory>(
    resource?.category ?? "연구자료",
  );
  const [part, setPart] = useState(resource?.part ?? "공통");
  const [url, setUrl] = useState(resource?.url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const base = {
        title: title.trim(),
        description: description.trim() || null,
        category,
        part,
      };

      if (mode === "link") {
        const payload = { ...base, url: url.trim(), storage_path: null };
        const { error } = editing
          ? await supabase.from("resources").update(payload).eq("id", resource!.id)
          : await supabase.from("resources").insert({ ...payload, uploaded_by: userId });
        if (error) throw error;
      } else {
        let storage_path = resource?.storage_path ?? null;
        let file_name = resource?.file_name ?? null;
        let file_size = resource?.file_size ?? null;
        let mime_type = resource?.mime_type ?? null;

        if (file) {
          const path = `${userId}/${Date.now()}-${sanitize(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from("resources")
            .upload(path, file, { upsert: false });
          if (upErr) throw upErr;
          storage_path = path;
          file_name = file.name;
          file_size = file.size;
          mime_type = file.type || null;
        } else if (!editing) {
          throw new Error("파일을 선택하세요.");
        }

        const payload = {
          ...base,
          url: null,
          storage_path,
          file_name,
          file_size,
          mime_type,
        };
        const { error } = editing
          ? await supabase.from("resources").update(payload).eq("id", resource!.id)
          : await supabase.from("resources").insert({ ...payload, uploaded_by: userId });
        if (error) throw error;
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title={editing ? "자료 수정" : "자료 추가"}>
      <form onSubmit={save}>
        <div className="mb-4 flex gap-1 rounded-lg bg-surface-2 p-1">
          {(["link", "file"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                mode === m ? "bg-surface text-text shadow-sm" : "text-muted"
              }`}
            >
              {m === "link" ? "링크 (논문·URL)" : "파일 업로드"}
            </button>
          ))}
        </div>

        <Field label="제목" htmlFor="r-title">
          <Input
            id="r-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="자료 제목"
          />
        </Field>
        <Field label="설명" htmlFor="r-desc">
          <Textarea
            id="r-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="핵심 내용, 활용 방안 등"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="카테고리" htmlFor="r-cat">
            <Select
              id="r-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as ResourceCategory)}
            >
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="관련 파트" htmlFor="r-part">
            <Select id="r-part" value={part} onChange={(e) => setPart(e.target.value)}>
              {PARTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {mode === "link" ? (
          <Field label="URL" htmlFor="r-url">
            <Input
              id="r-url"
              type="url"
              required={mode === "link"}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </Field>
        ) : (
          <Field
            label="파일"
            htmlFor="r-file"
            hint={
              editing && resource?.file_name
                ? `현재: ${resource.file_name} (새 파일 선택 시 교체)`
                : "PDF, 이미지, 문서 등 (최대 50MB)"
            }
          >
            <Input
              id="r-file"
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2 file:py-1 file:text-xs"
            />
          </Field>
        )}

        {error && <p className="mb-3 text-xs text-status-critical">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            취소
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "저장" : "추가"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
