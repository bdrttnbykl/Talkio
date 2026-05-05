import type { Conversation } from "../../types/conversation";
import {
  Ban,
  BellOff,
  CheckSquare,
  Download,
  Eraser,
  Flag,
  Heart,
  Image,
  ImageOff,
  Info,
  Images,
  ListPlus,
  MoreVertical,
  Timer,
  Trash2,
  XCircle
} from "lucide-react";
import { useState } from "react";
import Avatar from "./Avatar";

type ChatHeaderProps = {
  conversation?: Conversation;
  isBlocked: boolean;
  isFavorite: boolean;
  isListed: boolean;
  isMuted: boolean;
  onlineUserIds: string[];
  disappearingLabel: string;
  onBlock: () => void;
  onBackgroundSelect: () => void;
  onBackgroundRemove: () => void;
  onClearChat: () => void;
  onCloseChat: () => void;
  onDeleteChat: () => void;
  onExportJson: () => void;
  onExportTxt: () => void;
  onFavorite: () => void;
  onInfo: () => void;
  onList: () => void;
  onMute: () => void;
  onOpenMedia: () => void;
  onReport: () => void;
  onSelectMessages: () => void;
  onSetDisappearing: () => void;
};

export default function ChatHeader({
  conversation,
  disappearingLabel,
  isBlocked,
  isFavorite,
  isListed,
  isMuted,
  onlineUserIds,
  onBlock,
  onBackgroundSelect,
  onBackgroundRemove,
  onClearChat,
  onCloseChat,
  onDeleteChat,
  onExportJson,
  onExportTxt,
  onFavorite,
  onInfo,
  onList,
  onMute,
  onOpenMedia,
  onReport,
  onSelectMessages,
  onSetDisappearing
}: ChatHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const participant = conversation?.participants[0];
  const isGroup = Boolean(conversation?.isGroup);
  const title = isGroup ? conversation?.name ?? "Grup sohbeti" : participant?.name ?? "Bir sohbet sec";
  const onlineCount = conversation?.participants.filter((user) => onlineUserIds.includes(user.id)).length ?? 0;
  const memberCount = isGroup ? (conversation?.participants.length ?? 0) + 1 : 0;
  const status = getStatus(conversation, onlineUserIds);

  return (
    <header className="chat-header">
      {isGroup ? (
        <span className="group-avatar">{conversation?.name?.slice(0, 2).toUpperCase() ?? "GC"}</span>
      ) : (
        participant && <Avatar name={participant.name} src={participant.avatarUrl} />
      )}
      <div>
        <strong>{title}</strong>
        <span>{isGroup ? `${memberCount} uye, ${onlineCount} cevrimici` : status}</span>
      </div>
      {conversation ? (
        <div className="chat-menu-wrap">
          <button
            className="chat-menu-trigger"
            type="button"
            aria-label="Open chat menu"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
          >
            <MoreVertical size={20} />
          </button>
          {isMenuOpen ? (
            <div className="chat-menu">
              <button type="button" onClick={() => runAction(onInfo, setIsMenuOpen)}>
                <Info size={18} />
                <span>{isGroup ? "Grup bilgisi" : "Kisi bilgisi"}</span>
              </button>
              <button type="button" onClick={() => runAction(onSelectMessages, setIsMenuOpen)}>
                <CheckSquare size={18} />
                <span>Mesaj sec</span>
              </button>
              <button type="button" onClick={() => runAction(onOpenMedia, setIsMenuOpen)}>
                <Images size={18} />
                <span>Medya ve dosyalar</span>
              </button>
              <button type="button" onClick={() => runAction(onMute, setIsMenuOpen)}>
                <BellOff size={18} />
                <span>{isMuted ? "Bildirimleri ac" : "Bildirimleri sessize al"}</span>
              </button>
              <button type="button" onClick={() => runAction(onSetDisappearing, setIsMenuOpen)}>
                <Timer size={18} />
                <span>Sureli mesajlar: {disappearingLabel}</span>
              </button>
              <button type="button" onClick={() => runAction(onExportTxt, setIsMenuOpen)}>
                <Download size={18} />
                <span>Sohbeti TXT indir</span>
              </button>
              <button type="button" onClick={() => runAction(onExportJson, setIsMenuOpen)}>
                <Download size={18} />
                <span>Sohbeti JSON indir</span>
              </button>
              <button type="button" onClick={() => runAction(onBackgroundSelect, setIsMenuOpen)}>
                <Image size={18} />
                <span>{conversation.chatBackgroundUrl ? "Arka plan degistir" : "Arka plan ekle"}</span>
              </button>
              {conversation.chatBackgroundUrl ? (
                <button type="button" onClick={() => runAction(onBackgroundRemove, setIsMenuOpen)}>
                  <ImageOff size={18} />
                  <span>Arka plani kaldir</span>
                </button>
              ) : null}
              <button type="button" onClick={() => runAction(onFavorite, setIsMenuOpen)}>
                <Heart size={18} />
                <span>{isFavorite ? "Favorilerden kaldir" : "Favorilere ekle"}</span>
              </button>
              <button type="button" onClick={() => runAction(onList, setIsMenuOpen)}>
                <ListPlus size={18} />
                <span>{isListed ? "Listeden kaldir" : "Listeye ekle"}</span>
              </button>
              <button type="button" onClick={() => runAction(onCloseChat, setIsMenuOpen)}>
                <XCircle size={18} />
                <span>Sohbeti kapat</span>
              </button>
              <hr />
              <button type="button" onClick={() => runAction(onReport, setIsMenuOpen)}>
                <Flag size={18} />
                <span>Sikayet et</span>
              </button>
              <button type="button" onClick={() => runAction(onBlock, setIsMenuOpen)}>
                <Ban size={18} />
                <span>{isBlocked ? "Engeli kaldir" : "Engelle"}</span>
              </button>
              <button type="button" onClick={() => runAction(onClearChat, setIsMenuOpen)}>
                <Eraser size={18} />
                <span>Sohbeti temizle</span>
              </button>
              <button type="button" onClick={() => runAction(onDeleteChat, setIsMenuOpen)}>
                <Trash2 size={18} />
                <span>Sohbeti sil</span>
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}

function runAction(action: () => void, setIsMenuOpen: (isOpen: boolean) => void) {
  action();
  setIsMenuOpen(false);
}

function getStatus(conversation: Conversation | undefined, onlineUserIds: string[]) {
  const participant = conversation?.participants[0];

  if (!participant) return "Aktif sohbet yok";
  if (onlineUserIds.includes(participant.id)) return "Cevrimici";
  if (!participant.lastSeenAt) return "Cevrimdisi";

  return `Son gorulme ${new Date(participant.lastSeenAt).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}
