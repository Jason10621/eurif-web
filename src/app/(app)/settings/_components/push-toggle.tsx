"use client";

import { useEffect, useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";

function urlB64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "loading" | "unsupported" | "denied" | "off" | "on";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      } catch {
        setState("off");
      }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    setErr(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) throw new Error("서버에 VAPID 키가 설정되지 않았습니다.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(key),
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "등록 실패");
      setState("on");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setErr(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-md">
      <CardHeader
        title="휴대폰 / 브라우저 알림"
        desc="과제 배정·일지·자료 등 새 알림을 잠금화면으로 받습니다"
      />

      {state === "loading" && (
        <p className="text-sm text-muted">
          <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
          확인 중…
        </p>
      )}

      {state === "unsupported" && (
        <p className="text-sm text-muted">
          이 브라우저는 푸시 알림을 지원하지 않습니다. (iPhone은 홈 화면에 설치한 뒤 열어야
          동작합니다)
        </p>
      )}

      {state === "denied" && (
        <p className="text-sm text-status-critical">
          브라우저에서 알림이 차단되어 있습니다. 사이트 설정 → 알림 → 허용으로 바꿔주세요.
        </p>
      )}

      {(state === "off" || state === "on") && (
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              이 기기 알림: {state === "on" ? "켜짐" : "꺼짐"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              기기(브라우저)마다 따로 켜야 합니다.
            </p>
          </div>
          <button
            onClick={state === "on" ? disable : enable}
            disabled={busy}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60 ${
              state === "on"
                ? "border border-border-strong text-text hover:bg-surface-2"
                : "bg-primary text-primary-fg hover:bg-primary-hover"
            }`}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BellRing className="h-4 w-4" />
            )}
            {state === "on" ? "끄기" : "켜기"}
          </button>
        </div>
      )}

      {err && <p className="mt-3 text-xs text-status-critical">{err}</p>}
    </Card>
  );
}
