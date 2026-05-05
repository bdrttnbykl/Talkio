import { prisma } from "../../config/prisma.js";

export type MessageAttachmentInput = {
  url: string;
  name: string;
  type: string;
  size: number;
};

const messageInclude = {
  sender: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } },
  replyTo: {
    select: {
      id: true,
      content: true,
      attachmentName: true,
      attachmentType: true,
      senderId: true,
      sender: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } }
    }
  },
  reactions: {
    select: {
      id: true,
      type: true,
      userId: true,
      messageId: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true } }
    },
    orderBy: { createdAt: "asc" as const }
  }
};

export async function listMessages(userId: string, conversationId: string) {
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      conversation: { participants: { some: { userId } } }
    },
    include: messageInclude,
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
  attachment?: MessageAttachmentInput | null,
  replyToId?: string | null
) {
  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId } }
  });

  if (!participant) {
    throw new Error("Conversation not found");
  }

  if (replyToId) {
    const replyToMessage = await prisma.message.findFirst({
      where: { id: replyToId, conversationId },
      select: { id: true }
    });

    if (!replyToMessage) {
      throw new Error("Reply message not found");
    }
  }

  return prisma.message.create({
    data: {
      content,
      attachmentUrl: attachment?.url,
      attachmentName: attachment?.name,
      attachmentType: attachment?.type,
      attachmentSize: attachment?.size,
      replyToId,
      senderId: userId,
      conversationId
    },
    include: messageInclude
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
    include: messageInclude
  }).then((message) => ({ ...message, readByOthers: false }));
}

export async function toggleMessageReaction(userId: string, messageId: string, type: string) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      conversation: { participants: { some: { userId } } }
    },
    select: { id: true }
  });

  if (!message) {
    throw new Error("Message not found");
  }

  const existingReaction = await prisma.messageReaction.findUnique({
    where: { userId_messageId: { userId, messageId } }
  });

  if (existingReaction?.type === type) {
    await prisma.messageReaction.delete({ where: { id: existingReaction.id } });
  } else if (existingReaction) {
    await prisma.messageReaction.update({
      where: { id: existingReaction.id },
      data: { type }
    });
  } else {
    await prisma.messageReaction.create({
      data: { type, userId, messageId }
    });
  }

  return prisma.message
    .findUniqueOrThrow({
      where: { id: messageId },
      include: messageInclude
    })
    .then((message) => ({ ...message, readByOthers: false }));
}

export async function toggleMessagePin(userId: string, messageId: string) {
  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      conversation: { participants: { some: { userId } } }
    },
    select: { id: true, isPinned: true }
  });

  if (!message) {
    throw new Error("Message not found");
  }

  return prisma.message
    .update({
      where: { id: messageId },
      data: {
        isPinned: !message.isPinned,
        pinnedAt: message.isPinned ? null : new Date()
      },
      include: messageInclude
    })
    .then((message) => ({ ...message, readByOthers: false }));
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
