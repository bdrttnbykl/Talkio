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

export const markConversationRead = async (conversationId: string) => {
  await api.patch(`/conversations/${conversationId}/read`);
};
