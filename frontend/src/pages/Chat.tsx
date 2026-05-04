import { FormEvent, useEffect, useMemo, useState } from "react";
import { createConversation, markConversationRead as markConversationReadRequest } from "../api/conversations.api";
import { Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { sendMessage } from "../api/messages.api";
import { getUsers } from "../api/users.api";
import ChatHeader from "../components/common/ChatHeader";
import MessageBubble from "../components/common/MessageBubble";
import Sidebar from "../components/common/Sidebar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useChat } from "../hooks/useChat";
import { useSocket } from "../hooks/useSocket";
import { SOCKET_EVENTS } from "../socket/socketEvents";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import type { User } from "../types/user";

export default function Chat() {
  useChat();
  const socket = useSocket();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const {
    activeConversationId,
    conversations,
    messages,
    unreadCounts,
    setActiveConversationId,
    addMessage,
    upsertConversation,
    markConversationRead,
    reset
  } = useChatStore();
  const [content, setContent] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const canSendMessage = Boolean(activeConversationId && content.trim());

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, conversations]
  );

  const handleSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
    markConversationRead(conversationId);
    markConversationReadRequest(conversationId).catch(console.error);
    socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
  };

  const handleStartConversation = async (participantId: string) => {
    const conversation = await createConversation(participantId);
    upsertConversation(conversation);
    handleSelect(conversation.id);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeConversationId || !content.trim()) return;

    const message = await sendMessage(activeConversationId, content.trim());
    addMessage(message);
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, message);
    setContent("");
  };

  const handleLogout = () => {
    socket.disconnect();
    reset();
    logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    getUsers().then(setUsers).catch(console.error);
  }, []);

  useEffect(() => {
    conversations.forEach((conversation) => {
      socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversation.id);
    });
  }, [conversations, socket]);

  return (
    <main className="chat-layout">
      <Sidebar
        conversations={conversations}
        users={users}
        activeConversationId={activeConversationId}
        unreadCounts={unreadCounts}
        onSelect={handleSelect}
        onStartConversation={handleStartConversation}
        onLogout={handleLogout}
      />
      <section className="chat-panel">
        <ChatHeader conversation={activeConversation} />
        <div className="messages">
          {activeConversationId ? (
            messages.length > 0 ? (
              messages.map((message) => (
                <MessageBubble key={message.id} message={message} isOwn={message.senderId === user?.id} />
              ))
            ) : (
              <div className="empty-state">No messages yet.</div>
            )
          ) : (
            <div className="empty-state">Start a chat or select a conversation.</div>
          )}
        </div>
        <form className="message-form" onSubmit={handleSubmit}>
          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={activeConversationId ? "Type a message" : "Select a conversation first"}
            disabled={!activeConversationId}
          />
          <Button type="submit" aria-label="Send message" disabled={!canSendMessage}>
            <Send size={18} />
          </Button>
        </form>
      </section>
    </main>
  );
}
