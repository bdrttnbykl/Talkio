import { useEffect } from "react";
import { getConversations, markConversationRead } from "../api/conversations.api";
import { socket } from "../socket/socket";
import { SOCKET_EVENTS } from "../socket/socketEvents";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import type { Message } from "../types/message";

type PresencePayload = {
  userId: string;
  isOnline: boolean;
};

export function useSocket() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    socket.auth = { token };
    socket.connect();
    socket.emit(SOCKET_EVENTS.PRESENCE_SYNC);
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (message: Message) => {
      const { activeConversationId, addMessage, incrementUnread, setConversations } = useChatStore.getState();

      if (message.conversationId === activeConversationId) {
        addMessage(message);
        markConversationRead(message.conversationId)
          .then(() => socket.emit(SOCKET_EVENTS.MARK_READ, { conversationId: message.conversationId }))
          .catch(console.error);
        return;
      }

      incrementUnread(message.conversationId);
      showMessageNotification(message);
      getConversations().then(setConversations).catch(console.error);
    });
    socket.on(SOCKET_EVENTS.MESSAGE_UPDATED, (message: Message) => {
      const { updateMessage, setConversations } = useChatStore.getState();
      updateMessage(message);
      getConversations().then(setConversations).catch(console.error);
    });
    socket.on(SOCKET_EVENTS.MESSAGE_DELETED, (payload: { id: string; conversationId: string }) => {
      const { removeMessage, setConversations } = useChatStore.getState();
      removeMessage(payload.id);
      getConversations().then(setConversations).catch(console.error);
    });
    socket.on(SOCKET_EVENTS.CONVERSATION_READ, (payload: { conversationId: string; readerId: string }) => {
      const { markMessagesRead } = useChatStore.getState();
      markMessagesRead(payload.conversationId, payload.readerId);
    });
    socket.on(SOCKET_EVENTS.PRESENCE_LIST, (payload: PresencePayload[]) => {
      const { setOnlineUsers } = useChatStore.getState();
      setOnlineUsers(payload.filter((item) => item.isOnline).map((item) => item.userId));
    });
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, (payload: PresencePayload) => {
      const { setUserPresence, setConversations } = useChatStore.getState();
      setUserPresence(payload.userId, payload.isOnline);
      if (!payload.isOnline) getConversations().then(setConversations).catch(console.error);
    });

    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE);
      socket.off(SOCKET_EVENTS.MESSAGE_UPDATED);
      socket.off(SOCKET_EVENTS.MESSAGE_DELETED);
      socket.off(SOCKET_EVENTS.CONVERSATION_READ);
      socket.off(SOCKET_EVENTS.PRESENCE_LIST);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE);
      socket.disconnect();
    };
  }, [token]);

  return socket;
}

function showMessageNotification(message: Message) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return;
  if (isConversationMuted(message.conversationId)) return;

  const body = message.content || message.attachmentName || "Yeni ek";
  new Notification(message.sender?.name ?? "Yeni mesaj", { body });
}

function isConversationMuted(conversationId: string) {
  try {
    const mutedConversationIds = JSON.parse(localStorage.getItem("chatly_muted_conversations") ?? "[]") as string[];
    return mutedConversationIds.includes(conversationId);
  } catch {
    return false;
  }
}
