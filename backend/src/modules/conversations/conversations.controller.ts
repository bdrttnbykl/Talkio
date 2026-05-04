import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { createConversation, listConversations, markConversationRead } from "./conversations.service.js";

export async function getConversations(req: AuthRequest, res: Response) {
  const conversations = await listConversations(req.userId!);
  return res.json(conversations);
}

export async function postConversation(req: AuthRequest, res: Response) {
  const { participantId } = req.body;

  if (!participantId) {
    return res.status(400).json({ message: "participantId is required" });
  }

  const conversation = await createConversation(req.userId!, participantId);
  return res.status(201).json(conversation);
}

export async function readConversation(req: AuthRequest, res: Response) {
  const { conversationId } = req.params;

  if (typeof conversationId !== "string") {
    return res.status(400).json({ message: "conversationId is required" });
  }

  await markConversationRead(req.userId!, conversationId);
  return res.status(204).send();
}
