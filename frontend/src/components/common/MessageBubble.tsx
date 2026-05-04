import type { Message } from "../../types/message";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
};

export default function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={isOwn ? "message own" : "message"}>
      <p>{message.content}</p>
      <time>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
    </div>
  );
}
