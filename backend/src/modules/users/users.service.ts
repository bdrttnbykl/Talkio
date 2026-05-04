import { prisma } from "../../config/prisma.js";

export function listUsers(currentUserId: string) {
  return prisma.user.findMany({
    where: { id: { not: currentUserId } },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      createdAt: true
    },
    orderBy: { name: "asc" }
  });
}
