import { prisma } from "../../config/prisma.js";

const conversationInclude = {
  participants: {
    include: {
      user: {
        select: { id: true, name: true, email: true, avatarUrl: true, lastSeenAt: true, createdAt: true }
      }
    }
  },
  messages: { orderBy: { createdAt: "desc" as const }, take: 1 }
};

async function getUnreadCount(userId: string, conversationId: string) {
  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    select: { lastReadAt: true }
  });

  return prisma.message.count({
    where: {
      conversationId,
      senderId: { not: userId },
      ...(participant?.lastReadAt ? { createdAt: { gt: participant.lastReadAt } } : {})
    }
  });
}

async function formatConversation<T extends { id: string; participants: Array<{ user: { id: string } }> }>(userId: string, conversation: T) {
  return {
    ...conversation,
    participants: conversation.participants.map((participant) => participant.user).filter((participant) => participant.id !== userId),
    unreadCount: await getUnreadCount(userId, conversation.id)
  };
}

export async function listConversations(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId } } },
    include: {
      participants: {
        where: { userId: { not: userId } },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true, lastSeenAt: true, createdAt: true }
          }
        }
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { updatedAt: "desc" }
  });

  return Promise.all(conversations.map((conversation) => formatConversation(userId, conversation)));
}

export async function createConversation(userId: string, participantId: string) {
  const existingConversation = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { participants: { some: { userId } } },
        { participants: { some: { userId: participantId } } }
      ]
    }
  });

  if (existingConversation) {
    const conversation = await prisma.conversation.findUniqueOrThrow({
      where: { id: existingConversation.id },
      include: conversationInclude
    });

    return formatConversation(userId, conversation);
  }

  const conversation = await prisma.conversation.create({
    data: {
      participants: {
        create: [{ userId, lastReadAt: new Date() }, { userId: participantId }]
      }
    },
    include: conversationInclude
  });

  return formatConversation(userId, conversation);
}

export async function createGroupConversation(userId: string, name: string, participantIds: string[]) {
  const uniqueParticipantIds = [...new Set(participantIds)].filter((participantId) => participantId !== userId);

  if (uniqueParticipantIds.length < 2) {
    throw new Error("Select at least two people for a group");
  }

  const conversation = await prisma.conversation.create({
    data: {
      name,
      isGroup: true,
      participants: {
        create: [{ userId, lastReadAt: new Date() }, ...uniqueParticipantIds.map((participantId) => ({ userId: participantId }))]
      }
    },
    include: conversationInclude
  });

  return formatConversation(userId, conversation);
}

export async function markConversationRead(userId: string, conversationId: string) {
  await prisma.participant.update({
    where: { userId_conversationId: { userId, conversationId } },
    data: { lastReadAt: new Date() }
  });
}

export async function updateConversationBackground(userId: string, conversationId: string, chatBackgroundUrl: string | null) {
  const participant = await prisma.participant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    select: { id: true }
  });

  if (!participant) {
    throw new Error("Conversation not found");
  }

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { chatBackgroundUrl },
    include: conversationInclude
  });

  return formatConversation(userId, conversation);
}
