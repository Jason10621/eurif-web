"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardHeader } from "@/components/ui";
import { Field, Input, Button } from "@/components/form";

export function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const nextPw = next.trim();
    const confirmPw = confirm.trim();
    if (nextPw !== confirmPw) {
      setMsg({ ok: false, text: "새 비밀번호가 일치하지 않습니다." });
      return;
    }
    if (nextPw.length < 6) {
      setMsg({ ok: false, text: "새 비밀번호는 6자 이상이어야 합니다." });
      return;
    }
    setBusy(true);
    try {
      // 1. verify current password (server, throwaway client)
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "확인 실패");

      // 2. change password client-side so this session stays valid
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: nextPw });
      if (error) throw new Error(error.message);

      setMsg({ ok: true, text: "비밀번호가 변경되었습니다." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "오류" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader title="비밀번호 변경" desc="본인 계정의 로그인 비밀번호를 바꿉니다" />
      <form onSubmit={submit}>
        <Field label="현재 비밀번호" htmlFor="cur">
          <Input
            id="cur"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="새 비밀번호" htmlFor="new" hint="6자 이상">
          <Input
            id="new"
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field label="새 비밀번호 확인" htmlFor="conf">
          <Input
            id="conf"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        {msg && (
          <p
            className={`mb-3 flex items-center gap-1.5 text-xs ${
              msg.ok ? "text-status-done" : "text-status-critical"
            }`}
          >
            {msg.ok && <CheckCircle2 className="h-3.5 w-3.5" />}
            {msg.text}
          </p>
        )}
        <Button type="submit" loading={busy}>
          <KeyRound className="h-3.5 w-3.5" /> 변경
        </Button>
      </form>
    </Card>
  );
}
