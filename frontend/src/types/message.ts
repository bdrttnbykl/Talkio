import type { User } from "./user";

export type Message = {
  id: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  attachmentSize?: number | null;
  conversationId: string;
  senderId: string;
  sender?: User;
  createdAt: string;
  editedAt?: string | null;
  readByOthers?: boolean;
};
