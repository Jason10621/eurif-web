export interface SourceRef {
  title: string;
  similarity: number;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  pending?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}
