export type User = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  chatBackgroundUrl?: string | null;
  lastSeenAt?: string | null;
  createdAt: string;
};
