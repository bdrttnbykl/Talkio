import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  createConversation,
  createGroupConversation,
  markConversationRead as markConversationReadRequest
} from "../api/conversations.api";
import { ChevronLeft, ChevronRight, Paperclip, Search, Send, Smile, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deleteMessage, sendMessage, updateMessage, uploadMessageFile } from "../api/messages.api";
import { getUsers, removeChatBackground, uploadAvatar, uploadChatBackground } from "../api/users.api";
import ChatHeader from "../components/common/ChatHeader";
import MessageBubble, { resolveAttachmentUrl } from "../components/common/MessageBubble";
import Sidebar from "../components/common/Sidebar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useChat } from "../hooks/useChat";
import { useSocket } from "../hooks/useSocket";
import { SOCKET_EVENTS } from "../socket/socketEvents";
import { useAuthStore } from "../store/authStore";
import { useChatStore } from "../store/chatStore";
import type { Message } from "../types/message";
import type { User } from "../types/user";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const EMOJIS = ["😀", "😂", "😍", "😎", "🥳", "😢", "😡", "👍", "🙏", "👏", "🔥", "❤️", "💯", "✅", "✨", "🎉", "🤔", "🙌", "😅", "😴"];

const DISAPPEARING_OPTIONS = ["Kapali", "24s", "7g", "90g"] as const;

type DisappearingOption = (typeof DISAPPEARING_OPTIONS)[number];

