import { api } from "./axios";
import type { Message } from "../types/message";

export type MessageAttachment = {
  url: string;
  name: string;
  type: string;
  size: number;
};

export const getMessages = async (conversationId: string) => {
  const { data } = await api.get<Message[]>(`/messages/${conversationId}`);
  return data;
};

export const sendMessage = async (conversationId: string, content: string, attachment?: MessageAttachment) => {
  const { data } = await api.post<Message>("/messages", { conversationId, content, attachment });
  return data;
};

export const uploadMessageFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await api.post<MessageAttachment>("/messages/uploads", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  return data;
};

export const updateMessage = async (messageId: string, content: string) => {
  const { data } = await api.patch<Message>(`/messages/${messageId}`, { content });
  return data;
};

export const deleteMessage = async (messageId: string) => {
  const { data } = await api.delete<{ id: string; conversationId: string }>(`/messages/${messageId}`);
  return data;
};
