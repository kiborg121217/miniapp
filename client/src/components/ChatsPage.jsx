import { useEffect, useMemo, useRef, useState } from "react";
import {
  getChatById,
  getUserProfile,
  listenChatMessages,
  listenUserChats,
  markChatRead,
  sendChatMessage,
} from "../firebase";
import { logDebugEvent } from "../debugLog";

function formatChatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return "Вчера";

  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

const CHAT_CACHE_PREFIX = "baraholka_user_chats_v1";
const CHAT_FILTER_STORAGE_KEY = "baraholka_chat_list_controls_v1";
const CHAT_PIN_STORAGE_PREFIX = "baraholka_pinned_chats_v1";

function readPinnedChatIds(userId) {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${CHAT_PIN_STORAGE_PREFIX}_${userId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writePinnedChatIds(userId, ids) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CHAT_PIN_STORAGE_PREFIX}_${userId}`, JSON.stringify([...new Set(ids.map(String))]));
  } catch {
    // ignore storage errors
  }
}

const QUICK_FILTERS = [
  { id: "all", label: "Все" },
  { id: "unread", label: "Непрочитанные" },
  { id: "active", label: "Активные" },
  { id: "closed", label: "Завершённые" },
];

function readChatCache(userId) {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${CHAT_CACHE_PREFIX}_${userId}`);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed?.chats) ? parsed.chats : [];
  } catch {
    return [];
  }
}

function writeChatCache(userId, chats) {
  if (!userId || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      `${CHAT_CACHE_PREFIX}_${userId}`,
      JSON.stringify({ chats: Array.isArray(chats) ? chats.slice(0, 20) : [], cachedAt: Date.now() })
    );
  } catch {
    // ignore cache errors
  }
}

function readListControls() {
  if (typeof window === "undefined") return { sort: "newest", role: "all", pinnedFirst: true };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHAT_FILTER_STORAGE_KEY) || "{}");
    return {
      sort: parsed.sort || "newest",
      role: parsed.role || "all",
      pinnedFirst: parsed.pinnedFirst !== false,
    };
  } catch {
    return { sort: "newest", role: "all", pinnedFirst: true };
  }
}

