import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getUsers } from "./users.controller.js";

export const usersRoutes = Router();

usersRoutes.get("/", authMiddleware, getUsers);
