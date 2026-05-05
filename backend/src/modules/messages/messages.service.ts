import { prisma } from "../../config/prisma.js";

export type MessageAttachmentInput = {
  url: string;
  name: string;
  type: string;
  size: number;
};

export async function listMessages(userId: string, conversationId: string) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      conversation: { participants: { some: { userId } } }
    },
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  const otherParticipants = await prisma.participant.findMany({
    where: { conversationId, userId: { not: userId } },
    select: { lastReadAt: true }
  });

  return messages.map((message) => ({
    ...message,
    readByOthers:
      message.senderId === userId &&
      otherParticipants.some((participant) => participant.lastReadAt && participant.lastReadAt >= (message.editedAt ?? message.createdAt))
  }));
}

export async function createMessage(
  userId: string,
  conversationId: string,
  content: string,
  attachment?: MessageAttachmentInput | null
) {
  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId } }
  });

  if (!participant) {
    throw new Error("Conversation not found");
  }

  return prisma.message.create({
    data: {
      content,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
      attachmentSize: attachment?.size,
      senderId: userId,
      conversationId
    },
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } }
    }
  }).then((message) => ({ ...message, readByOthers: false }));
}

export async function updateMessage(userId: string, messageId: string, content: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true }
  });

  if (!message || message.senderId !== userId) {
    throw new Error("Message not found");
  }

  return prisma.message.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: {
      sender: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } }
    }
  }).then((message) => ({ ...message, readByOthers: false }));
}

export async function deleteMessage(userId: string, messageId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, conversationId: true, senderId: true }
  });

  if (!message || message.senderId !== userId) {
    throw new Error("Message not found");
  }

  await prisma.message.delete({ where: { id: messageId } });
  return message;
}
