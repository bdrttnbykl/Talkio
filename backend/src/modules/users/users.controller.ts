import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { listUsers, updateUserAvatar, updateUserChatBackground, updateUserProfile } from "./users.service.js";

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

export async function patchMe(req: AuthRequest, res: Response) {
  try {
    const { email, name } = req.body;

    if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "name and email are required" });
    }

    const user = await updateUserProfile(req.userId!, name.trim(), email.trim().toLowerCase());
    return res.json(user);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Profile update failed" });
  }
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
