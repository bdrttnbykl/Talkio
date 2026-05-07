import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  createConversation,
  createGroupConversation,
  markConversationRead as markConversationReadRequest,
  updateDisappearingMessages,
} from "../api/conversations.api";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Paperclip, Pin, Search, Send, Smile, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { deleteMessage, pinMessage, reactToMessage, sendMessage, updateMessage, uploadMessageFile } from "../api/messages.api";
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
import type { Message, MessageReactionType } from "../types/message";
import type { User } from "../types/user";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const EMOJIS = ["😀", "😂", "😍", "😎", "🥳", "😢", "😡", "👍", "🙏", "👏", "🔥", "❤️", "💯", "✅", "✨", "🎉", "🤔", "🙌", "😅", "😴"];

const DISAPPEARING_OPTIONS = [
  { label: "Kapali", durationSeconds: null },
  { label: "24s", durationSeconds: 24 * 60 * 60 },
  { label: "7g", durationSeconds: 7 * 24 * 60 * 60 },
  { label: "90g", durationSeconds: 90 * 24 * 60 * 60 }
] as const;

type TypingPayload = {
  conversationId: string;
  userId: string;
  isTyping: boolean;
};

function readStoredArray(key: string) {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStoredValue(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function downloadTextFile(fileName: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toSafeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöç -]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 60) || "sohbet";
}

function getConversationTitle(conversation: NonNullable<ReturnType<typeof useChatStore.getState>["conversations"][number]>) {
  if (conversation.isGroup) return conversation.name ?? "Grup sohbeti";
  return conversation.participants[0]?.name ?? "Sohbet";
}

function formatMessageForTxt(message: Message) {
  const senderName = message.sender?.name ?? "Bilinmeyen";
  const time = new Date(message.createdAt).toLocaleString();
  const pieces = [`[${time}] ${senderName}: ${message.content || ""}`];

  if (message.attachmentUrl) {
    pieces.push(`Ek: ${message.attachmentName ?? "Dosya"} (${message.attachmentType ?? "bilinmeyen"}) ${message.attachmentUrl}`);
  }

  if (message.replyTo) {
    pieces.push(`Yanitlanan: ${message.replyTo.content || message.replyTo.attachmentName || message.replyToId}`);
  }

  if (message.reactions?.length) {
    pieces.push(`Tepkiler: ${message.reactions.map((reaction) => `${reaction.type}:${reaction.user?.name ?? reaction.userId}`).join(", ")}`);
  }

  if (message.isPinned) {
    pieces.push("Sabitlendi");
  }

  return pieces.join("\n");
}

