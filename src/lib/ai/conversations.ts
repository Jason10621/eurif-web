import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, ConversationSummary, SourceRef } from "@/lib/ai/types";

export async function getConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("id,title,updated_at")
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data as ConversationSummary[]) ?? [];
}

export async function getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_messages")
    .select("id,role,content,sources")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return (
    (data as Array<{ id: string; role: "user" | "assistant"; content: string; sources: SourceRef[] | null }>) ?? []
  ).map((m) => ({ id: m.id, role: m.role, content: m.content, sources: m.sources ?? undefined }));
}
