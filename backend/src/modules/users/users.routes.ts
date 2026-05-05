import fs from "fs";
import multer from "multer";
import path from "path";
import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { getUsers, removeChatBackground, uploadAvatar, uploadChatBackground } from "./users.controller.js";

export const usersRoutes = Router();

const avatarDir = path.resolve("uploads", "avatars");
const backgroundDir = path.resolve("uploads", "backgrounds");
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(backgroundDir, { recursive: true });

function createStorage(uploadDir: string) {
  return multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDir),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname);
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;
      callback(null, safeName);
    }
  });
}

const imageFileFilter: multer.Options["fileFilter"] = (_req, file, callback) => {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image files are allowed"));
    return;
  }

  callback(null, true);
};

const avatarUpload = multer({
  storage: createStorage(avatarDir),
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const backgroundUpload = multer({
  storage: createStorage(backgroundDir),
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }
});

usersRoutes.get("/", authMiddleware, getUsers);
usersRoutes.post("/me/avatar", authMiddleware, avatarUpload.single("avatar"), uploadAvatar);
usersRoutes.post("/me/background", authMiddleware, backgroundUpload.single("background"), uploadChatBackground);
usersRoutes.delete("/me/background", authMiddleware, removeChatBackground);
