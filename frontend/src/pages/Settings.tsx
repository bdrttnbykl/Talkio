import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, Camera, Eye, Image, Lock, Moon, Save, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getConversations,
  removeConversationBackground,
  uploadConversationBackground
} from "../api/conversations.api";
import { updateProfile, uploadAvatar } from "../api/users.api";
import Avatar from "../components/common/Avatar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuthStore } from "../store/authStore";
import type { Conversation } from "../types/conversation";

type ThemeChoice = "system" | "light" | "dark";

const privacyDefaults = {
  lastSeen: true,
  readReceipts: true,
  profilePhoto: true
};

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [theme, setTheme] = useState<ThemeChoice>(() => (localStorage.getItem("chatly_theme") as ThemeChoice) || "system");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [muteAll, setMuteAll] = useState(() => localStorage.getItem("chatly_mute_all") === "true");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [privacy, setPrivacy] = useState(() => readPrivacySettings());
  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  useEffect(() => {
    getConversations()
      .then((items) => {
        setConversations(items);
        setSelectedConversationId(items[0]?.id ?? "");
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleProfileSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const updatedUser = await updateProfile(name.trim(), email.trim());
    updateUser(updatedUser);
    setProfileMessage("Profil kaydedildi.");
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file?.type.startsWith("image/")) {
      updateUser(await uploadAvatar(file));
    }
    event.target.value = "";
  };

  const handleThemeChange = (nextTheme: ThemeChoice) => {
    setTheme(nextTheme);
    localStorage.setItem("chatly_theme", nextTheme);
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(await Notification.requestPermission());
  };

  const handleMuteAllChange = (enabled: boolean) => {
    setMuteAll(enabled);
    localStorage.setItem("chatly_mute_all", String(enabled));
  };

  const handleBackgroundChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (selectedConversationId && file?.type.startsWith("image/")) {
      const updatedConversation = await uploadConversationBackground(selectedConversationId, file);
      setConversations((items) => items.map((item) => (item.id === updatedConversation.id ? updatedConversation : item)));
    }
    event.target.value = "";
  };

  const handleBackgroundRemove = async () => {
    if (!selectedConversationId) return;

    const updatedConversation = await removeConversationBackground(selectedConversationId);
    setConversations((items) => items.map((item) => (item.id === updatedConversation.id ? updatedConversation : item)));
  };

  const handlePrivacyChange = (key: keyof typeof privacy, enabled: boolean) => {
    const nextPrivacy = { ...privacy, [key]: enabled };
    setPrivacy(nextPrivacy);
    localStorage.setItem("chatly_privacy", JSON.stringify(nextPrivacy));
  };

  if (!user) return null;

  return (
    <main className="settings-page">
      <header className="settings-header">
        <button type="button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <strong>Ayarlar</strong>
          <span>Profil, tema, bildirim, arka plan ve gizlilik</span>
        </div>
      </header>

      <section className="settings-grid">
        <form className="settings-section" onSubmit={handleProfileSubmit}>
          <div className="settings-section-title">
            <Camera size={20} />
            <div>
              <h2>Profil</h2>
              <p>Ad, e-posta ve profil fotografi</p>
            </div>
          </div>
          <div className="settings-profile-row">
            <Avatar name={user.name} src={user.avatarUrl} />
            <label className="settings-file-button">
              Fotograf sec
              <input type="file" accept="image/*" onChange={handleAvatarChange} />
            </label>
          </div>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ad" />
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-posta" type="email" />
          {profileMessage ? <p className="settings-success">{profileMessage}</p> : null}
          <Button type="submit">
            <Save size={16} />
            Kaydet
          </Button>
        </form>

        <section className="settings-section">
          <div className="settings-section-title">
            <Sun size={20} />
            <div>
              <h2>Tema</h2>
              <p>Gorunum tercihi</p>
            </div>
          </div>
          <div className="segmented-control">
            <button className={theme === "system" ? "active" : ""} type="button" onClick={() => handleThemeChange("system")}>
              Sistem
            </button>
            <button className={theme === "light" ? "active" : ""} type="button" onClick={() => handleThemeChange("light")}>
              Acik
            </button>
            <button className={theme === "dark" ? "active" : ""} type="button" onClick={() => handleThemeChange("dark")}>
              <Moon size={15} />
              Koyu
            </button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">
            <Bell size={20} />
            <div>
              <h2>Bildirim</h2>
              <p>Tarayici bildirimleri ve sessiz mod</p>
            </div>
          </div>
          <button className="settings-secondary-button" type="button" onClick={handleEnableNotifications} disabled={notificationPermission === "unsupported"}>
            Bildirim izni: {notificationPermission === "granted" ? "Acik" : notificationPermission === "denied" ? "Kapali" : "Izin iste"}
          </button>
          <label className="settings-toggle">
            <input type="checkbox" checked={muteAll} onChange={(event) => handleMuteAllChange(event.target.checked)} />
            <span>Tum sohbetleri sessize al</span>
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">
            <Image size={20} />
            <div>
              <h2>Arka plan</h2>
              <p>Her sohbet icin ayri arka plan</p>
            </div>
          </div>
          <select value={selectedConversationId} onChange={(event) => setSelectedConversationId(event.target.value)}>
            {conversations.map((conversation) => (
              <option key={conversation.id} value={conversation.id}>
                {getConversationTitle(conversation)}
              </option>
            ))}
          </select>
          <div className="settings-row-actions">
            <label className="settings-file-button">
              Arka plan sec
              <input type="file" accept="image/*" onChange={handleBackgroundChange} />
            </label>
            <button type="button" disabled={!selectedConversation?.chatBackgroundUrl} onClick={handleBackgroundRemove}>
              Kaldir
            </button>
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">
            <Lock size={20} />
            <div>
              <h2>Gizlilik</h2>
              <p>Yerel gizlilik tercihleri</p>
            </div>
          </div>
          <label className="settings-toggle">
            <input type="checkbox" checked={privacy.lastSeen} onChange={(event) => handlePrivacyChange("lastSeen", event.target.checked)} />
            <span>Son gorulmeyi goster</span>
          </label>
          <label className="settings-toggle">
            <input type="checkbox" checked={privacy.readReceipts} onChange={(event) => handlePrivacyChange("readReceipts", event.target.checked)} />
            <span>Okundu bilgisini goster</span>
          </label>
          <label className="settings-toggle">
            <input type="checkbox" checked={privacy.profilePhoto} onChange={(event) => handlePrivacyChange("profilePhoto", event.target.checked)} />
            <span>Profil fotografini goster</span>
          </label>
        </section>

        <section className="settings-section">
          <div className="settings-section-title">
            <Eye size={20} />
            <div>
              <h2>Hesap</h2>
              <p>Oturum ve hesap bilgisi</p>
            </div>
          </div>
          <p className="settings-muted">Hesap olusturma: {new Date(user.createdAt).toLocaleDateString()}</p>
        </section>
      </section>
    </main>
  );
}

function readPrivacySettings() {
  try {
    return { ...privacyDefaults, ...JSON.parse(localStorage.getItem("chatly_privacy") ?? "{}") };
  } catch {
    return privacyDefaults;
  }
}

function applyTheme(theme: ThemeChoice) {
  document.documentElement.dataset.theme = theme;
}

function getConversationTitle(conversation: Conversation) {
  if (conversation.isGroup) return conversation.name ?? "Grup sohbeti";
  return conversation.participants[0]?.name ?? "Sohbet";
}
