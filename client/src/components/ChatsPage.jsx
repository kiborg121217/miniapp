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
const CHAT_PIN_STORAGE_PREFIX = "baraholka_chat_pins_v1";

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

function readPinnedChatIds(userId) {
  if (!userId || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(`${CHAT_PIN_STORAGE_PREFIX}_${userId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writePinnedChatIds(userId, ids) {
  if (!userId || typeof window === "undefined") return;
  try {
    const normalized = [...new Set((Array.isArray(ids) ? ids : []).map(String).filter(Boolean))];
    window.localStorage.setItem(`${CHAT_PIN_STORAGE_PREFIX}_${userId}`, JSON.stringify(normalized));
  } catch {
    // ignore storage errors
  }
}

function isLocallyPinned(chatId, pinnedIds) {
  if (!chatId) return false;
  return Array.isArray(pinnedIds) && pinnedIds.map(String).includes(String(chatId));
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
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M8.4 4.8L19.2 15.6" />
      <path d="M14.4 5.9L18.1 9.6L14.5 13.2L16 18.5L15 19.5L10.5 15L6.2 19.3L4.7 17.8L9 13.5L4.5 9L5.5 8L10.8 9.5L14.4 5.9Z" />
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

function ChatListItem({ chat, userId, peerName, pinned, onClick }) {
  const unread = getUnreadCount(chat, userId);
  const adTitle = chat.adTitle || "Объявление";
  const isPinned = Boolean(pinned);

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
            {isPinned && <span className="chat-pin-badge" title="Закреплён"><PinIcon /></span>}
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

function SettingsSheet({ draft, onChange, onClose, onReset, onApply }) {
  const [isClosing, setIsClosing] = useState(false);

  const requestClose = () => {
    setIsClosing(true);
    window.setTimeout(onClose, 180);
  };

  const requestApply = () => {
    setIsClosing(true);
    window.setTimeout(onApply, 160);
  };

  const requestReset = () => {
    setIsClosing(true);
    window.setTimeout(onReset, 160);
  };

  return (
    <div className={`chat-settings-backdrop ${isClosing ? "is-closing" : ""}`} onClick={requestClose}>
      <section className="chat-settings-sheet" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="chat-settings-handle" onClick={requestClose} aria-label="Закрыть настройки" />
        <div className="chat-settings-head">
          <div>
            <h2>Настроить список</h2>
            <p>Сортировка и отображение диалогов</p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Закрыть настройки">×</button>
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
            <small>Закрепить чат можно внутри диалога</small>
          </span>
          <input
            type="checkbox"
            checked={draft.pinnedFirst}
            onChange={(event) => onChange({ ...draft, pinnedFirst: event.target.checked })}
          />
        </label>

        <div className="chat-settings-actions">
          <button type="button" className="chat-settings-reset" onClick={requestReset}>Сбросить</button>
          <button type="button" className="chat-settings-apply" onClick={requestApply}>Применить</button>
        </div>
      </section>
    </div>
  );
}

function ChatDialog({ chatId, chat, user, peerName, pinned, onTogglePin, onBack, onOpenAd }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [openingAd, setOpeningAd] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

  const handleInputFocus = () => document.body.classList.add("chat-keyboard-mode");
  const handleInputBlur = () => {
    window.setTimeout(() => document.body.classList.remove("chat-keyboard-mode"), 120);
  };

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

  useEffect(() => () => {
    document.body.classList.remove("chat-keyboard-mode");
  }, []);

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

        {chat?.adImage ? (
          <img className="chat-header-image" src={chat.adImage} alt="" />
        ) : (
          <ChatPlaceholderImage compact />
        )}

        <div className="chat-header-text">
          <h2>{peerName || "Диалог"}</h2>
          <p>{chat?.adTitle || "Чат по объявлению"}</p>
        </div>

        <button
          type="button"
          className={`chat-pin-action ${pinned ? "active" : ""}`}
          onClick={() => onTogglePin?.(chatId)}
          aria-label={pinned ? "Открепить чат" : "Закрепить чат"}
          title={pinned ? "Открепить" : "Закрепить"}
        >
          <PinIcon />
        </button>

        {chat?.adId && (
          <button type="button" className="chat-open-ad-btn" onClick={handleOpenAd} disabled={openingAd}>
            {openingAd ? "Открываем…" : "Объявление"}
          </button>
        )}
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
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
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
  const [pinnedIds, setPinnedIds] = useState(() => readPinnedChatIds(user?.id));

  const handleSearchFocus = () => document.body.classList.add("chat-keyboard-mode");
  const handleSearchBlur = () => {
    window.setTimeout(() => document.body.classList.remove("chat-keyboard-mode"), 120);
  };

  useEffect(() => {
    setPinnedIds(readPinnedChatIds(user?.id));
  }, [user?.id]);

  const toggleChatPin = (chatIdToToggle) => {
    if (!user?.id || !chatIdToToggle) return;
    setPinnedIds((current) => {
      const id = String(chatIdToToggle);
      const exists = current.map(String).includes(id);
      const next = exists ? current.filter((item) => String(item) !== id) : [id, ...current];
      writePinnedChatIds(user.id, next);
      return next;
    });
  };

  useEffect(() => () => {
    document.body.classList.remove("chat-keyboard-mode");
  }, []);

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
        const pinnedDiff = Number(isPinnedChat(b.chat, user?.id) || isLocallyPinned(b.chat.id, pinnedIds)) - Number(isPinnedChat(a.chat, user?.id) || isLocallyPinned(a.chat.id, pinnedIds));
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

  const openSettings = () => {
    setDraftControls(controls);
    setShowSettings(true);
  };

  const applySettings = () => {
    setControls(draftControls);
    writeListControls(draftControls);
    setShowSettings(false);
  };

  const resetSettings = () => {
    const next = { sort: "newest", role: "all", pinnedFirst: true };
    setDraftControls(next);
    setControls(next);
    writeListControls(next);
    setShowSettings(false);
  };

  if (selectedChatId) {
    return (
      <ChatDialog
        chatId={selectedChatId}
        chat={activeChat}
        user={user}
        peerName={activePeerName}
        pinned={isPinnedChat(activeChat, user?.id) || isLocallyPinned(activeChat?.id, pinnedIds)}
        onTogglePin={toggleChatPin}
        onBack={onBackToList}
        onOpenAd={onOpenAd}
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
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
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
              pinned={isPinnedChat(chat, user.id) || isLocallyPinned(chat.id, pinnedIds)}
              onClick={() => onSelectChat?.(chat.id)}
            />
          ))
        )}
      </section>

      {showSettings && (
        <SettingsSheet
          draft={draftControls}
          onChange={setDraftControls}
          onClose={() => setShowSettings(false)}
          onReset={resetSettings}
          onApply={applySettings}
        />
      )}
    </div>
  );
}
