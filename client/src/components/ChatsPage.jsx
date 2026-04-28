import { useEffect, useMemo, useRef, useState } from "react";
import {
  getChatById,
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

function getUnreadCount(chat, userId) {
  if (!chat || !userId) return 0;
  const normalizedUserId = String(userId);
  if (String(chat.buyerId) === normalizedUserId) return Number(chat.unreadByBuyer || 0);
  if (String(chat.sellerId) === normalizedUserId) return Number(chat.unreadBySeller || 0);
  return 0;
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

function ChatListItem({ chat, userId, onClick }) {
  const unread = getUnreadCount(chat, userId);

  return (
    <button type="button" className="chat-list-item" onClick={onClick}>
      {chat.adImage ? (
        <img className="chat-list-image" src={chat.adImage} alt="" />
      ) : (
        <ChatPlaceholderImage />
      )}

      <span className="chat-list-body">
        <span className="chat-list-topline">
          <span className="chat-list-title">{chat.adTitle || "Объявление"}</span>
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

function ChatDialog({ chatId, chat, user, onBack, onOpenAd }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesRef = useRef(null);
  const textareaRef = useRef(null);

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
          <h2>{chat?.adTitle || "Диалог"}</h2>
          <p>Внутренний чат по объявлению</p>
        </div>

        {chat?.adId && (
          <button type="button" className="chat-open-ad-btn" onClick={() => onOpenAd?.(chat.adId)}>
            Объявление
          </button>
        )}
      </section>

      <section className="chat-messages-card" ref={messagesRef}>
        {messages.length === 0 ? (
          <div className="chat-empty-state chat-empty-state-dialog">
            <div className="chat-empty-icon">💬</div>
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
  const [chats, setChats] = useState([]);
  const [fallbackChat, setFallbackChat] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.id) return undefined;

    const unsubscribe = listenUserChats(
      user.id,
      (items) => {
        setChats(items);
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
        onBack={onBackToList}
        onOpenAd={onOpenAd}
      />
    );
  }

  return (
    <div className="chats-page page-enter">
      <section className="chats-hero">
        <div className="chats-hero-icon">💬</div>
        <div>
          <h1>Чаты</h1>
          <p>Переписка по объявлениям внутри приложения</p>
        </div>
      </section>

      {error && <div className="chat-error">{error}</div>}

      <section className="chat-list-card">
        {chats.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">✉️</div>
            <h3>Диалогов пока нет</h3>
            <p>Откройте объявление и нажмите «Написать», чтобы начать переписку с продавцом.</p>
          </div>
        ) : (
          chats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              userId={user.id}
              onClick={() => onSelectChat?.(chat.id)}
            />
          ))
        )}
      </section>
    </div>
  );
}
