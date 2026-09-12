"use client";

import { useState } from "react";
import { KeyRound, Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, Badge } from "@/components/ui";
import type { Profile } from "@/lib/types";

type Member = Pick<Profile, "id" | "name" | "part" | "role" | "student_no">;

export function MemberManager({ members }: { members: Member[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  async function reset(m: Member) {
    if (pw.length < 6) {
      setMsg({ id: m.id, ok: false, text: "6자 이상 입력하세요." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: m.id, newPassword: pw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "실패");
      setMsg({ id: m.id, ok: true, text: `${m.name} 비밀번호를 변경했습니다.` });
      setOpenId(null);
      setPw("");
    } catch (e) {
      setMsg({ id: m.id, ok: false, text: e instanceof Error ? e.message : "오류" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="팀원 계정"
        desc="비밀번호를 잊은 조원의 비밀번호를 재설정합니다"
      />
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                {m.name.slice(-2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{m.name}</p>
                <p className="text-[11px] text-muted">
                  {m.part ?? "-"}
                  {m.student_no ? ` · ${m.student_no}` : ""}
                </p>
              </div>
              {m.role === "leader" && <Badge tone="active">조장</Badge>}
              <button
                onClick={() => {
                  setOpenId(openId === m.id ? null : m.id);
                  setPw("");
                  setMsg(null);
                }}
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
                aria-label="비밀번호 재설정"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            </div>

            {openId === m.id && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                <input
                  type="text"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="새 비밀번호 (6자 이상)"
                  className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={() => reset(m)}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg disabled:opacity-60"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  변경
                </button>
              </div>
            )}

            {msg?.id === m.id && (
              <p
                className={`mt-2 flex items-center gap-1.5 text-xs ${
                  msg.ok ? "text-status-done" : "text-status-critical"
                }`}
              >
                {msg.ok && <CheckCircle2 className="h-3.5 w-3.5" />}
                {msg.text}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