function formatAttachmentSize(size?: number | null) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const typingTimeoutRef = useRef<number | null>(null);
  const incomingTypingTimeoutsRef = useRef<Record<string, number>>({});
  const isTypingRef = useRef(false);
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
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [expiryTick, setExpiryTick] = useState(() => Date.now());
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [blockedConversationIds, setBlockedConversationIds] = useState(() => readStoredArray("talkio_blocked_conversations"));
  const [deletedConversationIds, setDeletedConversationIds] = useState(() => readStoredArray("talkio_deleted_conversations"));
  const [favoriteConversationIds, setFavoriteConversationIds] = useState(() => readStoredArray("talkio_favorite_conversations"));
  const [hiddenMessageIds, setHiddenMessageIds] = useState(() => readStoredArray("talkio_hidden_messages"));
  const [listedConversationIds, setListedConversationIds] = useState(() => readStoredArray("talkio_listed_conversations"));
  const [mutedConversationIds, setMutedConversationIds] = useState(() => readStoredArray("talkio_muted_conversations"));
  const [reportedConversationIds, setReportedConversationIds] = useState(() => readStoredArray("talkio_reported_conversations"));
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
    () => messages.filter((message) => !hiddenMessageIds.includes(message.id) && (!message.expiresAt || new Date(message.expiresAt).getTime() > expiryTick)),
    [expiryTick, hiddenMessageIds, messages]
  );
  const imageMessages = useMemo(
    () => visibleMessagePool.filter((message) => message.attachmentUrl && message.attachmentType?.startsWith("image/")),
    [visibleMessagePool]
  );
  const pdfMessages = useMemo(
    () => visibleMessagePool.filter((message) => message.attachmentUrl && message.attachmentType === "application/pdf"),
    [visibleMessagePool]
  );
  const fileMessages = useMemo(
    () =>
      visibleMessagePool.filter(
        (message) => message.attachmentUrl && !message.attachmentType?.startsWith("image/") && message.attachmentType !== "application/pdf"
      ),
    [visibleMessagePool]
  );
  const attachmentCount = imageMessages.length + pdfMessages.length + fileMessages.length;
  const searchResults = useMemo(() => {
    const normalizedQuery = messageQuery.trim().toLowerCase();
    if (!normalizedQuery) return [];

    return visibleMessagePool.filter((message) =>
      `${message.content} ${message.attachmentName ?? ""} ${message.sender?.name ?? ""}`.toLowerCase().includes(normalizedQuery)
    );
  }, [messageQuery, visibleMessagePool]);
  const visibleMessages = visibleMessagePool;
  const activeGalleryMessage = galleryIndex === null ? null : imageMessages[galleryIndex] ?? null;
  const pinnedMessage = useMemo(
    () =>
      visibleMessagePool
        .filter((message) => message.isPinned)
        .sort((first, second) => new Date(second.pinnedAt ?? second.createdAt).getTime() - new Date(first.pinnedAt ?? first.createdAt).getTime())[0] ??
      null,
    [visibleMessagePool]
  );
  const rawChatBackgroundUrl = user?.chatBackgroundUrl ?? activeConversation?.chatBackgroundUrl;
  const chatBackgroundUrl = rawChatBackgroundUrl ? resolveAttachmentUrl(rawChatBackgroundUrl) : null;
  const chatBackgroundStyle = chatBackgroundUrl
    ? ({
        "--chat-bg": `url(${chatBackgroundUrl})`
      } as React.CSSProperties)
    : undefined;
  const activeDisappearingOption =
    DISAPPEARING_OPTIONS.find((option) => option.durationSeconds === (activeConversation?.disappearingDurationSeconds ?? null)) ??
    DISAPPEARING_OPTIONS[0];
  const activeDisappearingLabel = activeDisappearingOption.label;
  const typingNames = useMemo(
    () =>
      typingUserIds
        .map((typingUserId) => activeConversation?.participants.find((participant) => participant.id === typingUserId)?.name)
        .filter(Boolean) as string[],
    [activeConversation?.participants, typingUserIds]
  );
  const typingLabel = typingNames.length > 1 ? `${typingNames.slice(0, 2).join(", ")} yaziyor...` : typingNames[0] ? `${typingNames[0]} yaziyor...` : "";

  const emitTyping = (isTyping: boolean) => {
    if (!activeConversationId || isActiveBlocked || isTypingRef.current === isTyping) return;

    isTypingRef.current = isTyping;
    socket.emit(SOCKET_EVENTS.TYPING, { conversationId: activeConversationId, isTyping });
  };

  const handleSelect = (conversationId: string) => {
    emitTyping(false);
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
      const message = await sendMessage(activeConversationId, content.trim(), attachment, replyToMessage?.id);
      addMessage(message);
      socket.emit(SOCKET_EVENTS.SEND_MESSAGE, message);
      emitTyping(false);
      setContent("");
      setReplyToMessage(null);
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

  const handleReactMessage = async (message: Message, type: MessageReactionType) => {
    const updatedMessage = await reactToMessage(message.id, type);
    updateMessageInStore(updatedMessage);
    socket.emit(SOCKET_EVENTS.REACT_MESSAGE, updatedMessage);
  };

  const handlePinMessage = async (message: Message) => {
    const updatedMessage = await pinMessage(message.id);
    updateMessageInStore(updatedMessage);
    socket.emit(SOCKET_EVENTS.PIN_MESSAGE, updatedMessage);
  };

  const handleForwardMessage = async (conversationId: string) => {
    if (!forwardMessage) return;

    const forwardedMessage = await sendMessage(
      conversationId,
      forwardMessage.content,
      forwardMessage.attachmentUrl
        ? {
            url: forwardMessage.attachmentUrl,
            name: forwardMessage.attachmentName ?? "Ek",
            type: forwardMessage.attachmentType ?? "application/octet-stream",
            size: forwardMessage.attachmentSize ?? 0
          }
        : undefined
    );

    if (conversationId === activeConversationId) addMessage(forwardedMessage);
    socket.emit(SOCKET_EVENTS.SEND_MESSAGE, forwardedMessage);
    setForwardMessage(null);
  };

  const handleJumpToMessage = (messageId: string) => {
    document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    window.setTimeout(() => {
      setHighlightedMessageId((currentId) => (currentId === messageId ? null : currentId));
    }, 1800);
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
      writeStoredValue("talkio_hidden_messages", nextHiddenMessageIds);
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
    if (!activeConversationId || !file.type.startsWith("image/")) return;

    const updatedUser = await uploadChatBackground(file);
    updateUser(updatedUser);
  };

  const handleBackgroundFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleBackgroundUpload(file).catch(console.error);
    event.target.value = "";
  };

  const handleBackgroundRemove = async () => {
    if (!activeConversationId) return;

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
    toggleConversationList(activeConversationId, blockedConversationIds, setBlockedConversationIds, "talkio_blocked_conversations");
  };

  const handleClearChat = () => {
    if (!activeConversationId) return;
    const idsToHide = messages.filter((message) => message.conversationId === activeConversationId).map((message) => message.id);
    const nextHiddenMessageIds = Array.from(new Set([...hiddenMessageIds, ...idsToHide]));
    setHiddenMessageIds(nextHiddenMessageIds);
    setSelectedMessageIds([]);
    setIsSelectionMode(false);
    writeStoredValue("talkio_hidden_messages", nextHiddenMessageIds);
  };

  const handleCloseChat = () => {
    emitTyping(false);
    setActiveConversationId(null);
    setIsEmojiPickerOpen(false);
    setIsInfoOpen(false);
    setIsMediaPanelOpen(false);
    setForwardMessage(null);
    setIsSelectionMode(false);
    setMessageQuery("");
    setHighlightedMessageId(null);
    setReplyToMessage(null);
    setForwardMessage(null);
    setSelectedMessageIds([]);
  };

  const handleDeleteChat = () => {
    if (!activeConversationId) return;
    const nextDeletedConversationIds = Array.from(new Set([...deletedConversationIds, activeConversationId]));
    setDeletedConversationIds(nextDeletedConversationIds);
    writeStoredValue("talkio_deleted_conversations", nextDeletedConversationIds);
    handleCloseChat();
  };

  const handleExportTxt = () => {
    if (!activeConversation) return;

    const title = getConversationTitle(activeConversation);
    const lines = [
      `Sohbet: ${title}`,
      `Disa aktarma: ${new Date().toLocaleString()}`,
      `Mesaj sayisi: ${visibleMessagePool.length}`,
      "",
      ...visibleMessagePool.map((message) => formatMessageForTxt(message))
    ];

    downloadTextFile(`${toSafeFileName(title)}-sohbet.txt`, lines.join("\n"));
  };

  const handleExportJson = () => {
    if (!activeConversation) return;

    const title = getConversationTitle(activeConversation);
    const payload = {
      conversation: {
        id: activeConversation.id,
        name: activeConversation.name,
        isGroup: activeConversation.isGroup,
        title,
        exportedAt: new Date().toISOString()
      },
      messages: visibleMessagePool.map((message) => ({
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        senderName: message.sender?.name,
        createdAt: message.createdAt,
        editedAt: message.editedAt,
        isPinned: message.isPinned,
        attachment: message.attachmentUrl
          ? {
              url: message.attachmentUrl,
              name: message.attachmentName,
              type: message.attachmentType,
              size: message.attachmentSize
            }
          : null,
        replyToId: message.replyToId,
        reactions: message.reactions ?? []
      }))
    };

    downloadTextFile(`${toSafeFileName(title)}-sohbet.json`, JSON.stringify(payload, null, 2), "application/json");
  };

  const handleFavoriteChat = () => {
    if (!activeConversationId) return;
    toggleConversationList(activeConversationId, favoriteConversationIds, setFavoriteConversationIds, "talkio_favorite_conversations");
  };

  const handleListChat = () => {
    if (!activeConversationId) return;
    toggleConversationList(activeConversationId, listedConversationIds, setListedConversationIds, "talkio_listed_conversations");
  };

  const handleMuteChat = () => {
    if (!activeConversationId) return;
    toggleConversationList(activeConversationId, mutedConversationIds, setMutedConversationIds, "talkio_muted_conversations");
  };

  const handleReportChat = () => {
    if (!activeConversationId) return;
    const nextReportedConversationIds = Array.from(new Set([...reportedConversationIds, activeConversationId]));
    setReportedConversationIds(nextReportedConversationIds);
    writeStoredValue("talkio_reported_conversations", nextReportedConversationIds);
    window.alert("Sikayet yerel olarak kaydedildi.");
  };

  const handleSetDisappearing = async () => {
    if (!activeConversationId) return;
    const currentIndex = DISAPPEARING_OPTIONS.findIndex(
      (option) => option.durationSeconds === (activeConversation?.disappearingDurationSeconds ?? null)
    );
    const nextOption = DISAPPEARING_OPTIONS[(Math.max(currentIndex, 0) + 1) % DISAPPEARING_OPTIONS.length];
    const updatedConversation = await updateDisappearingMessages(activeConversationId, nextOption.durationSeconds);
    upsertConversation(updatedConversation);
    socket.emit(SOCKET_EVENTS.UPDATE_CONVERSATION, updatedConversation);
  };

  const handleEmojiSelect = (emoji: string) => {
    setContent((currentContent) => `${currentContent}${emoji}`);
    scheduleTypingStop();
    emitTyping(true);
  };

  const handleContentChange = (event: ChangeEvent<HTMLInputElement>) => {
    setContent(event.target.value);

    if (!event.target.value.trim()) {
      emitTyping(false);
      return;
    }

    emitTyping(true);
    scheduleTypingStop();
  };

  const scheduleTypingStop = () => {
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      emitTyping(false);
    }, 1500);
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
    const intervalId = window.setInterval(() => setExpiryTick(Date.now()), 30 * 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    conversations.forEach((conversation) => {
      socket.emit(SOCKET_EVENTS.JOIN_CONVERSATION, conversation.id);
    });
  }, [conversations, socket]);

  useEffect(() => {
    const handleUserTyping = (payload: TypingPayload) => {
      if (payload.conversationId !== activeConversationId || payload.userId === user?.id) return;

      if (incomingTypingTimeoutsRef.current[payload.userId]) {
        window.clearTimeout(incomingTypingTimeoutsRef.current[payload.userId]);
        delete incomingTypingTimeoutsRef.current[payload.userId];
      }

      if (!payload.isTyping) {
        setTypingUserIds((currentIds) => currentIds.filter((userId) => userId !== payload.userId));
        return;
      }

      setTypingUserIds((currentIds) => (currentIds.includes(payload.userId) ? currentIds : [...currentIds, payload.userId]));
      incomingTypingTimeoutsRef.current[payload.userId] = window.setTimeout(() => {
        setTypingUserIds((currentIds) => currentIds.filter((userId) => userId !== payload.userId));
        delete incomingTypingTimeoutsRef.current[payload.userId];
      }, 3000);
    };

    socket.on(SOCKET_EVENTS.USER_TYPING, handleUserTyping);

    return () => {
      socket.off(SOCKET_EVENTS.USER_TYPING, handleUserTyping);
    };
  }, [activeConversationId, socket, user?.id]);

  useEffect(() => {
    isTypingRef.current = false;
    setTypingUserIds([]);
    setIsEmojiPickerOpen(false);
    setIsInfoOpen(false);
    setIsMediaPanelOpen(false);
    setIsSelectionMode(false);
    setMessageQuery("");
    setReplyToMessage(null);
    setSelectedMessageIds([]);
  }, [activeConversationId]);

  useEffect(
    () => () => {
      emitTyping(false);

      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      Object.values(incomingTypingTimeoutsRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    },
    []
  );

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
      setHighlightedMessageId(null);
      setIsMediaPanelOpen(false);
      setForwardMessage(null);
      setReplyToMessage(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeConversationId, galleryIndex, setActiveConversationId]);

  return (
    <main className={activeConversationId ? "chat-layout has-active-chat" : "chat-layout"}>
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
        onOpenSettings={() => navigate("/settings")}
      />
      <section className="chat-panel">
        <ChatHeader
          conversation={activeConversation}
          disappearingLabel={activeDisappearingLabel}
          hasBackground={Boolean(rawChatBackgroundUrl)}
          isBlocked={Boolean(activeConversationId && blockedConversationIds.includes(activeConversationId))}
          isFavorite={Boolean(activeConversationId && favoriteConversationIds.includes(activeConversationId))}
          isListed={Boolean(activeConversationId && listedConversationIds.includes(activeConversationId))}
          isMuted={Boolean(activeConversationId && mutedConversationIds.includes(activeConversationId))}
          onlineUserIds={onlineUserIds}
          onBlock={handleBlockChat}
          onBackgroundRemove={handleBackgroundRemove}
          onBackgroundSelect={() => backgroundInputRef.current?.click()}
          onClearChat={handleClearChat}
          onCloseChat={handleCloseChat}
          onDeleteChat={handleDeleteChat}
          onExportJson={handleExportJson}
          onExportTxt={handleExportTxt}
          onFavorite={handleFavoriteChat}
          onInfo={() => setIsInfoOpen(true)}
          onList={handleListChat}
          onMute={handleMuteChat}
          onOpenMedia={() => setIsMediaPanelOpen(true)}
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
        {activeConversationId && messageQuery.trim() ? (
          <div className="search-results-bar">
            <strong>{searchResults.length} sonuc</strong>
            <div>
              {searchResults.length > 0 ? (
                searchResults.slice(0, 12).map((message) => (
                  <button key={message.id} type="button" onClick={() => handleJumpToMessage(message.id)}>
                    <span>{message.sender?.name ?? "Mesaj"}</span>
                    {message.content || message.attachmentName || "Ek"}
                  </button>
                ))
              ) : (
                <p>Sonuc yok.</p>
              )}
            </div>
          </div>
        ) : null}
        {activeConversationId && isActiveBlocked ? (
          <div className="chat-notice">Bu sohbet engellendi. Mesaj gondermek icin menuden engeli kaldir.</div>
        ) : null}
        {activeConversationId && pinnedMessage ? (
          <button className="pinned-message-bar" type="button" onClick={() => handleJumpToMessage(pinnedMessage.id)}>
            <Pin size={17} />
            <span>
              <strong>Sabit mesaj</strong>
              {pinnedMessage.content || pinnedMessage.attachmentName || "Ek"}
            </span>
          </button>
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
                  currentUserId={user?.id}
                  isHighlighted={highlightedMessageId === message.id}
                  isSelectable={isSelectionMode}
                  isSelected={selectedMessageIds.includes(message.id)}
                  onEdit={handleEditMessage}
                  onDelete={handleDeleteMessage}
                  onForward={setForwardMessage}
                  onOpenImage={handleOpenImage}
                  onPin={handlePinMessage}
                  onReact={handleReactMessage}
                  onReply={setReplyToMessage}
                  onToggleSelect={handleToggleMessageSelect}
                />
              ))
            ) : (
              <div className="empty-state">Henuz mesaj yok.</div>
            )
          ) : (
            <div className="empty-state">Sohbet baslat veya bir sohbet sec.</div>
          )}
        </div>
        <form className="message-form" onSubmit={handleSubmit}>
          {typingLabel ? <div className="typing-indicator">{typingLabel}</div> : null}
          {replyToMessage ? (
            <div className="reply-compose">
              <div>
                <strong>{replyToMessage.sender?.name ?? "Mesaj"}</strong>
                <span>{replyToMessage.content || replyToMessage.attachmentName || "Ek"}</span>
              </div>
              <button type="button" aria-label="Yaniti kaldir" onClick={() => setReplyToMessage(null)}>
                <X size={16} />
              </button>
            </div>
          ) : null}
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
            onChange={handleContentChange}
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
      {isMediaPanelOpen && activeConversation ? (
        <div className="info-overlay" role="dialog" aria-modal="true">
          <section className="media-panel">
            <button className="info-close" type="button" aria-label="Close media panel" onClick={() => setIsMediaPanelOpen(false)}>
              <X size={18} />
            </button>
            <header>
              <h2>Medya ve dosyalar</h2>
              <p>{attachmentCount} ek</p>
            </header>
            <div className="media-panel-content">
              <section>
                <h3>Gorseller</h3>
                {imageMessages.length > 0 ? (
                  <div className="media-grid">
                    {imageMessages.map((message) => (
                      <button
                        key={message.id}
                        type="button"
                        onClick={() => {
                          setIsMediaPanelOpen(false);
                          handleOpenImage(message);
                        }}
                      >
                        <img src={resolveAttachmentUrl(message.attachmentUrl!)} alt={message.attachmentName ?? "Resim"} />
                        <span>{message.attachmentName ?? "Resim"}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="media-empty">Gorsel yok.</p>
                )}
              </section>
              <section>
                <h3>PDF ve dosyalar</h3>
                {[...pdfMessages, ...fileMessages].length > 0 ? (
                  <div className="media-file-list">
                    {[...pdfMessages, ...fileMessages].map((message) => {
                      const url = resolveAttachmentUrl(message.attachmentUrl!);

                      return (
                        <div key={message.id}>
                          <FileText size={20} />
                          <span>
                            <strong>{message.attachmentName ?? "Dosya"}</strong>
                            <small>{formatAttachmentSize(message.attachmentSize)} {message.attachmentType ?? "dosya"}</small>
                          </span>
                          <a href={url} target="_blank" rel="noreferrer" aria-label="Dosyayi ac">
                            <ExternalLink size={16} />
                          </a>
                          <a href={url} download={message.attachmentName ?? true} aria-label="Dosyayi indir">
                            <Download size={16} />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="media-empty">Dosya yok.</p>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}
      {forwardMessage ? (
        <div className="info-overlay" role="dialog" aria-modal="true">
          <section className="forward-panel">
            <button className="info-close" type="button" aria-label="Close forward panel" onClick={() => setForwardMessage(null)}>
              <X size={18} />
            </button>
            <header>
              <h2>Mesaji ilet</h2>
              <p>{forwardMessage.content || forwardMessage.attachmentName || "Ek"}</p>
            </header>
            <div className="forward-list">
              {visibleConversations.map((conversation) => {
                const title = getConversationTitle(conversation);

                return (
                  <button key={conversation.id} type="button" onClick={() => handleForwardMessage(conversation.id)}>
                    <span>{title.slice(0, 2).toUpperCase()}</span>
                    <strong>{title}</strong>
                  </button>
                );
              })}
            </div>
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
