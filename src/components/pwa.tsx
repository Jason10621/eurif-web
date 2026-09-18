"use client";

import { useEffect, useState } from "react";
import { Download, Share, X, Plus } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "ulif-install-dismissed";

export function Pwa() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error iOS Safari-only
      window.navigator.standalone === true;
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (standalone || dismissed) return;

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    const ua = window.navigator.userAgent;
    const iosSafari =
      /iphone|ipad|ipod/i.test(ua) && /^((?!chrome|crios|android).)*safari/i.test(ua);
    // defer out of the synchronous effect body
    const t = iosSafari ? window.setTimeout(() => setIosHint(true), 400) : undefined;

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      if (t) window.clearTimeout(t);
    };
  }, []);

  function dismiss() {
    setClosed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setClosed(true);
  }

  if (closed || (!deferred && !iosHint)) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-border-strong bg-surface p-4 shadow-2xl md:left-auto md:right-5 md:w-80">
      <button
        onClick={dismiss}
        aria-label="닫기"
        className="absolute right-2 top-2 rounded-md p-1 text-muted hover:bg-surface-2"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">ULIF 앱 설치</p>
          {deferred ? (
            <>
              <p className="mt-1 text-xs text-text-secondary">
                홈 화면에 추가하면 앱처럼 전체화면으로 열립니다.
              </p>
              <button
                onClick={install}
                className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-fg"
              >
                <Download className="h-3.5 w-3.5" /> 설치
              </button>
            </>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-text-secondary">
              하단 <Share className="inline h-3.5 w-3.5" /> 공유 버튼 →{" "}
              <span className="whitespace-nowrap">
                <Plus className="inline h-3.5 w-3.5" /> 홈 화면에 추가
              </span>{" "}
              를 누르면 앱처럼 쓸 수 있어요.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
