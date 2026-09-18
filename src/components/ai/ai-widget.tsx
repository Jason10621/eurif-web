"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, X, Sparkles, Maximize2, RotateCcw } from "lucide-react";
import { useAiChat } from "./use-ai-chat";
import { ChatThread } from "./chat-thread";
import { ChatInput } from "./chat-input";

const SUGGESTIONS = [
  "블루라이트가 멜라토닌을 억제하는 기전은?",
  "카페인 반감기 공식이랑 예시 알려줘",
  "MSFsc가 뭐고 왜 필요해?",
  "지금 프로젝트 다음 단계가 뭐야?",
];

export function AiWidget() {
  const [open, setOpen] = useState(false);
  const { messages, streaming, error, send, reset } = useAiChat();

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="ULIF AI 열기"
          className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-fg shadow-lg shadow-primary/30 transition hover:scale-105 active:scale-95"
        >
          <Bot className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-5 z-40 flex h-[min(600px,75dvh)] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">ULIF AI</p>
                <p className="mt-0.5 text-[11px] text-muted">프로젝트 자료 기반 답변</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  aria-label="새 대화"
                  className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
              <Link
                href="/ai"
                onClick={() => setOpen(false)}
                aria-label="전체 화면"
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
              >
                <Maximize2 className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-3 text-center">
                <Sparkles className="mb-3 h-7 w-7 text-primary" />
                <p className="text-sm font-medium">ULIF 전용 연구 도우미</p>
                <p className="mt-1 text-xs text-muted">
                  유리프 자료(실험계획서·자료조사·활동보고서)를 학습했습니다.
                </p>
                <div className="mt-4 flex w-full flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-lg border border-border px-3 py-2 text-left text-xs text-text-secondary transition hover:border-primary hover:bg-surface-2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ChatThread messages={messages} streaming={streaming} compact />
            )}
          </div>

          <div className="border-t border-border p-3">
            {error && <p className="mb-2 text-xs text-status-critical">{error}</p>}
            <ChatInput onSend={send} disabled={streaming} placeholder="질문 입력…" />
          </div>
        </div>
      )}
    </>
  );
}
