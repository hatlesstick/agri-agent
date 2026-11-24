import type React from "react";
import type { UserMessageProps } from "./ChatMessage.types";

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => (
  <li className="max-w-xl self-end rounded-2xl bg-ink px-4 py-2 text-paper">
    {message.parts.map((part, index) =>
      part.type === "text" ? (
        <p key={`${message.id}-${index}`} className="whitespace-pre-wrap">
          {part.text}
        </p>
      ) : null,
    )}
  </li>
);
