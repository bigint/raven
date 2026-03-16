"use client";

import { Badge, Modal } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { formatCompactNumber } from "@/lib/format";
import {
  type Conversation,
  type ConversationMessage,
  conversationQueryOptions
} from "../hooks/use-conversations";

interface ConversationDetailProps {
  conversation: Conversation;
  open: boolean;
  onClose: () => void;
}

const roleBadgeVariant = (role: ConversationMessage["role"]) => {
  switch (role) {
    case "user":
      return "primary";
    case "assistant":
      return "success";
    case "system":
      return "warning";
    case "tool":
      return "info";
    default:
      return "neutral";
  }
};

const ConversationDetail = ({
  conversation,
  open,
  onClose
}: ConversationDetailProps) => {
  const { data: detail } = useQuery(conversationQueryOptions(conversation.id));
  const messages = detail?.messages ?? [];

  return (
    <Modal
      onClose={onClose}
      open={open}
      size="lg"
      title={conversation.title || "Untitled Conversation"}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {conversation.model && (
            <Badge variant="neutral">{conversation.model}</Badge>
          )}
          <span>{conversation.messageCount} messages</span>
          <span>{formatCompactNumber(conversation.totalTokens)} tokens</span>
        </div>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No messages in this conversation.
            </p>
          )}
          {messages.map((message) => (
            <div
              className="rounded-md border border-border p-3 space-y-2"
              key={message.id}
            >
              <div className="flex items-center justify-between">
                <Badge variant={roleBadgeVariant(message.role)}>
                  {message.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatCompactNumber(message.tokenCount)} tokens
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm">
                {message.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export { ConversationDetail };
