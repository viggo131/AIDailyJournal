import React, { memo } from "react";
import { Message } from "../../lib/types";

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={[
        "flex animate-message-in",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[80%] px-4 py-3 rounded-md text-sm leading-relaxed selectable",
          isUser
            ? "bg-accent/20 text-text border border-accent/20"
            : "bg-surface text-text border border-border",
        ].join(" ")}
      >
        {message.content}
      </div>
    </div>
  );
});
