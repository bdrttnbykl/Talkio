import type { Request, Response } from "express";
import { loginSchema, registerSchema } from "./auth.dto.js";
import { loginUser, registerUser } from "./auth.service.js";

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data.name, data.email, data.password);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Registration failed" });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data.email, data.password);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Login failed" });
  }
}
