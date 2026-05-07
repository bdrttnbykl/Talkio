import dotenv from "dotenv";

dotenv.config();

const clientUrls = (process.env.CLIENT_URLS ?? process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export const env = {
  port: Number(process.env.PORT ?? 5000),
  jwtSecret: process.env.JWT_SECRET ?? "change-this-secret",
  clientUrls
};
