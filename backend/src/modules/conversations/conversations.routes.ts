import fs from "fs";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import {
  getConversations,
  patchDisappearingMessages,
  postConversation,
  readConversation,
  removeConversationBackground,
  uploadConversationBackground
} from "./conversations.controller.js";

export const conversationsRoutes = Router();

const backgroundDir = path.resolve("uploads", "backgrounds");
fs.mkdirSync(backgroundDir, { recursive: true });

const backgroundUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, backgroundDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname);
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      callback(null, safeName);
    }
  }),
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image files are allowed"));
      return;
    }

    callback(null, true);
  },
  limits: { fileSize: 8 * 1024 * 1024 }
});

conversationsRoutes.get("/", authMiddleware, getConversations);
conversationsRoutes.post("/", authMiddleware, postConversation);
conversationsRoutes.patch("/:conversationId/read", authMiddleware, readConversation);
conversationsRoutes.patch("/:conversationId/disappearing-messages", authMiddleware, patchDisappearingMessages);
conversationsRoutes.post("/:conversationId/background", authMiddleware, backgroundUpload.single("background"), uploadConversationBackground);
conversationsRoutes.delete("/:conversationId/background", authMiddleware, removeConversationBackground);
