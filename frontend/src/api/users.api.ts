import { api } from "./axios";
import type { User } from "../types/user";

export const getUsers = async () => {
  const { data } = await api.get<User[]>("/users");
  return data;
};
