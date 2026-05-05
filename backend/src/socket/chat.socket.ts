import type { Server, Socket } from "socket.io";
import { prisma } from "../config/prisma.js";

const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "conversation:join",
  UPDATE_CONVERSATION: "conversation:update",
  CONVERSATION_UPDATED: "conversation:updated",
  SEND_MESSAGE: "message:send",
  NEW_MESSAGE: "message:new",
  UPDATE_MESSAGE: "message:update",
  MESSAGE_UPDATED: "message:updated",
  REACT_MESSAGE: "message:react",
  MESSAGE_REACTED: "message:reacted",
  PIN_MESSAGE: "message:pin",
  MESSAGE_PINNED: "message:pinned",
  DELETE_MESSAGE: "message:delete",
  MESSAGE_DELETED: "message:deleted",
  MARK_READ: "conversation:read",
  CONVERSATION_READ: "conversation:read-receipt"
} as const;

export function registerChatSocket(io: Server, socket: Socket) {
  socket.join(`user:${socket.data.userId}`);

  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, (conversationId: string) => {
    socket.join(conversationId);
  });

  socket.on(SOCKET_EVENTS.UPDATE_CONVERSATION, async (conversation) => {
    if (!conversation?.id) return;

    const participant = await prisma.participant.findUnique({
      where: { userId_conversationId: { userId: socket.data.userId, conversationId: conversation.id } },
      select: { id: true }
    });

    if (!participant) return;

    await emitToOtherParticipants(io, socket, conversation.id, SOCKET_EVENTS.CONVERSATION_UPDATED, conversation);
  });

  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (message) => {
    if (!message || message.senderId !== socket.data.userId) return;

    const participants = await prisma.participant.findMany({
      where: { conversationId: message.conversationId },
      select: { userId: true }
    });

    participants
      .filter((participant) => participant.userId !== socket.data.userId)
      .forEach((participant) => {
        io.to(`user:${participant.userId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, message);
      });
  });

  socket.on(SOCKET_EVENTS.UPDATE_MESSAGE, async (message) => {
    if (!message || message.senderId !== socket.data.userId) return;

    const existingMessage = await prisma.message.findFirst({
      where: {
        id: message.id,
        senderId: socket.data.userId,
        conversationId: message.conversationId,
        conversation: { participants: { some: { userId: socket.data.userId } } }
      },
      select: { id: true }
    });

    if (!existingMessage) return;

    await emitToOtherParticipants(io, socket, message.conversationId, SOCKET_EVENTS.MESSAGE_UPDATED, message);
  });

  socket.on(SOCKET_EVENTS.REACT_MESSAGE, async (message) => {
    if (!message?.id || !message?.conversationId) return;

    const existingMessage = await prisma.message.findFirst({
      where: {
        id: message.id,
        conversationId: message.conversationId,
        conversation: { participants: { some: { userId: socket.data.userId } } }
      },
      select: { id: true }
    });

    if (!existingMessage) return;

    await emitToOtherParticipants(io, socket, message.conversationId, SOCKET_EVENTS.MESSAGE_REACTED, message);
  });

  socket.on(SOCKET_EVENTS.PIN_MESSAGE, async (message) => {
    if (!message?.id || !message?.conversationId) return;

    const existingMessage = await prisma.message.findFirst({
      where: {
        id: message.id,
        conversationId: message.conversationId,
        conversation: { participants: { some: { userId: socket.data.userId } } }
      },
      select: { id: true }
    });

    if (!existingMessage) return;

    await emitToOtherParticipants(io, socket, message.conversationId, SOCKET_EVENTS.MESSAGE_PINNED, message);
  });

  socket.on(SOCKET_EVENTS.DELETE_MESSAGE, async (payload) => {
    if (!payload?.id || !payload?.conversationId) return;

    const participant = await prisma.participant.findUnique({
      where: { userId_conversationId: { userId: socket.data.userId, conversationId: payload.conversationId } },
      select: { id: true }
    });

    if (!participant) return;

    await emitToOtherParticipants(io, socket, payload.conversationId, SOCKET_EVENTS.MESSAGE_DELETED, payload);
  });

  socket.on(SOCKET_EVENTS.MARK_READ, async (payload) => {
    const conversationId = typeof payload === "string" ? payload : payload?.conversationId;

    if (!conversationId) return;

    const participant = await prisma.participant.findUnique({
      where: { userId_conversationId: { userId: socket.data.userId, conversationId } },
      select: { id: true, lastReadAt: true }
    });

    if (!participant) return;

    const readAt = participant.lastReadAt ?? new Date();
    await emitToOtherParticipants(io, socket, conversationId, SOCKET_EVENTS.CONVERSATION_READ, {
      conversationId,
      readerId: socket.data.userId,
      readAt
    });
  });
}

async function emitToOtherParticipants(io: Server, socket: Socket, conversationId: string, event: string, payload: unknown) {
  const participants = await prisma.participant.findMany({
    where: { conversationId },
    select: { userId: true }
  });

  participants
    .filter((participant) => participant.userId !== socket.data.userId)
    .forEach((participant) => {
      io.to(`user:${participant.userId}`).emit(event, payload);
    });
}
