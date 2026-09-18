"use client";

import Link from "next/link";
import { Bot, Plus, Sparkles, MessagesSquare } from "lucide-react";
import { useAiChat } from "@/components/ai/use-ai-chat";
import { ChatThread } from "@/components/ai/chat-thread";
import { ChatInput } from "@/components/ai/chat-input";
import { cn } from "@/lib/utils";
import type { ChatMessage, ConversationSummary } from "@/lib/ai/types";

const SUGGESTIONS = [
  "이 연구의 4가지 가설(H1~H4)을 정리해줘",
  "블루라이트가 수면 위상을 지연시키는 생리학적 기전을 설명해줘",
  "카페인 잔류 농도 공식이랑 오후 6시 200mg 예시 계산",
  "수면 부채(X₃)는 어떻게 계산하고 MSFsc랑 무슨 관계야?",
  "회귀 결과 시나리오 A/B/C가 각각 무슨 정책으로 이어져?",
  "N3 수면과 REM 수면이 위상 지연에 다르게 영향받는 이유는?",
];

export function AiChatPage({
  conversations,
  initialConversationId,
  initialMessages,
  aiConfigured,
}: {
  conversations: ConversationSummary[];
  initialConversationId?: string;
  initialMessages: ChatMessage[];
  aiConfigured: boolean;
}) {
  const { messages, streaming, error, send } = useAiChat({
    initialMessages,
    initialConversationId,
    // Update the URL silently so a reload/share keeps the conversation, but do
    // NOT trigger a Next.js navigation (that would remount and kill the stream).
    onConversation: (id) => {
      if (typeof window !== "undefined") {
        window.history.replaceState(null, "", `/ai?c=${id}`);
      }
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      {/* conversation sidebar */}
      <aside className="hidden lg:block">
        <Link
          href="/ai"
          className="mb-2 flex items-center gap-2 rounded-lg border border-border-strong px-3 py-2 text-sm font-medium hover:bg-surface-2"
        >
          <Plus className="h-4 w-4" /> 새 대화
        </Link>
        <div className="space-y-0.5">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/ai?c=${c.id}`}
              className={cn(
                "block truncate rounded-lg px-3 py-2 text-xs transition",
                c.id === initialConversationId
                  ? "bg-primary text-primary-fg"
                  : "text-text-secondary hover:bg-surface-2",
              )}
            >
              {c.title}
            </Link>
          ))}
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">대화 기록이 없습니다</p>
          )}
        </div>
      </aside>

      {/* main */}
      <div className="flex h-[calc(100dvh-9rem)] flex-col rounded-2xl border border-border bg-surface">
        {!aiConfigured && (
          <div className="border-b border-border bg-status-warning/10 px-4 py-2 text-xs text-[#8a5a00] dark:text-status-warning">
            ⚠️ Gemini API 키가 아직 등록되지 않았습니다. 관리자 페이지에서 설정하거나 조장에게 문의하세요.
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-fg">
                <Bot className="h-6 w-6" />
              </span>
              <h2 className="text-lg font-bold">ULIF AI</h2>
              <p className="mt-1.5 text-sm text-muted">
                유리프 폴더의 자료(실험계획서, 5인 자료조사, 활동보고서, 진행 방향)를 학습한
                맞춤형 연구 도우미입니다. 배경 이론·수식·다음 단계 무엇이든 물어보세요.
              </p>
              <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={streaming}
                    className="flex items-start gap-2 rounded-xl border border-border p-3 text-left text-xs text-text-secondary transition hover:border-primary hover:bg-surface-2 disabled:opacity-50"
                  >
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              <ChatThread messages={messages} streaming={streaming} />
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          <div className="mx-auto max-w-3xl">
            {error && <p className="mb-2 text-xs text-status-critical">{error}</p>}
            <ChatInput onSend={send} disabled={streaming || !aiConfigured} />
            <p className="mt-1.5 flex items-center gap-1 px-1 text-[11px] text-muted">
              <MessagesSquare className="h-3 w-3" />
              답변은 프로젝트 자료 기반 RAG로 생성됩니다. 실제 실험 결과가 아닌 예상값이 포함될 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
