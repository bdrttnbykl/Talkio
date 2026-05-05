import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { createMessage, deleteMessage, listMessages, updateMessage } from "./messages.service.js";

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
    const { attachment, conversationId, content } = req.body;

    if (!conversationId || (!content && !attachment)) {
      return res.status(400).json({ message: "conversationId and content or attachment are required" });
    }

    const message = await createMessage(req.userId!, conversationId, content ?? "", attachment ?? null);
    return res.status(201).json(message);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Message failed" });
  }
}

export async function uploadMessageFile(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: "file is required" });
  }

  return res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size
  });
}

export async function patchMessage(req: AuthRequest, res: Response) {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (typeof messageId !== "string" || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ message: "messageId and content are required" });
    }

    const message = await updateMessage(req.userId!, messageId, content.trim());
    return res.json(message);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Message update failed" });
  }
}

export async function removeMessage(req: AuthRequest, res: Response) {
  try {
    const { messageId } = req.params;

    if (typeof messageId !== "string") {
      return res.status(400).json({ message: "messageId is required" });
    }

    const message = await deleteMessage(req.userId!, messageId);
    return res.json({ id: message.id, conversationId: message.conversationId });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Message delete failed" });
  }
}
