import { useEffect, useMemo, useRef, useState } from "react";
import {
  getChatById,
  getUserProfile,
  listenChatMessages,
  listenUserChats,
  markChatRead,
  sendChatMessage,
} from "../firebase";

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
      JSON.stringify({ chats: Array.isArray(chats) ? chats.slice(0, 10) : [], cachedAt: Date.now() })
    );
  } catch {
    // ignore cache errors
  }
}


function getProfileDisplayName(profile, fallback = "Пользователь") {
  if (!profile) return fallback;
  return (
    profile.displayName ||
    profile.firstName ||
    (profile.username ? `@${profile.username}` : "") ||
    fallback
  );
}

function getChatOpponentId(chat, userId) {
  if (!chat || !userId) return "";
  const current = String(userId);
  if (String(chat.buyerId) === current) return String(chat.sellerId || "");
  if (String(chat.sellerId) === current) return String(chat.buyerId || "");
  return "";
}

function getChatDisplayTitle(chat, userId, profiles = {}) {
  if (!chat || !userId) return "Диалог";

  const current = String(userId);
  if (String(chat.buyerId) === current) {
    return chat.sellerName || getProfileDisplayName(profiles[String(chat.sellerId)], "Продавец");
  }

  if (String(chat.sellerId) === current) {
    return chat.buyerName || getProfileDisplayName(profiles[String(chat.buyerId)], "Покупатель");
  }

  return chat.adTitle || "Диалог";
}

function getUnreadCount(chat, userId) {
  if (!chat || !userId) return 0;
  const normalizedUserId = String(userId);
  if (String(chat.buyerId) === normalizedUserId) return Number(chat.unreadByBuyer || 0);
  if (String(chat.sellerId) === normalizedUserId) return Number(chat.unreadBySeller || 0);
  return 0;
}

function ChatMessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <rect x="3.5" y="5" width="17" height="13" rx="2.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.8 6.6L12 12.1L19.2 6.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function ChatListItem({ chat, userId, participantProfiles, onClick }) {
  const unread = getUnreadCount(chat, userId);
  const title = getChatDisplayTitle(chat, userId, participantProfiles);

  return (
    <button type="button" className="chat-list-item" onClick={onClick}>
      {chat.adImage ? (
        <img className="chat-list-image" src={chat.adImage} alt="" />
      ) : (
        <ChatPlaceholderImage />
      )}

      <span className="chat-list-body">
        <span className="chat-list-topline">
          <span className="chat-list-title">{title}</span>
          <span className="chat-list-time">{formatChatTime(chat.lastMessageAt || chat.updatedAt)}</span>
        </span>
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

function ChatDialog({ chatId, chat, user, participantProfiles, onBack, onOpenAd }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [openingAd, setOpeningAd] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);
  const dialogTitle = getChatDisplayTitle(chat, user?.id, participantProfiles);

  useEffect(() => {
    if (!chatId) return undefined;

    setError("");
    const unsubscribe = listenChatMessages(
      chatId,
      (items) => {
        setMessages(items);
      },
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

        {chat?.adImage ? (
          <img className="chat-header-image" src={chat.adImage} alt="" />
        ) : (
          <ChatPlaceholderImage compact />
        )}

        <div className="chat-header-text">
          <h2>{dialogTitle}</h2>
          <p>{chat?.adTitle ? chat.adTitle : "Чат по объявлению"}</p>
        </div>

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
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return undefined;

    const cached = readChatCache(user.id);
    if (cached.length > 0) {
      setChats(cached);
    }

    const unsubscribe = listenUserChats(
      user.id,
      (items) => {
        setChats(items);
        writeChatCache(user.id, items);
        setError("");
      },
      () => setError("Не удалось загрузить чаты")
    );

    return unsubscribe;
  }, [user?.id]);

  useEffect(() => {
    if (!selectedChatId) {
      setFallbackChat(null);
      return;
    }

    if (chats.some((chat) => chat.id === selectedChatId)) return;

    getChatById(selectedChatId)
      .then((chat) => setFallbackChat(chat))
      .catch(() => setFallbackChat(null));
  }, [selectedChatId, chats]);


  useEffect(() => {
    if (!user?.id) return;

    const activeChats = [...chats, fallbackChat].filter(Boolean);
    const idsToLoad = [
      ...new Set(
        activeChats
          .map((chat) => getChatOpponentId(chat, user.id))
          .filter((id) => id && !participantProfiles[id])
      ),
    ];

    if (idsToLoad.length === 0) return;

    let cancelled = false;

    Promise.all(
      idsToLoad.map(async (id) => {
        try {
          const profile = await getUserProfile(id);
          return [id, profile];
        } catch {
          return [id, null];
        }
      })
    ).then((items) => {
      if (cancelled) return;
      setParticipantProfiles((current) => {
        const next = { ...current };
        items.forEach(([id, profile]) => {
          next[id] = profile || { displayName: String(id) };
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [chats, fallbackChat, user?.id, participantProfiles]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) || fallbackChat,
    [chats, fallbackChat, selectedChatId]
  );

  if (selectedChatId) {
    return (
      <ChatDialog
        chatId={selectedChatId}
        chat={activeChat}
        user={user}
        participantProfiles={participantProfiles}
        onBack={onBackToList}
        onOpenAd={onOpenAd}
      />
    );
  }

  return (
    <div className="chats-page page-enter">
      <section className="chats-hero">
        <div className="chats-hero-icon"><ChatMessageIcon /></div>
        <div>
          <h1>Чаты</h1>
          <p>Переписка по объявлениям внутри приложения</p>
        </div>
      </section>

      {error && <div className="chat-error">{error}</div>}

      <section className="chat-list-card">
        {chats.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon"><ChatMessageIcon /></div>
            <h3>Диалогов пока нет</h3>
            <p>Откройте объявление и нажмите «Написать», чтобы начать переписку с продавцом.</p>
          </div>
        ) : (
          chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              userId={user.id}
              participantProfiles={participantProfiles}
              onClick={() => onSelectChat?.(chat.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}
