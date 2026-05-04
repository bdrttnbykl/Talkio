import { prisma } from "../../config/prisma.js";

export function listMessages(userId: string, conversationId: string) {
  return prisma.message.findMany({
    where: {
      conversationId,
      conversation: { participants: { some: { userId } } }
    },
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function createMessage(userId: string, conversationId: string, content: string) {
  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId } }
  });

  if (!participant) {
    throw new Error("Conversation not found");
  }

  return prisma.message.create({
    data: {
      content,
      senderId: userId,
      conversationId
    },
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } }
    }
  });
}
