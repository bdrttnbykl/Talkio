import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getConversations, postConversation, readConversation } from "./conversations.controller.js";

export const conversationsRoutes = Router();

conversationsRoutes.get("/", authMiddleware, getConversations);
conversationsRoutes.post("/", authMiddleware, postConversation);
conversationsRoutes.patch("/:conversationId/read", authMiddleware, readConversation);
