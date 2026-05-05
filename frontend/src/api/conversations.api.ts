import { api } from "./axios";
import type { Conversation } from "../types/conversation";

export const getConversations = async () => {
  const { data } = await api.get<Conversation[]>("/conversations");
  return data;
};

export const createConversation = async (participantId: string) => {
  const { data } = await api.post<Conversation>("/conversations", { participantId });
  return data;
};

export const createGroupConversation = async (name: string, participantIds: string[]) => {
  const { data } = await api.post<Conversation>("/conversations", { name, participantIds });
  return data;
};

export const markConversationRead = async (conversationId: string) => {
  await api.patch(`/conversations/${conversationId}/read`);
};

export const uploadConversationBackground = async (conversationId: string, file: File) => {
  const formData = new FormData();
  formData.append("background", file);

  const { data } = await api.post<Conversation>(`/conversations/${conversationId}/background`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

  return data;
};

export const removeConversationBackground = async (conversationId: string) => {
  const { data } = await api.delete<Conversation>(`/conversations/${conversationId}/background`);
  return data;
};
