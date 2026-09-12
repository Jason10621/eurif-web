"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Megaphone, Pin, Trash2, Send, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader } from "@/components/ui";
import { Field, Input, Textarea, Button } from "@/components/form";
import { fmtRelative } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export function AnnouncementManager({
  announcements,
  authorId,
}: {
  announcements: Announcement[];
  authorId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      body: body.trim() || null,
      pinned,
      author_id: authorId,
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setTitle("");
    setBody("");
    setPinned(false);
    router.refresh();
  }

  async function remove(a: Announcement) {
    if (!confirm(`공지 "${a.title}"를 삭제할까요?`)) return;
    setWorking(a.id);
    await supabase.from("announcements").delete().eq("id", a.id);
    setWorking(null);
    router.refresh();
  }

  async function togglePin(a: Announcement) {
    setWorking(a.id);
    await supabase.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id);
    setWorking(null);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader
        title="전체 공지"
        desc="올리면 전 조원에게 알림 + 휴대폰 푸시가 발송됩니다"
      />

      <form onSubmit={post} className="mb-5 rounded-xl border border-border p-4">
        <Field label="공지 제목" htmlFor="a-title">
          <Input
            id="a-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 이번 주 토요일 3시 모여서 데이터 정제"
            required
          />
        </Field>
        <Field label="내용 (선택)" htmlFor="a-body">
          <Textarea
            id="a-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="상세 내용"
          />
        </Field>
        <label className="mb-3 flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          대시보드 상단에 고정
        </label>
        {err && <p className="mb-2 text-xs text-status-critical">{err}</p>}
        <Button type="submit" loading={busy}>
          <Send className="h-3.5 w-3.5" /> 공지 발송
        </Button>
      </form>

      <div className="space-y-2">
        {announcements.length === 0 && (
          <p className="text-sm text-muted">등록된 공지가 없습니다.</p>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5">
            <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {a.pinned && <Pin className="mr-1 inline h-3 w-3 text-primary" />}
                {a.title}
              </p>
              {a.body && <p className="mt-0.5 truncate text-xs text-text-secondary">{a.body}</p>}
              <p className="mt-0.5 text-[11px] text-muted">{fmtRelative(a.created_at)}</p>
            </div>
            <div className="flex shrink-0 gap-0.5">
              <button
                onClick={() => togglePin(a)}
                disabled={working === a.id}
                className={`rounded-md p-1.5 hover:bg-surface-2 ${a.pinned ? "text-primary" : "text-muted"}`}
                aria-label="고정"
              >
                {working === a.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => remove(a)}
                disabled={working === a.id}
                className="rounded-md p-1.5 text-muted hover:bg-status-critical/10 hover:text-status-critical"
                aria-label="삭제"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
