import cors from "cors";
import express from "express";
import path from "path";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { conversationsRoutes } from "./modules/conversations/conversations.routes.js";
import { messagesRoutes } from "./modules/messages/messages.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.clientUrls.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads")));

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/messages", messagesRoutes);
