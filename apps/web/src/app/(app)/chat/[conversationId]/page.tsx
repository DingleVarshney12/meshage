"use client";

import { useParams } from "next/navigation";
import ConversationPageClient from "@/components/conversations/conversation-page-client";

export default function ConversationPage() {
  const params = useParams<{ conversationId: string }>();

  return <ConversationPageClient conversationId={params.conversationId} />;
}
