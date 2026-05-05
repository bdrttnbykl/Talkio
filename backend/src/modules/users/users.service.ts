import { prisma } from "../../config/prisma.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  chatBackgroundUrl: true,
  lastSeenAt: true,
  createdAt: true
};

export async function updateUserProfile(userId: string, name: string, email: string) {
  const existingUser = await prisma.user.findFirst({
    where: { email, id: { not: userId } },
    select: { id: true }
  });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { name, email },
    select: userSelect
  });
}

export function listUsers(currentUserId: string) {
  return prisma.user.findMany({
    where: { id: { not: currentUserId } },
    select: userSelect,
    orderBy: { name: "asc" }
  });
}

export function updateUserAvatar(userId: string, avatarUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { avatarUrl },
    select: userSelect
  });
}

export function updateUserChatBackground(userId: string, chatBackgroundUrl: string | null) {
  return prisma.user.update({
    where: { id: userId },
    data: { chatBackgroundUrl },
    select: userSelect
  });
}
