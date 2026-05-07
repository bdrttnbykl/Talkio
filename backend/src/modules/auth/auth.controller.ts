import type { Request, Response } from "express";
import { ZodError } from "zod";
import { loginSchema, registerSchema } from "./auth.dto.js";
import { loginUser, registerUser } from "./auth.service.js";

export async function register(req: Request, res: Response) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data.name, data.email, data.password);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: getAuthErrorMessage(error, "Registration failed") });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data.email, data.password);
    return res.json(result);
  } catch (error) {
    return res.status(400).json({ message: getAuthErrorMessage(error, "Login failed") });
  }
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    const field = error.issues[0]?.path[0];

    if (field === "password") return "Password must be at least 6 characters.";
    if (field === "email") return "Enter a valid email address.";
    if (field === "name") return "Name must be at least 2 characters.";
  }

  return error instanceof Error ? error.message : fallback;
}
