import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { createMessage, listMessages } from "./messages.service.js";

export async function getMessages(req: AuthRequest, res: Response) {
  const { conversationId } = req.params;

  if (typeof conversationId !== "string") {
    return res.status(400).json({ message: "conversationId is required" });
  }

  const messages = await listMessages(req.userId!, conversationId);
  return res.json(messages);
}

export async function postMessage(req: AuthRequest, res: Response) {
  try {
    const { conversationId, content } = req.body;

    if (!conversationId || !content) {
      return res.status(400).json({ message: "conversationId and content are required" });
    }

    const message = await createMessage(req.userId!, conversationId, content);
    return res.status(201).json(message);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Message failed" });
  }
}
