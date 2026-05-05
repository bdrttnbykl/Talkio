import type { Message, MessageReactionType } from "../../types/message";
import { Check, CheckCheck, ChevronDown, Download, ExternalLink, FileText, Forward, Pencil, Pin, PinOff, Reply, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  currentUserId?: string;
  isHighlighted?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onDelete: (message: Message) => void;
  onEdit: (message: Message, content: string) => void;
  onForward: (message: Message) => void;
  onOpenImage: (message: Message) => void;
  onPin: (message: Message) => void;
  onReact: (message: Message, type: MessageReactionType) => void;
  onReply: (message: Message) => void;
  onToggleSelect?: (messageId: string) => void;
};

const reactionOptions: Array<{ type: MessageReactionType; emoji: string; label: string }> = [
  { type: "like", emoji: "\u{1F44D}", label: "Begeni" },
  { type: "heart", emoji: "\u2764\uFE0F", label: "Kalp" },
  { type: "laugh", emoji: "\u{1F602}", label: "Gulme" },
  { type: "wow", emoji: "\u{1F62E}", label: "Sasir" },
  { type: "sad", emoji: "\u{1F622}", label: "Uzgun" },
  { type: "pray", emoji: "\u{1F64F}", label: "Tesekkur" }
];

const reactionEmojiByType = reactionOptions.reduce<Record<MessageReactionType, string>>((items, reaction) => {
  items[reaction.type] = reaction.emoji;
  return items;
}, {} as Record<MessageReactionType, string>);

