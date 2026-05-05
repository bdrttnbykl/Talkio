import fs from "fs";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getMessages, patchMessage, pinMessage, postMessage, reactToMessage, removeMessage, uploadMessageFile } from "./messages.controller.js";

export const messagesRoutes = Router();

const uploadDir = path.resolve("uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
    callback(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

messagesRoutes.get("/:conversationId", authMiddleware, getMessages);
messagesRoutes.post("/", authMiddleware, postMessage);
messagesRoutes.post("/uploads", authMiddleware, upload.single("file"), uploadMessageFile);
messagesRoutes.post("/:messageId/reactions", authMiddleware, reactToMessage);
messagesRoutes.post("/:messageId/pin", authMiddleware, pinMessage);
messagesRoutes.patch("/:messageId", authMiddleware, patchMessage);
messagesRoutes.delete("/:messageId", authMiddleware, removeMessage);
