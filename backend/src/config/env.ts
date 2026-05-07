import dotenv from "dotenv";

dotenv.config();

const clientUrls = (process.env.CLIENT_URLS ?? process.env.CLIENT_URL ?? "http://localhost:5173")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

export function isAllowedOrigin(origin: string) {
  try {
    const { hostname, protocol } = new URL(origin);

    if (protocol !== "http:" && protocol !== "https:") return false;
    if (clientUrls.includes(origin)) return true;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;

    return hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  jwtSecret: process.env.JWT_SECRET ?? "change-this-secret",
  clientUrls
};
