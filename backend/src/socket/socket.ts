import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env, isAllowedOrigin } from "../config/env.js";
import { verifyToken } from "../utils/jwt.js";
import { registerChatSocket } from "./chat.socket.js";
import { prisma } from "../config/prisma.js";
import { setSocketServer } from "./io.js";

const onlineUsers = new Map<string, number>();

function emitPresence(io: Server, userId: string, isOnline: boolean, lastSeenAt?: Date) {
  io.emit("presence:update", {
    userId,
    isOnline,
    lastSeenAt: lastSeenAt?.toISOString() ?? null
  });
}

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Not allowed by CORS"));
      },
      credentials: true
    }
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (typeof token !== "string") {
      return next(new Error("Unauthorized"));
    }

    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      return next();
    } catch {
      return next(new Error("Invalid token"));
    }
  });

  setSocketServer(io);

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
    emitPresence(io, userId, true);
    registerChatSocket(io, socket);

    socket.on("presence:sync", () => {
      socket.emit(
        "presence:list",
        [...onlineUsers.keys()].map((onlineUserId) => ({ userId: onlineUserId, isOnline: true }))
      );
    });

    socket.on("disconnect", async () => {
      const connectionCount = (onlineUsers.get(userId) ?? 1) - 1;

      if (connectionCount > 0) {
        onlineUsers.set(userId, connectionCount);
        return;
      }

      onlineUsers.delete(userId);
      const lastSeenAt = new Date();
      await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } }).catch(console.error);
      emitPresence(io, userId, false, lastSeenAt);
    });
  });

  return io;
}