export default function MessageBubble({
  message,
  isOwn,
  currentUserId,
  isHighlighted = false,
  isSelectable = false,
  isSelected = false,
  onDelete,
  onEdit,
  onForward,
  onOpenImage,
  onPin,
  onReact,
  onReply,
  onToggleSelect
}: MessageBubbleProps) {
  const attachmentUrl = message.attachmentUrl ? getAttachmentUrl(message.attachmentUrl) : null;
  const isImage = Boolean(message.attachmentType?.startsWith("image/"));
  const isPdf = message.attachmentType === "application/pdf";
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const reactionCounts = getReactionCounts(message.reactions ?? []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!draft.trim() || draft.trim() === message.content) {
      setIsEditing(false);
      setDraft(message.content);
      return;
    }

    onEdit(message, draft.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDraft(message.content);
  };

  return (
    <div id={`message-${message.id}`} className={`${isOwn ? "message own" : "message"}${isHighlighted ? " highlighted" : ""}`}>
      {isSelectable ? (
        <label className="message-select">
          <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect?.(message.id)} />
          <span>Sec</span>
        </label>
      ) : null}
      {isEditing ? (
        <form className="message-edit-form" onSubmit={handleSubmit}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} autoFocus />
          <button type="submit" aria-label="Save message">
            <Check size={16} />
          </button>
          <button type="button" aria-label="Cancel edit" onClick={handleCancel}>
            <X size={16} />
          </button>
        </form>
      ) : (
        <>
          {message.replyTo ? (
            <div className="reply-preview">
              <strong>{message.replyTo.sender?.name ?? "Mesaj"}</strong>
              <span>{message.replyTo.content || message.replyTo.attachmentName || "Ek"}</span>
            </div>
          ) : null}
          {message.content ? <p>{message.content}</p> : null}
          {isOwn ? (
            <div className="message-menu-wrap">
              <button
                className="message-menu-trigger"
                type="button"
                aria-label="Mesaj secenekleri"
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
              >
                <ChevronDown size={16} />
              </button>
              {isMenuOpen ? (
                <div className="message-menu">
                  <div className="reaction-picker" aria-label="Tepki ver">
                    {reactionOptions.map((reaction) => (
                      <button
                        key={reaction.type}
                        className={
                          message.reactions?.some((item) => item.type === reaction.type && item.userId === currentUserId)
                            ? "active"
                            : undefined
                        }
                        type="button"
                        title={reaction.label}
                        onClick={() => {
                          onReact(message, reaction.type);
                          setIsMenuOpen(false);
                        }}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onPin(message);
                      setIsMenuOpen(false);
                    }}
                  >
                    {message.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                    <span>{message.isPinned ? "Sabiti kaldir" : "Sabitle"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onReply(message);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Reply size={15} />
                    <span>Yanitla</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onForward(message);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Forward size={15} />
                    <span>Ilet</span>
                  </button>
                  <button
                    type="button"
                    disabled={!message.content}
                    onClick={() => {
                      setIsEditing(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Pencil size={15} />
                    <span>Duzenle</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPin(message);
                      setIsMenuOpen(false);
                    }}
                  >
                    {message.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                    <span>{message.isPinned ? "Sabiti kaldir" : "Sabitle"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(message);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Trash2 size={15} />
                    <span>Sil</span>
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="message-menu-wrap">
              <button
                className="message-menu-trigger"
                type="button"
                aria-label="Mesaj secenekleri"
                onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
              >
                <ChevronDown size={16} />
              </button>
              {isMenuOpen ? (
                <div className="message-menu">
                  <div className="reaction-picker" aria-label="Tepki ver">
                    {reactionOptions.map((reaction) => (
                      <button
                        key={reaction.type}
                        className={
                          message.reactions?.some((item) => item.type === reaction.type && item.userId === currentUserId)
                            ? "active"
                            : undefined
                        }
                        type="button"
                        title={reaction.label}
                        onClick={() => {
                          onReact(message, reaction.type);
                          setIsMenuOpen(false);
                        }}
                      >
                        {reaction.emoji}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onReply(message);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Reply size={15} />
                    <span>Yanitla</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onForward(message);
                      setIsMenuOpen(false);
                    }}
                  >
                    <Forward size={15} />
                    <span>Ilet</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
      {attachmentUrl ? (
        isImage ? (
          <button className="message-image-preview" type="button" onClick={() => onOpenImage(message)}>
            <img className="message-image" src={attachmentUrl} alt={message.attachmentName ?? "Ek"} />
          </button>
        ) : isPdf ? (
          <div className="pdf-preview">
            <div className="pdf-preview-top">
              <FileText size={22} />
              <div>
                <strong>{message.attachmentName ?? "PDF belgesi"}</strong>
                <span>{formatFileSize(message.attachmentSize)} PDF</span>
              </div>
            </div>
            <iframe title={message.attachmentName ?? "PDF onizleme"} src={attachmentUrl} />
            <div className="attachment-links">
              <a href={attachmentUrl} target="_blank" rel="noreferrer">
                <ExternalLink size={15} />
                <span>Ac</span>
              </a>
              <a href={attachmentUrl} download={message.attachmentName ?? true}>
                <Download size={15} />
                <span>Indir</span>
              </a>
            </div>
          </div>
        ) : (
          <a className="message-attachment" href={attachmentUrl} target="_blank" rel="noreferrer">
            <FileText size={18} />
            <span>
              {message.attachmentName ?? "Ek"}
              {message.attachmentSize ? <small>{formatFileSize(message.attachmentSize)}</small> : null}
            </span>
            <Download size={16} />
          </a>
        )
      ) : null}
      {reactionCounts.length > 0 ? (
        <div className="message-reactions">
          {reactionCounts.map((reaction) => (
            <span key={reaction.type}>
              {reactionEmojiByType[reaction.type]} {reaction.count}
            </span>
          ))}
        </div>
      ) : null}
      {message.isPinned ? <span className="message-pin-label">Sabitlendi</span> : null}
      <div className="message-meta">
        <time>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {message.editedAt ? " duzenlendi" : ""}
        </time>
        {isOwn ? (
          <span className="message-status" title={message.readByOthers ? "Okundu" : "Gonderildi"}>
            {message.readByOthers ? <CheckCheck size={15} /> : <Check size={15} />}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function getReactionCounts(reactions: NonNullable<Message["reactions"]>) {
  const counts = reactions.reduce<Record<MessageReactionType, number>>((items, reaction) => {
    items[reaction.type] = (items[reaction.type] ?? 0) + 1;
    return items;
  }, {} as Record<MessageReactionType, number>);

  return reactionOptions
    .map((reaction) => ({ type: reaction.type, count: counts[reaction.type] ?? 0 }))
    .filter((reaction) => reaction.count > 0);
}

function getAttachmentUrl(url: string) {
  if (url.startsWith("http")) return url;

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
  const assetBaseUrl = apiUrl.replace(/\/api\/?$/, "");
  return `${assetBaseUrl}${url}`;
}

function formatFileSize(size?: number | null) {
  if (!size) return "";

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function resolveAttachmentUrl(url: string) {
  return getAttachmentUrl(url);
}
