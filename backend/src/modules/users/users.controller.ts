import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { listUsers, updateUserAvatar, updateUserChatBackground } from "./users.service.js";

export async function getUsers(req: AuthRequest, res: Response) {
  const users = await listUsers(req.userId!);
  return res.json(users);
}

export async function uploadAvatar(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: "image is required" });
  }

  const user = await updateUserAvatar(req.userId!, `/uploads/avatars/${req.file.filename}`);
  return res.status(201).json(user);
}

export async function uploadChatBackground(req: AuthRequest, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: "image is required" });
  }

  const user = await updateUserChatBackground(req.userId!, `/uploads/backgrounds/${req.file.filename}`);
  return res.status(201).json(user);
}

export async function removeChatBackground(req: AuthRequest, res: Response) {
  const user = await updateUserChatBackground(req.userId!, null);
  return res.json(user);
}
