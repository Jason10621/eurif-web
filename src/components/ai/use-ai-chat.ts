"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage, SourceRef } from "@/lib/ai/types";

export function useAiChat(opts?: {
  initialMessages?: ChatMessage[];
  initialConversationId?: string;
  onConversation?: (id: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(opts?.initialMessages ?? []);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const convId = useRef<string | undefined>(opts?.initialConversationId);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      setError(null);

      const history = messages;
      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setMessages([...history, userMsg, { role: "assistant", content: "", pending: true }]);
      setStreaming(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...history, userMsg].map((m) => ({ role: m.role, content: m.content })),
            conversationId: convId.current ?? null,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `요청 실패 (${res.status})`);
        }

        const newConv = res.headers.get("x-conversation-id");
        if (newConv && newConv !== convId.current) {
          convId.current = newConv;
          opts?.onConversation?.(newConv);
        }

        let sources: SourceRef[] = [];
        try {
          sources = JSON.parse(decodeURIComponent(res.headers.get("x-sources") || "[]"));
        } catch {
          /* ignore */
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { role: "assistant", content: acc, sources, pending: false };
            return copy;
          });
        }
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc, sources, pending: false };
          return copy;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "알 수 없는 오류";
        setError(msg);
        setMessages((prev) => {
          const copy = [...prev];
          if (copy[copy.length - 1]?.role === "assistant" && !copy[copy.length - 1].content) {
            copy.pop();
          }
          return copy;
        });
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming, opts],
  );

  const reset = useCallback(() => {
    convId.current = undefined;
    setMessages([]);
    setError(null);
  }, []);

  return { messages, streaming, error, send, reset, conversationId: convId };
}
