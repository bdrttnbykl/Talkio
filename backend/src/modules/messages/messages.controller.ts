import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { createMessage, deleteMessage, listMessages, toggleMessagePin, toggleMessageReaction, updateMessage } from "./messages.service.js";

const allowedReactionTypes = new Set(["like", "heart", "laugh", "wow", "sad", "pray"]);

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
    const { attachment, conversationId, content, replyToId } = req.body;

    if (!conversationId || (!content && !attachment)) {
      return res.status(400).json({ message: "conversationId and content or attachment are required" });
    }

    const message = await createMessage(req.userId!, conversationId, content ?? "", attachment ?? null, replyToId ?? null);
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

export async function reactToMessage(req: AuthRequest, res: Response) {
  try {
    const { messageId } = req.params;
    const { type } = req.body;

    if (typeof messageId !== "string" || typeof type !== "string" || !allowedReactionTypes.has(type)) {
      return res.status(400).json({ message: "messageId and valid reaction type are required" });
    }

    const message = await toggleMessageReaction(req.userId!, messageId, type);
    return res.json(message);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Reaction failed" });
  }
}

export async function pinMessage(req: AuthRequest, res: Response) {
  try {
    const { messageId } = req.params;

    if (typeof messageId !== "string") {
      return res.status(400).json({ message: "messageId is required" });
    }

    const message = await toggleMessagePin(req.userId!, messageId);
    return res.json(message);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Message pin failed" });
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
