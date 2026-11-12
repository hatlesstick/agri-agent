import type React from "react";
import type { UserMessageProps } from "./ChatMessage.types";

export const UserMessage: React.FC<UserMessageProps> = ({ message }) => (
  <li className="self-end rounded-lg bg-blue-600 px-4 py-2 text-white">
    {message.parts.map((part, index) =>
      part.type === "text" ? (
        <p key={`${message.id}-${index}`} className="whitespace-pre-wrap">
          {part.text}
        </p>
      ) : null,
    )}
  </li>
);
