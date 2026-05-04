import type { Conversation } from "../../types/conversation";
import Avatar from "./Avatar";

type ChatHeaderProps = {
  conversation?: Conversation;
};

export default function ChatHeader({ conversation }: ChatHeaderProps) {
  const participant = conversation?.participants[0];

  return (
    <header className="chat-header">
      {participant && <Avatar name={participant.name} src={participant.avatarUrl} />}
      <div>
        <strong>{participant?.name ?? "Select a conversation"}</strong>
        <span>{participant ? "Online" : "No active chat"}</span>
      </div>
    </header>
  );
}
