import type { User } from "./user";

export type Message = {
  id: string;
  content: string;
  conversationId: string;
  senderId: string;
  sender?: User;
  createdAt: string;
};