function readStoredArray(key: string) {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function readStoredRecord<T>(key: string, fallback: T) {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredValue(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function Chat() {
  useChat();
  const socket = useSocket();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    activeConversationId,
    conversations,
    messages,
    onlineUserIds,
    unreadCounts,
    setActiveConversationId,
    addMessage,
    updateMessage: updateMessageInStore,
    removeMessage,
    upsertConversation,
    markConversationRead,
    reset
  } = useChatStore();
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [blockedConversationIds, setBlockedConversationIds] = useState(() => readStoredArray("chatly_blocked_conversations"));
  const [deletedConversationIds, setDeletedConversationIds] = useState(() => readStoredArray("chatly_deleted_conversations"));
  const [favoriteConversationIds, setFavoriteConversationIds] = useState(() => readStoredArray("chatly_favorite_conversations"));
  const [hiddenMessageIds, setHiddenMessageIds] = useState(() => readStoredArray("chatly_hidden_messages"));
  const [listedConversationIds, setListedConversationIds] = useState(() => readStoredArray("chatly_listed_conversations"));
  const [mutedConversationIds, setMutedConversationIds] = useState(() => readStoredArray("chatly_muted_conversations"));
  const [reportedConversationIds, setReportedConversationIds] = useState(() => readStoredArray("chatly_reported_conversations"));
  const [disappearingByConversation, setDisappearingByConversation] = useState(() =>
    readStoredRecord<Record<string, DisappearingOption>>("chatly_disappearing_conversations", {})
  );
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const visibleConversations = useMemo(
    () => conversations.filter((conversation) => !deletedConversationIds.includes(conversation.id)),
    [conversations, deletedConversationIds]
  );

  const activeConversation = useMemo(
    () => visibleConversations.find((conversation) => conversation.id === activeConversationId),
    [activeConversationId, visibleConversations]
  );
  const isActiveBlocked = Boolean(activeConversationId && blockedConversationIds.includes(activeConversationId));
  const canSendMessage = Boolean(activeConversationId && !isActiveBlocked && (content.trim() || selectedFile) && !isSending);
  const visibleMessagePool = useMemo(
    () => messages.filter((message) => !hiddenMessageIds.includes(message.id)),
    [hiddenMessageIds, messages]
  );
  const imageMessages = useMemo(
    () => visibleMessagePool.filter((message) => message.attachmentUrl && message.attachmentType?.startsWith("image/")),
    [visibleMessagePool]
  );
  const visibleMessages = useMemo(() => {
    const normalizedQuery = messageQuery.trim().toLowerCase();
    if (!normalizedQuery) return visibleMessagePool;

    return visibleMessagePool.filter((message) =>
      `${message.content} ${message.attachmentName ?? ""}`.toLowerCase().includes(normalizedQuery)
    );
  }, [messageQuery, visibleMessagePool]);
  const activeGalleryMessage = galleryIndex === null ? null : imageMessages[galleryIndex] ?? null;
  const chatBackgroundUrl = activeConversationId && user?.chatBackgroundUrl ? resolveAttachmentUrl(user.chatBackgroundUrl) : null;
  const chatBackgroundStyle = chatBackgroundUrl
    ? ({
        "--chat-bg": `url(${chatBackgroundUrl})`
      } as React.CSSProperties)
    : undefined;
  const activeDisappearingLabel = activeConversationId ? disappearingByConversation[activeConversationId] ?? "Kapali" : "Kapali";

  const handleSelect = (conversationId: string) => {
    setActiveConversationId(conversationId);
    markConversationRead(conversationId);
    markConversationReadRequest(conversationId)
      .then(() => socket.emit(SOCKET_EVENTS.MARK_READ, { conversationId }))
      .catch(console.error);
    socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversationId);
  };

  const handleStartConversation = async (participantId: string) => {
    const conversation = await createConversation(participantId);
    upsertConversation(conversation);
    handleSelect(conversation.id);
  };

  const handleStartGroup = async (name: string, participantIds: string[]) => {
    const conversation = await createGroupConversation(name, participantIds);
    upsertConversation(conversation);
    handleSelect(conversation.id);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeConversationId || isActiveBlocked || (!content.trim() && !selectedFile) || isSending) return;

    setIsSending(true);

    try {
      const attachment = selectedFile ? await uploadMessageFile(selectedFile) : undefined;
      const message = await sendMessage(activeConversationId, content.trim(), attachment);
      addMessage(message);
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, message);
      setContent("");
      setIsEmojiPickerOpen(false);
      clearSelectedFile();
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (message: Message, nextContent: string) => {
    const updatedMessage = await updateMessage(message.id, nextContent);
    updateMessageInStore(updatedMessage);
    socket.emit(SOCKET_EVENTS.UPDATE_MESSAGE, updatedMessage);
  };

  const handleDeleteMessage = async (message: Message) => {
    const deletedMessage = await deleteMessage(message.id);
    removeMessage(deletedMessage.id);
    socket.emit(SOCKET_EVENTS.DELETE_MESSAGE, deletedMessage);
  };

  const handleToggleMessageSelect = (messageId: string) => {
    setSelectedMessageIds((currentIds) =>
      currentIds.includes(messageId) ? currentIds.filter((id) => id !== messageId) : [...currentIds, messageId]
    );
  };

  const handleDeleteSelectedMessages = async () => {
    const selectedMessages = messages.filter((message) => selectedMessageIds.includes(message.id));
    const ownMessages = selectedMessages.filter((message) => message.senderId === user?.id);
    const otherMessageIds = selectedMessages.filter((message) => message.senderId !== user?.id).map((message) => message.id);

    for (const message of ownMessages) {
      await handleDeleteMessage(message);
    }

    if (otherMessageIds.length > 0) {
      const nextHiddenMessageIds = Array.from(new Set([...hiddenMessageIds, ...otherMessageIds]));
      setHiddenMessageIds(nextHiddenMessageIds);
      writeStoredValue("chatly_hidden_messages", nextHiddenMessageIds);
    }

    setSelectedMessageIds([]);
    setIsSelectionMode(false);
  };

  const handleOpenImage = (message: Message) => {
    const nextIndex = imageMessages.findIndex((imageMessage) => imageMessage.id === message.id);
    if (nextIndex >= 0) setGalleryIndex(nextIndex);
  };

  const handlePreviousImage = () => {
    setGalleryIndex((index) => {
      if (index === null) return null;
      return index === 0 ? imageMessages.length - 1 : index - 1;
    });
  };

  const handleNextImage = () => {
    setGalleryIndex((index) => {
      if (index === null) return null;
      return index === imageMessages.length - 1 ? 0 : index + 1;
    });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const updatedUser = await uploadAvatar(file);
    updateUser(updatedUser);
  };

  const handleBackgroundUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const updatedUser = await uploadChatBackground(file);
    updateUser(updatedUser);
  };

  const handleBackgroundFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleBackgroundUpload(file).catch(console.error);
    event.target.value = "";
  };

  const handleBackgroundRemove = async () => {
    const updatedUser = await removeChatBackground();
    updateUser(updatedUser);
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const toggleConversationList = (
    conversationId: string,
    values: string[],
    setValues: (values: string[]) => void,
    storageKey: string
  ) => {
    const nextValues = values.includes(conversationId)
      ? values.filter((id) => id !== conversationId)
      : [...values, conversationId];
    setValues(nextValues);
    writeStoredValue(storageKey, nextValues);
  };

  const handleBlockChat = () => {
    if (!activeConversationId) return;
    toggleConversationList(activeConversationId, blockedConversationIds, setBlockedConversationIds, "chatly_blocked_conversations");
  };

  const handleClearChat = () => {
    if (!activeConversationId) return;
    const idsToHide = messages.filter((message) => message.conversationId === activeConversationId).map((message) => message.id);
    const nextHiddenMessageIds = Array.from(new Set([...hiddenMessageIds, ...idsToHide]));
    setHiddenMessageIds(nextHiddenMessageIds);
    setSelectedMessageIds([]);
    setIsSelectionMode(false);
    writeStoredValue("chatly_hidden_messages", nextHiddenMessageIds);
  };

  const handleCloseChat = () => {
    setActiveConversationId(null);
    setIsEmojiPickerOpen(false);
    setIsInfoOpen(false);
    setIsSelectionMode(false);
    setMessageQuery("");
    setSelectedMessageIds([]);
  };

  const handleDeleteChat = () => {
    if (!activeConversationId) return;
    const nextDeletedConversationIds = Array.from(new Set([...deletedConversationIds, activeConversationId]));
    setDeletedConversationIds(nextDeletedConversationIds);
    writeStoredValue("chatly_deleted_conversations", nextDeletedConversationIds);
    handleCloseChat();
  };

  const handleFavoriteChat = () => {
    if (!activeConversationId) return;
    toggleConversationList(activeConversationId, favoriteConversationIds, setFavoriteConversationIds, "chatly_favorite_conversations");
  };

  const handleListChat = () => {
    if (!activeConversationId) return;
    toggleConversationList(activeConversationId, listedConversationIds, setListedConversationIds, "chatly_listed_conversations");
  };

  const handleMuteChat = () => {
    if (!activeConversationId) return;
    toggleConversationList(activeConversationId, mutedConversationIds, setMutedConversationIds, "chatly_muted_conversations");
  };

  const handleReportChat = () => {
    if (!activeConversationId) return;
    const nextReportedConversationIds = Array.from(new Set([...reportedConversationIds, activeConversationId]));
    setReportedConversationIds(nextReportedConversationIds);
    writeStoredValue("chatly_reported_conversations", nextReportedConversationIds);
    window.alert("Sikayet yerel olarak kaydedildi.");
  };

  const handleSetDisappearing = () => {
    if (!activeConversationId) return;
    const currentOption = disappearingByConversation[activeConversationId] ?? "Kapali";
    const nextOption = DISAPPEARING_OPTIONS[(DISAPPEARING_OPTIONS.indexOf(currentOption) + 1) % DISAPPEARING_OPTIONS.length];
    const nextDisappearingByConversation = { ...disappearingByConversation, [activeConversationId]: nextOption };
    setDisappearingByConversation(nextDisappearingByConversation);
    writeStoredValue("chatly_disappearing_conversations", nextDisappearingByConversation);
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((currentContent) => `${currentContent}${emoji}`);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (file && file.size > MAX_ATTACHMENT_SIZE) {
      clearSelectedFile();
      setFileError("Dosya en fazla 10MB olabilir.");
      return;
    }

    setSelectedFile(file);
    setFileError("");
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  useEffect(() => {
    setIsEmojiPickerOpen(false);
    setIsInfoOpen(false);
    setIsSelectionMode(false);
    setMessageQuery("");
    setSelectedMessageIds([]);
  }, [activeConversationId]);

  useEffect(() => {
    if (galleryIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryIndex(null);
      if (event.key === "ArrowLeft" && imageMessages.length > 1) handlePreviousImage();
      if (event.key === "ArrowRight" && imageMessages.length > 1) handleNextImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryIndex, imageMessages.length]);

  useEffect(() => {
    if (!activeConversationId || galleryIndex !== null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;

      setActiveConversationId(null);
      setIsEmojiPickerOpen(false);
      setMessageQuery("");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeConversationId, galleryIndex, setActiveConversationId]);

  return (
    <main className="chat-layout">
      <Sidebar
        conversations={visibleConversations}
        users={users}
        activeConversationId={activeConversationId}
        unreadCounts={unreadCounts}
        currentUser={user}
        notificationPermission={notificationPermission}
        onSelect={handleSelect}
        onStartConversation={handleStartConversation}
        onStartGroup={handleStartGroup}
        onAvatarUpload={handleAvatarUpload}
        onEnableNotifications={handleEnableNotifications}
        onLogout={handleLogout}
      />
      <section className="chat-panel">
        <ChatHeader
          conversation={activeConversation}
          disappearingLabel={activeDisappearingLabel}
          isBlocked={Boolean(activeConversationId && blockedConversationIds.includes(activeConversationId))}
          isFavorite={Boolean(activeConversationId && favoriteConversationIds.includes(activeConversationId))}
          isListed={Boolean(activeConversationId && listedConversationIds.includes(activeConversationId))}
          isMuted={Boolean(activeConversationId && mutedConversationIds.includes(activeConversationId))}
          onlineUserIds={onlineUserIds}
          onBlock={handleBlockChat}
          onBackgroundSelect={() => backgroundInputRef.current?.click()}
          onClearChat={handleClearChat}
          onCloseChat={handleCloseChat}
          onDeleteChat={handleDeleteChat}
          onFavorite={handleFavoriteChat}
          onInfo={() => setIsInfoOpen(true)}
          onList={handleListChat}
          onMute={handleMuteChat}
          onReport={handleReportChat}
          onSelectMessages={() => setIsSelectionMode(true)}
          onSetDisappearing={handleSetDisappearing}
        />
        <input
          ref={backgroundInputRef}
          className="hidden-file-input"
          type="file"
          accept="image/*"
          onChange={handleBackgroundFileChange}
        />
        {activeConversationId ? (
          <div className="chat-search">
            <Search size={16} />
            <input
              value={messageQuery}
              onChange={(event) => setMessageQuery(event.target.value)}
              placeholder="Mesajlarda veya dosyalarda ara"
            />
            {messageQuery ? (
              <button type="button" aria-label="Clear message search" onClick={() => setMessageQuery("")}>
                <X size={16} />
              </button>
            ) : null}
          </div>
        ) : null}
        {activeConversationId && isActiveBlocked ? (
          <div className="chat-notice">Bu sohbet engellendi. Mesaj gondermek icin menuden engeli kaldir.</div>
        ) : null}
        {isSelectionMode ? (
          <div className="selection-toolbar">
            <strong>{selectedMessageIds.length} secili</strong>
            <button type="button" onClick={() => setSelectedMessageIds(visibleMessages.map((message) => message.id))}>
              Tumunu sec
            </button>
            <button type="button" disabled={selectedMessageIds.length === 0} onClick={handleDeleteSelectedMessages}>
              Secilenleri sil
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSelectionMode(false);
                setSelectedMessageIds([]);
              }}
            >
              Iptal
            </button>
          </div>
        ) : null}
        <div
          className={chatBackgroundUrl ? "messages with-background" : "messages"}
          style={chatBackgroundStyle}
        >
          {activeConversationId ? (
            visibleMessages.length > 0 ? (
              visibleMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.senderId === user?.id}
                  isSelectable={isSelectionMode}
                  isSelected={selectedMessageIds.includes(message.id)}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onOpenImage={handleOpenImage}
                  onToggleSelect={handleToggleMessageSelect}
                />
              ))
            ) : (
              <div className="empty-state">{messageQuery ? "Mesaj bulunamadi." : "Henuz mesaj yok."}</div>
            )
          ) : (
            <div className="empty-state">Sohbet baslat veya bir sohbet sec.</div>
          )}
        </div>
        <form className="message-form" onSubmit={handleSubmit}>
          {selectedFile ? (
            <div className="selected-file">
              <Paperclip size={16} />
              <span>{selectedFile.name}</span>
              <button type="button" aria-label="Remove attachment" onClick={clearSelectedFile}>
                <X size={16} />
              </button>
            </div>
          ) : null}
          {fileError ? <p className="form-error">{fileError}</p> : null}
          <Input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder={isActiveBlocked ? "Bu sohbet engellendi" : activeConversationId ? "Mesaj yaz" : "Once bir sohbet sec"}
            disabled={!activeConversationId || isActiveBlocked || isSending}
          />
          <div className="emoji-picker-wrap">
            <button
              className="icon-button"
              type="button"
              aria-label="Open emoji picker"
              disabled={!activeConversationId || isActiveBlocked || isSending}
              onClick={() => setIsEmojiPickerOpen((isOpen) => !isOpen)}
            >
              <Smile size={18} />
            </button>
            {isEmojiPickerOpen ? (
              <div className="emoji-picker">
                {EMOJIS.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => handleEmojiSelect(emoji)} aria-label={`Add ${emoji}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label
            className={activeConversationId && !isActiveBlocked && !isSending ? "file-button" : "file-button disabled"}
            aria-label="Attach file"
          >
            <Paperclip size={18} />
            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              disabled={!activeConversationId || isActiveBlocked || isSending}
              onChange={handleFileChange}
            />
          </label>
          <Button type="submit" aria-label="Send message" disabled={!canSendMessage}>
            <Send size={18} />
          </Button>
        </form>
      </section>
      {isInfoOpen && activeConversation ? (
        <div className="info-overlay" role="dialog" aria-modal="true">
          <section className="info-panel">
            <button className="info-close" type="button" aria-label="Close info" onClick={() => setIsInfoOpen(false)}>
              <X size={18} />
            </button>
            <h2>{activeConversation.isGroup ? activeConversation.name ?? "Grup sohbeti" : activeConversation.participants[0]?.name}</h2>
            <p>{activeConversation.isGroup ? `${activeConversation.participants.length + 1} uye` : activeConversation.participants[0]?.email}</p>
            <div className="info-list">
              {activeConversation.participants.map((participant) => (
                <div key={participant.id}>
                  <span>{participant.name}</span>
                  <small>{onlineUserIds.includes(participant.id) ? "Cevrimici" : participant.lastSeenAt ? `Son gorulme ${new Date(participant.lastSeenAt).toLocaleString()}` : "Cevrimdisi"}</small>
                </div>
              ))}
            </div>
            <dl>
              <div>
                <dt>Bildirimler</dt>
                <dd>{activeConversationId && mutedConversationIds.includes(activeConversationId) ? "Sessizde" : "Acik"}</dd>
              </div>
              <div>
                <dt>Sureli mesajlar</dt>
                <dd>{activeDisappearingLabel}</dd>
              </div>
              <div>
                <dt>Favori</dt>
                <dd>{activeConversationId && favoriteConversationIds.includes(activeConversationId) ? "Evet" : "Hayir"}</dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}
      {activeGalleryMessage?.attachmentUrl ? (
        <div className="gallery-overlay" role="dialog" aria-modal="true">
          <button className="gallery-close" type="button" aria-label="Close gallery" onClick={() => setGalleryIndex(null)}>
            <X size={22} />
          </button>
          {imageMessages.length > 1 ? (
            <button className="gallery-nav previous" type="button" aria-label="Previous image" onClick={handlePreviousImage}>
              <ChevronLeft size={28} />
            </button>
          ) : null}
          <figure className="gallery-content">
            <img
              src={resolveAttachmentUrl(activeGalleryMessage.attachmentUrl)}
              alt={activeGalleryMessage.attachmentName ?? "Resim eki"}
            />
            <figcaption>
              <span>{activeGalleryMessage.attachmentName ?? "Resim"}</span>
              {imageMessages.length > 1 && galleryIndex !== null ? (
                <strong>
                  {galleryIndex + 1} / {imageMessages.length}
                </strong>
              ) : null}
            </figcaption>
          </figure>
          {imageMessages.length > 1 ? (
            <button className="gallery-nav next" type="button" aria-label="Next image" onClick={handleNextImage}>
              <ChevronRight size={28} />
            </button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
