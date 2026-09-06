import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { attachSocket } from "../services/socket";

const MAX_MSG_LEN = 2000;

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today - msgDay;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Bugun";
  if (diffDays === 1) return "Kecha";
  return d.toLocaleDateString("uz-UZ", { day: "numeric", month: "long", year: "numeric" });
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export const ChatWindow = ({ user, chatId, peerName, onBack }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(user?.id || null);
  const [peerContact, setPeerContact] = useState(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const load = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/chat/${chatId}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.data.messages || []);
        if (data.data.peer) setPeerContact(data.data.peer);
        else setPeerContact(null);
      }
    } catch {} finally { setLoading(false); }
  }, [chatId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (myId) return;
    const stored = localStorage.getItem("ustachi_user_id");
    if (stored) { setMyId(stored); return; }
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/me"), { headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.success && data.user?.id) {
          setMyId(data.user.id);
          localStorage.setItem("ustachi_user_id", data.user.id);
        }
      } catch {}
    })();
  }, [myId]);

  useEffect(() => {
    attachSocket({
      onChatNew: (p) => {
        if (p.chatId === chatId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === p.message.id)) return prev;
            return [...prev, p.message];
          });
        }
      },
    });
  }, [chatId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const t2 = text.trim();
    if (!t2 || sending) return;
    if (t2.length > MAX_MSG_LEN) return;
    setText("");
    setSending(true);
    try {
      const res = await fetch(apiUrl(`/api/chat/${chatId}/messages`), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ text: t2 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages((prev) => prev.some((m) => m.id === data.data.id) ? prev : [...prev, data.data]);
      }
    } catch {} finally { setSending(false); inputRef.current?.focus(); }
  };

  const peerPhoto = peerContact?.photo || null;
  const peerPhotoSrc = peerPhoto && (peerPhoto.startsWith("data:") || peerPhoto.startsWith("http")) ? peerPhoto : (peerPhoto ? apiUrl(peerPhoto) : "");
  const peerAvatarCh = (peerContact?.avatarCh || peerName?.charAt(0) || "?").toUpperCase();

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", height: "100vh", backgroundColor: theme.bg }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%", maxWidth: "800px", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family, boxSizing: "border-box" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.surface, flexShrink: 0, boxShadow: theme.shadowSm }}>
          <button onClick={onBack} aria-label={t("back")} style={{ backgroundColor: theme.bgTertiary, border: "none", borderRadius: "50%", width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <img src={`https://api.iconify.design/lucide:chevron-left.svg?color=${encodeURIComponent(theme.text)}`} width="18" height="18" alt="" />
          </button>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", flexShrink: 0, overflow: "hidden", border: `2px solid ${theme.border}` }}>
            {peerPhotoSrc ? <img src={peerPhotoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : peerAvatarCh}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: "15px", fontWeight: "800", color: theme.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{peerName || t("chatPeer")}</h3>
          </div>
        </div>

        {/* Messages */}
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: theme.textTertiary, animation: `pulse 1.4s infinite ${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", color: theme.textTertiary }}>
              <img src="https://api.iconify.design/lucide:message-circle.svg?color=%2394a3b8" width="48" height="48" alt="" />
              <p style={{ fontSize: "14px", fontWeight: "600", margin: 0 }}>{t("greeting")}</p>
            </div>
          ) : messages.map((m, i) => {
            const isMe = myId && m.senderId === myId;
            const showDate = i === 0 || !sameDay(m.createdAt, messages[i - 1]?.createdAt);
            const showSender = i === 0 || messages[i - 1]?.senderId !== m.senderId;
            if (m.system) {
              return (
                <div key={m.id || i} style={{ maxWidth: "80%", alignSelf: "center", backgroundColor: theme.bgTertiary, color: theme.textSecondary, padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", textAlign: "center", margin: "8px 0" }}>{m.text}</div>
              );
            }
            const ts = m.createdAt ? new Date(m.createdAt) : null;
            const timeStr = ts && !isNaN(ts) ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            const senderName = isMe ? (user?.name || t("you")) : (peerContact?.name || peerName || t("chatPeer"));
            return (
              <React.Fragment key={m.id || i}>
                {showDate && (
                  <div style={{ textAlign: "center", margin: "12px 0 6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: "600", color: theme.textTertiary, backgroundColor: theme.bgSecondary, padding: "4px 12px", borderRadius: "12px" }}>{formatDateLabel(m.createdAt)}</span>
                  </div>
                )}
                <div style={{ maxWidth: "78%", alignSelf: isMe ? "flex-end" : "flex-start", display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", gap: "2px", marginBottom: showSender ? "6px" : "1px" }}>
                  {showSender && (
                    <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: theme.textSecondary, fontWeight: "700" }}>
                      {!isMe && <span style={{ width: "18px", height: "18px", borderRadius: "50%", backgroundColor: theme.bgTertiary, color: theme.textSecondary, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "8px", fontWeight: "800", overflow: "hidden", border: `1px solid ${theme.border}`, flexShrink: 0 }}>
                        {peerPhotoSrc ? <img src={peerPhotoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : peerAvatarCh}
                      </span>}
                      <span>{senderName}</span>
                    </div>
                  )}
                  <div style={{ backgroundColor: isMe ? theme.primary : theme.surface, color: isMe ? theme.textInverse : theme.text, border: isMe ? "none" : `1px solid ${theme.border}`, padding: "9px 12px", borderRadius: isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px", fontSize: "13px", lineHeight: "1.45", wordBreak: "break-word", position: "relative" }}>
                    {m.image && <img src={apiUrl(m.image)} alt="" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px", marginBottom: m.text ? "6px" : 0 }} />}
                    <span>{m.text}</span>
                    <span style={{ display: "inline-block", fontSize: "10px", color: isMe ? "rgba(255,255,255,0.6)" : theme.textTertiary, marginLeft: "8px", verticalAlign: "bottom" }}>{timeStr}</span>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Input */}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${theme.border}`, backgroundColor: theme.surface, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_MSG_LEN))} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={t("typeMessage")} maxLength={MAX_MSG_LEN}
                style={{ width: "100%", padding: "10px 14px", borderRadius: "20px", border: `1px solid ${theme.border}`, fontSize: "13px", outline: "none", backgroundColor: theme.bgSecondary, color: theme.text, boxSizing: "border-box" }} />
            </div>
            <button onClick={send} disabled={!text.trim() || sending} style={{ backgroundColor: text.trim() && !sending ? theme.primary : theme.bgTertiary, color: text.trim() && !sending ? theme.textInverse : theme.textTertiary, border: "none", borderRadius: "50%", width: "42px", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", cursor: text.trim() && !sending ? "pointer" : "default", flexShrink: 0, transition: "background-color 0.2s" }}>
              <img src={`https://api.iconify.design/lucide:send.svg?color=${encodeURIComponent(text.trim() && !sending ? "#ffffff" : theme.textTertiary)}`} width="18" height="18" alt="" />
            </button>
          </div>
          {text.length > MAX_MSG_LEN * 0.9 && (
            <div style={{ fontSize: "10px", color: text.length >= MAX_MSG_LEN ? theme.error : theme.textTertiary, textAlign: "right", marginTop: "2px" }}>{text.length}/{MAX_MSG_LEN}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
