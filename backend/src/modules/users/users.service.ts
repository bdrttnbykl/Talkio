import { prisma } from "../../config/prisma.js";

export function listUsers(currentUserId: string) {
  return prisma.user.findMany({
    where: { id: { not: currentUserId } },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      chatBackgroundUrl: true,
      lastSeenAt: true,
      createdAt: true
    },
    orderBy: { name: "asc" }
  });
}

export function updateUserAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      chatBackgroundUrl: true,
      lastSeenAt: true,
      createdAt: true
    }
  });
}

export function updateUserChatBackground(userId: string, chatBackgroundUrl: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { chatBackgroundUrl },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      chatBackgroundUrl: true,
      lastSeenAt: true,
      createdAt: true
    }
  });
}
