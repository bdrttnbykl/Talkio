import { create } from "zustand";
import type { Conversation } from "../types/conversation";
import type { Message } from "../types/message";

type ChatState = {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  unreadCounts: Record<string, number>;
  setConversations: (conversations: Conversation[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  setActiveConversationId: (conversationId: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  incrementUnread: (conversationId: string) => void;
  markConversationRead: (conversationId: string) => void;
  reset: () => void;
};

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  unreadCounts: {},
  setConversations: (conversations) =>
    set((state) => {
      const unreadCounts = conversations.reduce<Record<string, number>>((counts, conversation) => {
        const unreadCount = conversation.unreadCount ?? state.unreadCounts[conversation.id] ?? 0;

        if (unreadCount > 0) {
          counts[conversation.id] = unreadCount;
        }

        return counts;
      }, {});

      return { conversations, unreadCounts };
    }),
  upsertConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.some((item) => item.id === conversation.id);
      const conversations = exists
        ? state.conversations.map((item) => (item.id === conversation.id ? conversation : item))
        : [conversation, ...state.conversations];
      const unreadCounts = { ...state.unreadCounts };

      if (conversation.unreadCount && conversation.unreadCount > 0) {
        unreadCounts[conversation.id] = conversation.unreadCount;
      }

      return { conversations, unreadCounts };
    }),
  setActiveConversationId: (activeConversationId) => set({ activeConversationId }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  incrementUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] ?? 0) + 1
      }
    })),
  markConversationRead: (conversationId) =>
    set((state) => {
      if (!state.unreadCounts[conversationId]) return state;

      const { [conversationId]: _readConversation, ...unreadCounts } = state.unreadCounts;
      return { unreadCounts };
    }),
  reset: () => set({ conversations: [], activeConversationId: null, messages: [], unreadCounts: {} })
}));
