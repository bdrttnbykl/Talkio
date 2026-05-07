import type { Message } from "./message";
import type { User } from "./user";

export type Conversation = {
  id: string;
  name?: string | null;
  isGroup?: boolean;
  chatBackgroundUrl?: string | null;
  disappearingDurationSeconds?: number | null;
  participants: User[];
  messages?: Message[];
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
};