function writeListControls(value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHAT_FILTER_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function getUnreadCount(chat, userId) {
  if (!chat || !userId) return 0;
  const normalizedUserId = String(userId);
  if (String(chat.buyerId) === normalizedUserId) return Number(chat.unreadByBuyer || 0);
  if (String(chat.sellerId) === normalizedUserId) return Number(chat.unreadBySeller || 0);
  return 0;
}

function getPeerId(chat, userId) {
  if (!chat || !userId) return "";
  const normalizedUserId = String(userId);
  if (String(chat.buyerId) === normalizedUserId) return String(chat.sellerId || "");
  if (String(chat.sellerId) === normalizedUserId) return String(chat.buyerId || "");
  return "";
}

function getProfileName(profile, fallback = "Пользователь") {
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  return profile?.displayName || fullName || profile?.username || fallback;
}

function getPeerName(chat, userId, profileNames = {}) {
  const peerId = getPeerId(chat, userId);
  if (peerId && profileNames[peerId]) return profileNames[peerId];

  const normalizedUserId = String(userId || "");
  if (String(chat?.buyerId) === normalizedUserId) {
    return chat?.sellerName || "Продавец";
  }

  if (String(chat?.sellerId) === normalizedUserId) {
    return chat?.buyerName || "Покупатель";
  }

  return chat?.adTitle || "Диалог";
}

function getChatStatus(chat) {
  const raw = String(chat?.chatStatus || chat?.status || chat?.adStatus || "").toLowerCase();
  if (["closed", "done", "completed", "archived", "finished"].includes(raw)) return "closed";
  return "active";
}

function isPinnedChat(chat, userId) {
  if (!chat || !userId) return false;
  const userKey = String(userId);
  if (Array.isArray(chat.pinnedBy)) return chat.pinnedBy.map(String).includes(userKey);
  if (String(chat.buyerId) === userKey) return Boolean(chat.isPinnedByBuyer || chat.pinnedByBuyer);
  if (String(chat.sellerId) === userKey) return Boolean(chat.isPinnedBySeller || chat.pinnedBySeller);
  return Boolean(chat.isPinned || chat.pinned);
}

function getRole(chat, userId) {
  const normalizedUserId = String(userId || "");
  if (String(chat?.sellerId) === normalizedUserId) return "seller";
  if (String(chat?.buyerId) === normalizedUserId) return "buyer";
  return "all";
}

function getLastTime(chat) {
  return Number(chat?.lastMessageAt || chat?.updatedAt || chat?.createdAt || 0);
}

function normalizeSearchValue(value) {
  return String(value || "").toLowerCase().replace(/ё/g, "е").trim();
}

function ChatMessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="13" rx="2.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.8 6.6L12 12.1L19.2 6.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <circle cx="11" cy="11" r="6.3" />
      <path d="M16 16L20 20" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 7H10" />
      <path d="M14 7H20" />
      <circle cx="12" cy="7" r="2" />
      <path d="M4 17H7" />
      <path d="M11 17H20" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
      <path
        fill="#3A98FF"
        d="M509.765,496.18L405.025,306.098c-2.666-4.837-8.748-6.598-13.585-3.933c-4.837,2.666-6.598,8.748-3.933,13.585l88.067,159.825L315.75,387.508c-4.838-2.664-10.919-0.904-13.585,3.933c-2.665,4.837-0.904,10.919,3.933,13.585L496.18,509.765c3.891,2.144,8.744,1.466,11.897-1.688C511.225,504.929,511.913,500.079,509.765,496.18z"
      />
      <path
        fill="#3A98FF"
        d="M133.166,16.789L16.789,133.166c-21.062,21.063-21.059,55.151,0,76.21c21.063,21.061,55.151,21.059,76.21,0L209.376,92.999c21.062-21.062,21.059-55.149,0-76.21C188.314-4.273,154.227-4.269,133.166,16.789zM195.233,78.857L78.856,195.234c-13.245,13.247-34.685,13.242-47.925,0c-13.247-13.245-13.242-34.685,0-47.925L147.309,30.932c13.245-13.247,34.684-13.243,47.925,0C208.48,44.176,208.476,65.616,195.233,78.857z"
      />
      <path
        fill="#283954"
        d="M447.041,207.904c-27.433-27.433-68.126-37.351-104.982-26.002L200.17,85.417c-4.565-3.105-10.787-1.921-13.893,2.646s-1.921,10.787,2.646,13.893l156.052,106.115c14.477,9.843,16.448,30.451,4.045,42.854l-98.095,98.095c-12.426,12.43-33.032,10.401-42.854-4.045L101.956,188.924c-3.107-4.568-9.327-5.749-13.893-2.646c-4.567,3.105-5.752,9.325-2.646,13.893l96.484,141.888c-11.015,35.72-2.628,76.351,26.003,104.983c18.303,18.303,48.087,18.301,66.388,0l172.749-172.75C465.394,255.942,465.389,226.251,447.041,207.904zM432.898,260.149l-172.75,172.75c-10.503,10.505-27.598,10.507-38.103,0c-19.101-19.101-27.026-44.737-24.298-69.275c18.3,17.87,48.38,18.481,67.321-0.46l98.095-98.095c18.899-18.899,18.359-48.972,0.485-67.297c25.207-2.739,50.898,5.921,69.251,24.275C443.433,232.581,443.432,249.617,432.898,260.149z"
      />
    </svg>
  );
}


