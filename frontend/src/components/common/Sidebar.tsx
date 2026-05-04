import type { Conversation } from "../../types/conversation";
import type { User } from "../../types/user";
import Avatar from "./Avatar";

type SidebarProps = {
  conversations: Conversation[];
  users: User[];
  activeConversationId: string | null;
  unreadCounts: Record<string, number>;
  onSelect: (conversationId: string) => void;
  onStartConversation: (userId: string) => void;
  onLogout: () => void;
};

export default function Sidebar({
  conversations,
  users,
  activeConversationId,
  unreadCounts,
  onSelect,
  onStartConversation,
  onLogout
}: SidebarProps) {
  const usersWithoutConversation = users.filter(
    (user) => !conversations.some((conversation) => conversation.participants.some((participant) => participant.id === user.id))
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <h1>Chatly</h1>
        <button className="logout-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
      <div className="sidebar-section">
        <h2>Start a chat</h2>
        <div className="conversation-list">
          {usersWithoutConversation.length > 0 ? (
            usersWithoutConversation.map((user) => (
              <button className="conversation" key={user.id} onClick={() => onStartConversation(user.id)}>
                <Avatar name={user.name} src={user.avatarUrl} />
                <span>{user.name}</span>
              </button>
            ))
          ) : (
            <p className="sidebar-empty">No new chats available.</p>
          )}
        </div>
      </div>
      <div className="sidebar-section">
        <h2>Conversations</h2>
        <div className="conversation-list">
          {conversations.length > 0 ? (
            conversations.map((conversation) => {
              const participant = conversation.participants[0];
              const unreadCount = unreadCounts[conversation.id] ?? 0;

              return (
                <button
                  className={conversation.id === activeConversationId ? "conversation active" : "conversation"}
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                >
                  <Avatar name={participant?.name ?? "User"} src={participant?.avatarUrl} />
                  <span>{participant?.name ?? "Conversation"}</span>
                  {unreadCount > 0 ? <strong className="unread-badge">{unreadCount}</strong> : null}
                </button>
              );
            })
          ) : (
            <p className="sidebar-empty">No conversations yet.</p>
          )}
        </div>
      </div>
    </aside>
  );
}
