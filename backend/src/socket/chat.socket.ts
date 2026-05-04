import type { Server, Socket } from "socket.io";
import { prisma } from "../config/prisma.js";

const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "conversation:join",
  SEND_MESSAGE: "message:send",
  NEW_MESSAGE: "message:new"
} as const;

export function registerChatSocket(io: Server, socket: Socket) {
  socket.join(`user:${socket.data.userId}`);

  socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, (conversationId: string) => {
    socket.join(conversationId);
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
}
