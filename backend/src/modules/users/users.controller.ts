import type { Response } from "express";
import type { AuthRequest } from "../../middlewares/auth.middleware.js";
import { listUsers } from "./users.service.js";

export async function getUsers(req: AuthRequest, res: Response) {
  const users = await listUsers(req.userId!);
  return res.json(users);
}