function ChatPlaceholderImage({ compact = false }) {
  return (
    <div className={`chat-list-image chat-list-image-placeholder ${compact ? "compact" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <rect x="4" y="5" width="16" height="14" rx="3" />
        <path d="M7.5 15L10.2 12.4L12.7 14.5L14.4 12.8L17 15.5" />
        <circle cx="9" cy="9" r="1.1" />
      </svg>
    </div>
  );
}

function ChatListItem({ chat, userId, peerName, onClick, pinnedIds = [] }) {
  const unread = getUnreadCount(chat, userId);
  const adTitle = chat.adTitle || "Объявление";
  const pinned = isPinnedChat(chat, userId) || pinnedIds.map(String).includes(String(chat.id));

  return (
    <button type="button" className={`chat-list-item ${unread > 0 ? "has-unread" : ""}`} onClick={onClick}>
      <span className="chat-list-image-wrap">
        {chat.adImage ? (
          <img className="chat-list-image" src={chat.adImage} alt="" loading="lazy" />
        ) : (
          <ChatPlaceholderImage />
        )}
      </span>

      <span className="chat-list-body">
        <span className="chat-list-topline">
          <span className="chat-list-title chat-list-peer-name">
            {peerName}
            {pinned && <span className="chat-pin-badge"><PinIcon /></span>}
          </span>
          <span className="chat-list-time">{formatChatTime(chat.lastMessageAt || chat.updatedAt)}</span>
        </span>
        <span className="chat-list-ad-title">{adTitle}</span>
        <span className="chat-list-subline">
          <span className="chat-list-message">{chat.lastMessage || "Диалог создан. Напишите первое сообщение."}</span>
          {unread > 0 && <span className="chat-unread-badge">{unread > 99 ? "99+" : unread}</span>}
        </span>
      </span>
    </button>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 11.2L19.1 4.8C19.9 4.45 20.72 5.28 20.36 6.08L13.86 20.6C13.5 21.4 12.34 21.32 12.1 20.48L10.48 14.8L4.82 13.12C4 12.88 3.7 11.55 4.5 11.2Z" />
      <path d="M10.7 14.45L14.7 10.45" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15.5 5.5L9 12L15.5 18.5" />
    </svg>
  );
}

function SettingsSheet({ draft, onChange, onClose, onReset, onApply, closing = false }) {
  return (
    <div className={`chat-settings-backdrop ${closing ? "is-closing" : ""}`} onClick={onClose}>
      <section className={`chat-settings-sheet ${closing ? "is-closing" : ""}`} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="chat-settings-handle" onClick={onClose} aria-label="Закрыть настройки" />
        <div className="chat-settings-head">
          <div>
            <h2>Настроить список</h2>
            <p>Сортировка и отображение диалогов</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть настройки">×</button>
        </div>

        <div className="chat-settings-group">
          <h3>Сортировка</h3>
          <div className="chat-radio-grid">
            {[
              ["newest", "Новые сверху"],
              ["unread", "Непрочитанные"],
              ["oldest", "Старые сверху"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={draft.sort === value ? "active" : ""}
                onClick={() => onChange({ ...draft, sort: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="chat-settings-group">
          <h3>Моя роль</h3>
          <div className="chat-radio-grid">
            {[
              ["all", "Все"],
              ["seller", "Я продавец"],
              ["buyer", "Я покупатель"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={draft.role === value ? "active" : ""}
                onClick={() => onChange({ ...draft, role: value })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="chat-switch-row">
          <span>
            <strong>Закреплённые сверху</strong>
            <small>Показывать закреплённые диалоги первыми</small>
          </span>
          <input
            type="checkbox"
            checked={draft.pinnedFirst}
            onChange={(event) => onChange({ ...draft, pinnedFirst: event.target.checked })}
          />
        </label>

        <div className="chat-settings-actions">
          <button type="button" className="chat-settings-reset" onClick={onReset}>Сбросить</button>
          <button type="button" className="chat-settings-apply" onClick={onApply}>Применить</button>
        </div>
      </section>
    </div>
  );
}

function ChatDialog({ chatId, chat, user, peerName, onBack, onOpenAd, isPinned, onTogglePin }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [openingAd, setOpeningAd] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!chatId) return undefined;

    setError("");
    const unsubscribe = listenChatMessages(
      chatId,
      (items) => setMessages(items),
      () => setError("Не удалось загрузить сообщения")
    );

    return unsubscribe;
  }, [chatId]);

  useEffect(() => {
    const node = messagesRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (!chatId || !user?.id) return;
    markChatRead(chatId, user.id).catch(() => {});
  }, [chatId, user?.id, messages.length]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 118)}px`;
  }, [text]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;

    try {
      setSending(true);
      setError("");
      setText("");
      await sendChatMessage(chatId, user.id, clean);
    } catch (err) {
      console.error("Ошибка отправки сообщения:", err);
      setText(clean);
      setError(err.message || "Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  };

  const handleOpenAd = async () => {
    if (!chat?.adId || openingAd) return;

    try {
      setOpeningAd(true);
      setError("");
      await onOpenAd?.(chat.adId);
    } catch (err) {
      console.error("Ошибка открытия объявления из чата:", err);
      setError(err.message || "Не удалось открыть объявление");
    } finally {
      setOpeningAd(false);
    }
  };

  return (
    <div className="chat-dialog-page page-enter" role="region" aria-label="Диалог по объявлению">
      <section className="chat-dialog-header">
        <button type="button" className="chat-header-back" onClick={onBack} aria-label="Назад к списку чатов">
          <BackIcon />
        </button>

        <button
          type="button"
          className="chat-header-ad-link"
          onClick={handleOpenAd}
          disabled={!chat?.adId || openingAd}
          aria-label="Открыть объявление"
        >
          {chat?.adImage ? (
            <img className="chat-header-image" src={chat.adImage} alt="" />
          ) : (
            <ChatPlaceholderImage compact />
          )}
          <span className="chat-header-text">
            <h2>{peerName || "Диалог"}</h2>
            <p>{chat?.adTitle || "Чат по объявлению"}</p>
          </span>
        </button>

        <button
          type="button"
          className={`chat-pin-action ${isPinned ? "active" : ""}`}
          onClick={onTogglePin}
          aria-label={isPinned ? "Открепить чат" : "Закрепить чат"}
          title={isPinned ? "Открепить" : "Закрепить"}
        >
          <PinIcon />
        </button>
      </section>

      <section className="chat-messages-card" ref={messagesRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state chat-empty-state-dialog">
            <div className="chat-empty-icon"><ChatMessageIcon /></div>
            <h3>Сообщений пока нет</h3>
            <p>Напишите первое сообщение по объявлению.</p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((message) => {
              const isOwn = String(message.senderId) === String(user.id);
              return (
                <div key={message.id} className={`chat-message-row ${isOwn ? "own" : "other"}`}>
                  <div className="chat-message-bubble">
                    <p>{message.text}</p>
                    <span>{formatChatTime(message.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <form className="chat-compose" onSubmit={handleSubmit}>
        {error && <div className="chat-error chat-compose-error">{error}</div>}
        <div className="chat-compose-row">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Написать сообщение..."
            rows={1}
            maxLength={1200}
            enterKeyHint="send"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit(event);
              }
            }}
          />
          <button type="submit" aria-label="Отправить сообщение" disabled={!text.trim() || sending}>
            {sending ? "…" : <SendIcon />}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function ChatsPage({ user, selectedChatId, onSelectChat, onBackToList, onOpenAd }) {
  const [chats, setChats] = useState(() => readChatCache(user?.id));
  const [fallbackChat, setFallbackChat] = useState(null);
  const [profileNames, setProfileNames] = useState({});
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [controls, setControls] = useState(readListControls);
  const [draftControls, setDraftControls] = useState(() => readListControls());
  const [showSettings, setShowSettings] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => readPinnedChatIds(user?.id));

  useEffect(() => {
    if (!user?.id) return undefined;

    logDebugEvent("chats_page_open", { selectedChatId: selectedChatId || null });

    const cached = readChatCache(user.id);
    if (cached.length > 0) setChats(cached);

    const unsubscribe = listenUserChats(
      user.id,
      (items) => {
        logDebugEvent("chats_snapshot", { count: items.length });
        setChats(items);
        writeChatCache(user.id, items);
        setError("");
      },
      (listenerError) => {
        logDebugEvent("chats_snapshot_error", listenerError);
        setError("Не удалось загрузить чаты");
      }
    );

    return unsubscribe;
  }, [user?.id, selectedChatId]);

  useEffect(() => {
    setPinnedIds(readPinnedChatIds(user?.id));
  }, [user?.id]);

  useEffect(() => {
    if (!selectedChatId) {
      setFallbackChat(null);
      return;
    }

    if (chats.some((chat) => chat.id === selectedChatId)) return;

    logDebugEvent("chat_fallback_load_start", { selectedChatId });
    getChatById(selectedChatId)
      .then((chat) => {
        logDebugEvent("chat_fallback_load_done", { found: !!chat });
        setFallbackChat(chat);
      })
      .catch((fallbackError) => {
        logDebugEvent("chat_fallback_load_error", fallbackError);
        setFallbackChat(null);
      });
  }, [selectedChatId, chats]);

  useEffect(() => {
    if (!user?.id) return;

    const allChats = fallbackChat ? [...chats, fallbackChat] : chats;
    const ids = [...new Set(allChats.map((chat) => getPeerId(chat, user.id)).filter(Boolean))]
      .filter((id) => !profileNames[id]);

    if (ids.length === 0) return;

    let cancelled = false;

    Promise.all(
      ids.slice(0, 30).map(async (id) => {
        try {
          const profile = await getUserProfile(id);
          return [id, getProfileName(profile, id)];
        } catch {
          return [id, null];
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setProfileNames((prev) => {
        const next = { ...prev };
        entries.forEach(([id, name]) => {
          if (name) next[id] = name;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [chats, fallbackChat, profileNames, user?.id]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) || fallbackChat,
    [chats, fallbackChat, selectedChatId]
  );

  const activePeerName = activeChat ? getPeerName(activeChat, user?.id, profileNames) : "Диалог";
  const activeChatPinned = Boolean(activeChat?.id && pinnedIds.map(String).includes(String(activeChat.id)));

  const handleToggleActivePin = () => {
    if (!activeChat?.id || !user?.id) return;
    setPinnedIds((prev) => {
      const id = String(activeChat.id);
      const hasPinned = prev.map(String).includes(id);
      const next = hasPinned ? prev.filter((item) => String(item) !== id) : [id, ...prev.map(String)];
      writePinnedChatIds(user.id, next);
      return next;
    });
  };

  const visibleChats = useMemo(() => {
    const term = normalizeSearchValue(searchQuery);
    const withMeta = chats.map((chat) => {
      const peerName = getPeerName(chat, user?.id, profileNames);
      const unread = getUnreadCount(chat, user?.id);
      return { chat, peerName, unread };
    });

    const filtered = withMeta.filter(({ chat, peerName, unread }) => {
      if (term) {
        const haystack = normalizeSearchValue([
          peerName,
          chat?.adTitle,
          chat?.lastMessage,
          chat?.buyerName,
          chat?.sellerName,
        ].filter(Boolean).join(" "));

        if (!haystack.includes(term)) return false;
      }

      if (quickFilter === "unread" && unread <= 0) return false;
      if (quickFilter === "active" && getChatStatus(chat) !== "active") return false;
      if (quickFilter === "closed" && getChatStatus(chat) !== "closed") return false;
      if (controls.role !== "all" && getRole(chat, user?.id) !== controls.role) return false;

      return true;
    });

    filtered.sort((a, b) => {
      if (controls.pinnedFirst) {
        const aPinned = isPinnedChat(a.chat, user?.id) || pinnedIds.map(String).includes(String(a.chat.id));
        const bPinned = isPinnedChat(b.chat, user?.id) || pinnedIds.map(String).includes(String(b.chat.id));
        const pinnedDiff = Number(bPinned) - Number(aPinned);
        if (pinnedDiff !== 0) return pinnedDiff;
      }

      if (controls.sort === "unread") {
        const unreadDiff = b.unread - a.unread;
        if (unreadDiff !== 0) return unreadDiff;
      }

      if (controls.sort === "oldest") return getLastTime(a.chat) - getLastTime(b.chat);
      return getLastTime(b.chat) - getLastTime(a.chat);
    });

    return filtered;
  }, [chats, controls, pinnedIds, profileNames, quickFilter, searchQuery, user?.id]);

  const activeFilter = QUICK_FILTERS.find((item) => item.id === quickFilter) || QUICK_FILTERS[0];
  const resultCaption = searchQuery.trim()
    ? `Найдено ${visibleChats.length}`
    : activeFilter.id === "all"
      ? `${visibleChats.length} диалогов`
      : `${activeFilter.label}: ${visibleChats.length}`;

  const closeSettings = () => {
    if (settingsClosing) return;
    setSettingsClosing(true);
    window.setTimeout(() => {
      setShowSettings(false);
      setSettingsClosing(false);
    }, 240);
  };

  const openSettings = () => {
    setDraftControls(controls);
    setSettingsClosing(false);
    setShowSettings(true);
  };

  const applySettings = () => {
    setControls(draftControls);
    writeListControls(draftControls);
    closeSettings();
  };

  const resetSettings = () => {
    const next = { sort: "newest", role: "all", pinnedFirst: true };
    setDraftControls(next);
    setControls(next);
    writeListControls(next);
    closeSettings();
  };

  if (selectedChatId) {
    return (
      <ChatDialog
        chatId={selectedChatId}
        chat={activeChat}
        user={user}
        peerName={activePeerName}
        onBack={onBackToList}
        onOpenAd={onOpenAd}
        isPinned={activeChatPinned}
        onTogglePin={handleToggleActivePin}
      />
    );
  }

  return (
    <div className="chats-page chats-page-redesign page-enter">
      <section className="chats-hero">
        <div className="chats-hero-icon"><ChatMessageIcon /></div>
        <div>
          <h1>Чаты</h1>
          <p>Переписка по объявлениям внутри приложения</p>
        </div>
      </section>

      <section className="chat-toolbar" aria-label="Поиск и фильтры чатов">
        <label className="chat-search-field">
          <span><SearchIcon /></span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по чатам, товарам и сообщениям"
          />
        </label>
        <button type="button" className="chat-filter-button" onClick={openSettings} aria-label="Настроить список чатов">
          <SlidersIcon />
        </button>
      </section>

      <div className="chat-filter-row" role="tablist" aria-label="Быстрые фильтры чатов">
        {QUICK_FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={quickFilter === item.id ? "active" : ""}
            onClick={() => setQuickFilter(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="chat-list-summary">{resultCaption}</div>

      {error && <div className="chat-error">{error}</div>}

      <section className="chat-list-card">
        {visibleChats.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon"><ChatMessageIcon /></div>
            <h3>{chats.length === 0 ? "Диалогов пока нет" : "Ничего не найдено"}</h3>
            <p>
              {chats.length === 0
                ? "Откройте объявление и нажмите «Написать», чтобы начать переписку с продавцом."
                : "Попробуйте изменить поиск или фильтры."}
            </p>
          </div>
        ) : (
          visibleChats.map(({ chat, peerName }) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              userId={user.id}
              peerName={peerName}
              pinnedIds={pinnedIds}
              onClick={() => onSelectChat?.(chat.id)}
            />
          ))
        )}
      </section>

      {showSettings && (
        <SettingsSheet
          draft={draftControls}
          onChange={setDraftControls}
          onClose={closeSettings}
          onReset={resetSettings}
          onApply={applySettings}
          closing={settingsClosing}
        />
      )}
    </div>
  );
}
