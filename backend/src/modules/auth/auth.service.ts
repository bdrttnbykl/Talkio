import { prisma } from "../../config/prisma.js";
import { signToken } from "../../utils/jwt.js";
import { comparePassword, hashPassword } from "../../utils/password.js";

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatarUrl: true,
  createdAt: true
};

export async function registerUser(name: string, email: string, password: string) {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new Error("Email is already registered");
  }

  const user = await prisma.user.create({
    data: { name, email, password: await hashPassword(password) },
    select: userSelect
  });

  return { user, token: signToken({ userId: user.id }) };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  const { password: _password, updatedAt: _updatedAt, ...safeUser } = user;
  return { user: safeUser, token: signToken({ userId: user.id }) };
}
