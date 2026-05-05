import type { User } from "./user";

export type MessageReactionType = "like" | "heart" | "laugh" | "wow" | "sad" | "pray";

export type MessageReaction = {
  id: string;
  type: MessageReactionType;
  userId: string;
  messageId: string;
  user?: User;
  createdAt: string;
};

export type Message = {
  id: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  replyToId?: string | null;
  replyTo?: Pick<Message, "id" | "content" | "attachmentName" | "attachmentType" | "senderId"> & {
    sender?: User;
  };
  conversationId: string;
  senderId: string;
  sender?: User;
  reactions?: MessageReaction[];
  createdAt: string;
  editedAt?: string | null;
  isPinned?: boolean;
  pinnedAt?: string | null;
  readByOthers?: boolean;
};
