import type { Conversation } from "../../types/conversation";
import type { User } from "../../types/user";
import { Bell, Camera, Search, Settings, Users } from "lucide-react";
import { useMemo, useState } from "react";
import Avatar from "./Avatar";

type SidebarProps = {
  conversations: Conversation[];
  users: User[];
  activeConversationId: string | null;
  unreadCounts: Record<string, number>;
  currentUser: User | null;
  notificationPermission: NotificationPermission | "unsupported";
  onSelect: (conversationId: string) => void;
  onStartConversation: (userId: string) => void;
  onStartGroup: (name: string, userIds: string[]) => void;
  onAvatarUpload: (file: File) => void;
  onEnableNotifications: () => void;
  onLogout: () => void;
  onOpenSettings: () => void;
};

export default function Sidebar({
  conversations,
  users,
  activeConversationId,
  unreadCounts,
  currentUser,
  notificationPermission,
  onSelect,
  onStartConversation,
  onStartGroup,
  onAvatarUpload,
  onEnableNotifications,
  onLogout,
  onOpenSettings
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [isGroupFormOpen, setIsGroupFormOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const normalizedQuery = query.trim().toLowerCase();
  const usersWithoutConversation = users.filter(
    (user) => !conversations.some((conversation) => conversation.participants.some((participant) => participant.id === user.id))
  );
  const filteredUsers = useMemo(
    () =>
      usersWithoutConversation.filter((user) =>
        `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery)
      ),
    [normalizedQuery, usersWithoutConversation]
  );
  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) => {
        const participant = conversation.participants[0];
        return `${participant?.name ?? ""} ${participant?.email ?? ""}`.toLowerCase().includes(normalizedQuery);
      }),
    [conversations, normalizedQuery]
  );
  const canCreateGroup = groupName.trim() && selectedUserIds.length >= 2;

  const toggleGroupUser = (userId: string) => {
    setSelectedUserIds((currentIds) =>
      currentIds.includes(userId) ? currentIds.filter((id) => id !== userId) : [...currentIds, userId]
    );
  };

  const handleCreateGroup = () => {
    if (!canCreateGroup) return;
    onStartGroup(groupName.trim(), selectedUserIds);
    setGroupName("");
    setSelectedUserIds([]);
    setIsGroupFormOpen(false);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <h1>Talkio</h1>
        <button className="logout-button" type="button" onClick={onLogout}>
          Cikis
        </button>
        <button className="settings-button" type="button" aria-label="Ayarlar" onClick={onOpenSettings}>
          <Settings size={18} />
        </button>
      </div>
      {currentUser ? (
        <div className="profile-panel">
          <Avatar name={currentUser.name} src={currentUser.avatarUrl} />
          <div>
            <strong>{currentUser.name}</strong>
            <span>{currentUser.email}</span>
          </div>
          <label className="avatar-upload-button" aria-label="Upload profile photo">
            <Camera size={16} />
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onAvatarUpload(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
      ) : null}
      <div className="sidebar-actions">
        <button type="button" onClick={() => setIsGroupFormOpen((isOpen) => !isOpen)}>
          <Users size={16} />
          <span>Yeni grup</span>
        </button>
        {notificationPermission !== "granted" ? (
          <button type="button" onClick={onEnableNotifications} disabled={notificationPermission === "unsupported"}>
            <Bell size={16} />
            <span>Bildirimler</span>
          </button>
        ) : null}
      </div>
      {isGroupFormOpen ? (
        <div className="group-form">
          <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Grup adi" />
          <div className="group-user-list">
            {users.map((user) => (
              <label key={user.id}>
                <input
                  type="checkbox"
                  checked={selectedUserIds.includes(user.id)}
                  onChange={() => toggleGroupUser(user.id)}
                />
                <Avatar name={user.name} src={user.avatarUrl} />
                <span>{user.name}</span>
              </label>
            ))}
          </div>
          <button type="button" disabled={!canCreateGroup} onClick={handleCreateGroup}>
            Grup olustur
          </button>
        </div>
      ) : null}
      <label className="sidebar-search">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ara" />
      </label>
      <div className="sidebar-section">
        <h2>Sohbet baslat</h2>
        <div className="conversation-list">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((user) => (
              <button className="conversation" key={user.id} onClick={() => onStartConversation(user.id)}>
                <Avatar name={user.name} src={user.avatarUrl} />
                <span>{user.name}</span>
              </button>
            ))
          ) : (
            <p className="sidebar-empty">{query ? "Kullanici bulunamadi." : "Yeni sohbet yok."}</p>
          )}
        </div>
      </div>
      <div className="sidebar-section">
        <h2>Sohbetler</h2>
        <div className="conversation-list">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const participant = conversation.participants[0];
              const unreadCount = unreadCounts[conversation.id] ?? 0;

              return (
                <button
                  className={conversation.id === activeConversationId ? "conversation active" : "conversation"}
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                >
                  <Avatar name={participant?.name ?? "User"} src={participant?.avatarUrl} />
                  <span>{conversation.isGroup ? conversation.name ?? "Grup sohbeti" : participant?.name ?? "Sohbet"}</span>
                  {unreadCount > 0 ? <strong className="unread-badge">{unreadCount}</strong> : null}
                </button>
              );
            })
          ) : (
            <p className="sidebar-empty">{query ? "Sohbet bulunamadi." : "Henuz sohbet yok."}</p>
          )}
        </div>
      </div>
    </aside>
  );
}
