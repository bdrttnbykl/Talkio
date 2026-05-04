import { useEffect } from "react";
import { getConversations } from "../api/conversations.api";
import { getMessages } from "../api/messages.api";
import { useChatStore } from "../store/chatStore";

export function useChat() {
  const { activeConversationId, setConversations, setMessages } = useChatStore();

  useEffect(() => {
    getConversations().then(setConversations).catch(console.error);
  }, [setConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    getMessages(activeConversationId).then(setMessages).catch(console.error);
  }, [activeConversationId, setMessages]);
}
