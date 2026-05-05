import type { Message } from "./message";
import type { User } from "./user";

export type Conversation = {
  id: string;
  name?: string | null;
  isGroup?: boolean;
  participants: User[];
  messages?: Message[];
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
};
