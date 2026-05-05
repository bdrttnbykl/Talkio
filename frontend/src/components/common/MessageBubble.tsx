import type { Message } from "../../types/message";
import { Check, CheckCheck, ChevronDown, Download, ExternalLink, FileText, Pencil, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";

type MessageBubbleProps = {
  message: Message;
  isOwn: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onDelete: (message: Message) => void;
  onEdit: (message: Message, content: string) => void;
  onOpenImage: (message: Message) => void;
  onToggleSelect?: (messageId: string) => void;
};

export default function MessageBubble({
  message,
  isOwn,
  isSelectable = false,
  isSelected = false,
  onDelete,
  onEdit,
  onOpenImage,
  onToggleSelect
}: MessageBubbleProps) {
  const attachmentUrl = message.attachmentUrl ? getAttachmentUrl(message.attachmentUrl) : null;
  const isImage = Boolean(message.attachmentType?.startsWith("image/"));
  const isPdf = message.attachmentType === "application/pdf";
  const [isEditing, setIsEditing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [draft, setDraft] = useState(message.content);

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
    <div className={isOwn ? "message own" : "message"}>
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
          ) : null}
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
