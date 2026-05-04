import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getMessages, postMessage } from "./messages.controller.js";

export const messagesRoutes = Router();

messagesRoutes.get("/:conversationId", authMiddleware, getMessages);
messagesRoutes.post("/", authMiddleware, postMessage);
