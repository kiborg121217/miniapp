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

function getInitials(value) {
  const text = String(value || "").trim();
  if (!text) return "?";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function formatPrice(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return `${number.toLocaleString("ru-RU")} ₽`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L20 20" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.8 11.7L19 5.5C19.85 5.12 20.71 6 20.33 6.84L14.05 20.88C13.66 21.74 12.42 21.62 12.2 20.71L10.61 14.43L4.32 12.54C3.45 12.28 3.97 12.06 4.8 11.7Z" />
      <path d="M10.5 14.5L14.8 10.2" />
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

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 6.8C5 5.25 6.25 4 7.8 4H16.2C17.75 4 19 5.25 19 6.8V12.2C19 13.75 17.75 15 16.2 15H11L7 18.5V15H7.8C6.25 15 5 13.75 5 12.2V6.8Z" />
      <path d="M8.5 8.5H15.5" />
      <path d="M8.5 11.2H13.5" />
    </svg>
  );
}

function AvatarBadge({ name, imageUrl, className = "" }) {
  if (imageUrl) {
    return <img className={`chat-avatar-badge ${className}`.trim()} src={imageUrl} alt="" loading="lazy" />;
  }

  return <div className={`chat-avatar-badge chat-avatar-fallback ${className}`.trim()}>{getInitials(name)}</div>;
}

function ChatListItem({ chat, userId, peerName, onClick }) {
  const unread = getUnreadCount(chat, userId);

  return (
    <button type="button" className="chat-thread-item" onClick={onClick}>
      <AvatarBadge name={peerName} imageUrl={chat.adImage || ""} className="chat-thread-avatar" />

      <span className="chat-thread-content">
        <span className="chat-thread-topline">
          <span className="chat-thread-name">{peerName}</span>
          <span className="chat-thread-time">{formatChatTime(chat.lastMessageAt || chat.updatedAt)}</span>
        </span>
        <span className="chat-thread-message">{chat.lastMessage || "Диалог создан. Напишите первое сообщение."}</span>
        <span className="chat-thread-ad-title">{chat.adTitle || "Объявление"}</span>
      </span>

      {unread > 0 && <span className="chat-thread-unread">{unread > 99 ? "99+" : unread}</span>}
    </button>
  );
}

function ChatDialog({ chatId, chat, user, peerName, onBack, onOpenAd }) {
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
    <div className="chat-dialog-shell page-enter" role="region" aria-label="Диалог по объявлению">
      <section className="chat-dialog-topbar">
        <button type="button" className="chat-header-back" onClick={onBack} aria-label="Назад к списку чатов">
          <BackIcon />
        </button>

        <div className="chat-dialog-peer">
          <AvatarBadge name={peerName} imageUrl="" className="chat-dialog-peer-avatar" />
          <div className="chat-dialog-peer-text">
            <h2>{peerName || "Диалог"}</h2>
            <p>{chat?.adTitle ? `Диалог по объявлению` : "Сообщения"}</p>
          </div>
        </div>

        <button type="button" className="chat-header-more" aria-label="Меню">
          <span />
          <span />
          <span />
        </button>
      </section>

      {chat?.adId && (
        <button type="button" className="chat-dialog-product" onClick={handleOpenAd} disabled={openingAd}>
          {chat?.adImage ? (
            <img className="chat-dialog-product-image" src={chat.adImage} alt="" loading="lazy" />
          ) : (
            <div className="chat-dialog-product-image chat-dialog-product-placeholder">
              <ChatBubbleIcon />
            </div>
          )}

          <span className="chat-dialog-product-content">
            <span className="chat-dialog-product-label">Объявление</span>
            <strong>{chat?.adTitle || "Открыть объявление"}</strong>
            {formatPrice(chat?.adPrice) && <span>{formatPrice(chat?.adPrice)}</span>}
          </span>

          <span className="chat-dialog-product-arrow">›</span>
        </button>
      )}

      <section className="chat-dialog-messages" ref={messagesRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state chat-empty-state-dialog">
            <div className="chat-empty-icon"><ChatBubbleIcon /></div>
            <h3>Сообщений пока нет</h3>
            <p>Напишите первое сообщение по объявлению.</p>
          </div>
        ) : (
          <div className="chat-messages-list">
            {messages.map((message) => {
              const isOwn = String(message.senderId) === String(user.id);
              return (
                <div key={message.id} className={`chat-message-row ${isOwn ? "own" : "other"}`}>
                  {!isOwn && <AvatarBadge name={peerName} imageUrl="" className="chat-message-avatar" />}
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
            placeholder="Напишите сообщение..."
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
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

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

  const filteredChats = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chats;

    return chats.filter((chat) => {
      const peer = getPeerName(chat, user?.id, profileNames).toLowerCase();
      const adTitle = String(chat?.adTitle || "").toLowerCase();
      const lastMessage = String(chat?.lastMessage || "").toLowerCase();
      return peer.includes(term) || adTitle.includes(term) || lastMessage.includes(term);
    });
  }, [chats, profileNames, search, user?.id]);

  if (selectedChatId) {
    return (
      <ChatDialog
        chatId={selectedChatId}
        chat={activeChat}
        user={user}
        peerName={activePeerName}
        onBack={onBackToList}
        onOpenAd={onOpenAd}
      />
    );
  }

  return (
    <div className="chats-shell page-enter">
      <section className="chats-header">
        <div>
          <h1>Чаты</h1>
          <p>Ваши диалоги по объявлениям</p>
        </div>
      </section>

      <label className="chats-search">
        <span className="chats-search-icon"><SearchIcon /></span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по чатам"
        />
      </label>

      {error && <div className="chat-error">{error}</div>}

      <section className="chat-thread-list">
        {filteredChats.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon"><ChatBubbleIcon /></div>
            <h3>{chats.length === 0 ? "Диалогов пока нет" : "Ничего не найдено"}</h3>
            <p>
              {chats.length === 0
                ? "Откройте объявление и нажмите «Написать», чтобы начать переписку с продавцом."
                : "Попробуйте изменить запрос поиска."}
            </p>
          </div>
        ) : (
          filteredChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              userId={user.id}
              peerName={getPeerName(chat, user.id, profileNames)}
              onClick={() => onSelectChat?.(chat.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}
