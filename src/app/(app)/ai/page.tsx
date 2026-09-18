import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { aiConfigured } from "@/lib/ai/gemini";
import { getConversations, getConversationMessages } from "@/lib/ai/conversations";
import { AiChatPage } from "./_components/ai-chat-page";

export const metadata = { title: "ULIF AI" };

export default async function AiPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  await requireProfile();
  const { c } = await searchParams;

  const [conversations, messages] = await Promise.all([
    getConversations(),
    c ? getConversationMessages(c) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="ULIF AI"
        desc="프로젝트 자료를 학습한 맞춤형 연구 도우미"
      />
      <AiChatPage
        key={c ?? "new"}
        conversations={conversations}
        initialConversationId={c}
        initialMessages={messages}
        aiConfigured={aiConfigured()}
      />
    </>
  );
}
