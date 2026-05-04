import { api } from "./axios";
import type { Message } from "../types/message";

export const getMessages = async (conversationId: string) => {
  const { data } = await api.get<Message[]>(`/messages/${conversationId}`);
  return data;
};

export const sendMessage = async (conversationId: string, content: string) => {
  const { data } = await api.post<Message>("/messages", { conversationId, content });
  return data;
};
