import { api } from "./axios";
import type { User } from "../types/user";

export const getUsers = async () => {
  const { data } = await api.get<User[]>("/users");
  return data;
};

export const uploadAvatar = async (file: File) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const { data } = await api.post<User>("/users/me/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  return data;
};

export const uploadChatBackground = async (file: File) => {
  const formData = new FormData();
  formData.append("background", file);

  const { data } = await api.post<User>("/users/me/background", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  return data;
};

export const removeChatBackground = async () => {
  const { data } = await api.delete<User>("/users/me/background");
  return data;
};
