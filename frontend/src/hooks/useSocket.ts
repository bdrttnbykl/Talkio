import { useEffect } from "react";
import { getConversations } from "../api/conversations.api";
import { socket } from "../socket/socket";
import { SOCKET_EVENTS } from "../socket/socketEvents";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import type { Message } from "../types/message";

export function useSocket() {
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    socket.auth = { token };
    socket.connect();
    socket.on(SOCKET_EVENTS.NEW_MESSAGE, (message: Message) => {
      const { activeConversationId, addMessage, incrementUnread, setConversations } = useChatStore.getState();

      if (message.conversationId === activeConversationId) {
        addMessage(message);
        return;
      }

      incrementUnread(message.conversationId);
      getConversations().then(setConversations).catch(console.error);
    });

    return () => {
      socket.off(SOCKET_EVENTS.NEW_MESSAGE);
      socket.disconnect();
    };
  }, [token]);

  return socket;
}
