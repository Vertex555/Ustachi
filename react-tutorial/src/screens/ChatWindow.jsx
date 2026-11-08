import React, { useState, useEffect, useCallback, useRef } from "react";
import { Send } from "lucide-react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { attachSocket } from "../services/socket";
import { UIconBtn } from "../components/ui";

const MAX_MSG_LEN = 2000;

function formatDateLabel(dateStr, t, lang) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today - msgDay;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  const loc = lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-US";
  return d.toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" });
}

function sameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

export const ChatWindow = ({ user, chatId, peerName, onBack }) => {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState(user?.id ? String(user.id) : "");
  const [masterUserId, setMasterUserId] = useState(null);
  const [peerContact, setPeerContact] = useState(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Joriy ro'yxatdagi tomoshabin roli: usta (isMaster) yoki foydalanuvchi
  const meIsMaster = !!user?.isMaster;
  const peerRole = peerContact?.role === "master" ? "master" : "user";

  // Xabar tomoni QAT'IY qoida: ustani xabarlari DOIMO chapda, foydalanuvchiniki o'ngda.
  // Birinchi manba: serverdan kelgan senderRole. Zaif holatlar uchun zaxira.
  const msgIsMaster = (m) => {
    if (m.senderRole === "master") return true;
    if (m.senderRole === "user") return false;
    if (masterUserId && m.senderId && String(m.senderId) === String(masterUserId)) return true;
    if (myId && m.senderId && String(m.senderId) === String(myId)) return meIsMaster;
    return false;
  };

  const load = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/chat/${chatId}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessages(data.data.messages || []);
        if (data.data.masterUserId) setMasterUserId(String(data.data.masterUserId));
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
          setMyId(String(data.user.id));
          localStorage.setItem("ustachi_user_id", data.user.id);
        }
      } catch {}
    })();
  }, [myId]);

  useEffect(() => {
    const { detach } = attachSocket({
      onChatNew: (p) => {
        if (p.chatId === chatId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === p.message.id)) return prev;
            return [...prev, p.message];
          });
        }
      },
    });
    return detach;
  }, [chatId]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onBack(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack]);

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
    } catch {} finally { setSending(false); setTimeout(() => inputRef.current?.focus(), 0); }
  };

  const peerDisplay = peerContact?.name || peerName || t("chatPeer");
  const peerPhoto = peerContact?.photo || null;
  const peerPhotoSrc = peerPhoto && (peerPhoto.startsWith("data:") || peerPhoto.startsWith("http")) ? peerPhoto : (peerPhoto ? apiUrl(peerPhoto) : "");
  const peerAvatarCh = (peerContact?.avatarCh || peerDisplay.charAt(0) || "?").toUpperCase();
  const peerSubtitle = peerRole === "master" ? (peerContact?.rating ? `★ ${peerContact.rating}/5` : t("roleMaster")) : (peerContact?.phone || t("buyurtmachi"));

  const dayChip = (label) => (
    <div style={{ display: "flex", justifyContent: "center", margin: "10px 0 14px" }}>
      <span style={{ fontSize: "11px", fontWeight: "700", color: theme.textSecondary, backgroundColor: theme.surface, padding: "5px 14px", borderRadius: theme.radius.full, boxShadow: theme.shadowSm, letterSpacing: "0.2px" }}>{label}</span>
    </div>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", width: "100%", height: "100vh", backgroundColor: theme.bg }}>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100%", maxWidth: "100%", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family, boxSizing: "border-box" }}>

        {/* Sarlavha */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", backgroundColor: theme.surface, flexShrink: 0, boxShadow: theme.shadowSm }}>
          <UIconBtn onClick={onBack} size={38} aria-label={t("back") || "Back"}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </UIconBtn>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ width: "42px", height: "42px", borderRadius: theme.radius.full, backgroundColor: peerRole === "master" ? theme.info : theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "16px", overflow: "hidden", boxShadow: theme.shadowSm }}>
              {peerPhotoSrc ? <img src={peerPhotoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : peerAvatarCh}
            </div>
            <span style={{ position: "absolute", right: "1px", bottom: "1px", width: "11px", height: "11px", borderRadius: theme.radius.full, backgroundColor: theme.success, border: `2px solid ${theme.surface}` }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "800", color: theme.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{peerDisplay}</h3>
              <span style={{ fontSize: "9px", fontWeight: "800", letterSpacing: "0.5px", textTransform: "uppercase", padding: "3px 8px", borderRadius: theme.radius.full, backgroundColor: peerRole === "master" ? theme.infoLight : theme.primaryLight, color: peerRole === "master" ? theme.info : theme.primary, flexShrink: 0 }}>
                {peerRole === "master" ? t("roleMaster") : t("buyurtmachi")}
              </span>
            </div>
            <p style={{ fontSize: "12px", color: theme.textSecondary, margin: "2px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {peerSubtitle}
            </p>
          </div>
        </div>

        {/* Xabarlar */}
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: "9px", height: "9px", borderRadius: theme.radius.full, backgroundColor: theme.textTertiary, animation: `pulse 1.4s infinite ${i * 0.2}s` }} />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px", color: theme.textTertiary, padding: "20px" }}>
              <div style={{ width: "76px", height: "76px", borderRadius: theme.radius.full, backgroundColor: theme.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.shadowMd }}>
                <img src="https://api.iconify.design/lucide:message-circle.svg?color=%23059669" width="34" height="34" alt="" />
              </div>
              <p style={{ fontSize: "15px", fontWeight: "700", margin: 0, color: theme.text }}>{t("greeting")}</p>
              <p style={{ fontSize: "13px", margin: 0, maxWidth: "260px", textAlign: "center", lineHeight: "1.5" }}>
                {meIsMaster ? `${t("buyurtmachi")}: ${peerDisplay}` : `${t("roleMaster")}: ${peerDisplay}`} — <span style={{ fontWeight: "600" }}>{t("typeMessage")}</span>
              </p>
            </div>
          ) : messages.map((m, i) => {
            const isMasterMsg = msgIsMaster(m);
            const isMe = myId && String(m.senderId || "") === String(myId);
            const showDate = i === 0 || !sameDay(m.createdAt, messages[i - 1]?.createdAt);
            const showSender = i === 0 || messages[i - 1]?.senderId !== m.senderId;
            if (m.system) {
              return (
                <React.Fragment key={m.id || i}>
                  {showDate && dayChip(formatDateLabel(m.createdAt, t, lang))}
                  <div style={{ maxWidth: "80%", alignSelf: "center", backgroundColor: theme.surface, color: theme.textSecondary, padding: "6px 16px", borderRadius: theme.radius.xxl, fontSize: "11px", fontWeight: "700", textAlign: "center", margin: "6px 0", boxShadow: theme.shadowSm }}>{m.text}</div>
                </React.Fragment>
              );
            }
            const ts = m.createdAt ? new Date(m.createdAt) : null;
            const timeStr = ts && !isNaN(ts) ? ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
            // Javobda avatar faqat qarama-qarshi tomonning guruh boshida
            const showAvatar = showSender && !isMe;
            return (
              <React.Fragment key={m.id || i}>
                {showDate && dayChip(formatDateLabel(m.createdAt, t, lang))}
                <div className={isMasterMsg ? "ust-msg-left" : "ust-msg-right"}
                  style={{ maxWidth: "78%", alignSelf: isMasterMsg ? "flex-start" : "flex-end", display: "flex", flexDirection: "column", alignItems: isMasterMsg ? "flex-start" : "flex-end", gap: "3px", marginBottom: showSender ? "10px" : "2px" }}>
                  {showSender && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: theme.textTertiary, fontWeight: "800", letterSpacing: "0.3px", textTransform: "uppercase", paddingLeft: isMasterMsg && showAvatar ? "44px" : 0, paddingRight: !isMasterMsg && showAvatar ? "44px" : 0 }}>
                      {isMe ? (isMasterMsg ? t("sizUsta") : t("you")) : peerDisplay}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", flexDirection: isMasterMsg ? "row" : "row-reverse", width: "100%" }}>
                    <div style={{ width: "34px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
                      {showAvatar && (
                        <div style={{ width: "32px", height: "32px", borderRadius: theme.radius.full, backgroundColor: isMasterMsg ? theme.info : theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "12px", overflow: "hidden", boxShadow: theme.shadowSm, border: `2px solid ${theme.surface}` }}>
                          {peerPhotoSrc ? <img src={peerPhotoSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : peerAvatarCh}
                        </div>
                      )}
                    </div>
                    <div style={{ backgroundColor: isMasterMsg ? theme.info : theme.primary, color: "#FFFFFF", boxShadow: theme.shadowSm, padding: "9px 13px", borderRadius: isMasterMsg ? `${theme.radius.xl} ${theme.radius.xl} ${theme.radius.xl} 6px` : `${theme.radius.xl} ${theme.radius.xl} 6px ${theme.radius.xl}`, fontSize: "13.5px", lineHeight: "1.5", wordBreak: "break-word", maxWidth: "100%" }}>
                      {m.image && <img src={apiUrl(m.image)} alt="" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: theme.radius.md, marginBottom: m.text ? "6px" : 0 }} />}
                      {m.text && <span>{m.text}</span>}
                      <span style={{ display: "inline-block", fontSize: "10px", color: "rgba(255,255,255,0.82)", marginLeft: "8px", verticalAlign: "bottom", fontWeight: "600" }}>{timeStr}</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Kiritish */}
        <div style={{ padding: "10px 14px 12px", borderTop: `1px solid ${theme.borderLight}`, backgroundColor: theme.surface, flexShrink: 0, maxWidth: "100%", boxShadow: `0 -4px 18px rgba(15,23,42,0.05)` }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", maxWidth: "100%" }}>
            <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
              <input name="chatMessage" ref={inputRef} value={text} onChange={(e) => setText(e.target.value.slice(0, MAX_MSG_LEN))} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={t("typeMessage")} maxLength={MAX_MSG_LEN}
                style={{ width: "100%", padding: "12px 16px", borderRadius: theme.radius.xxl, border: `1px solid ${theme.border}`, fontSize: "14px", outline: "none", backgroundColor: theme.bgSecondary, color: theme.text, boxSizing: "border-box", boxShadow: `inset 0 1px 3px rgba(15,23,42,0.06)` }} />
            </div>
            <UIconBtn onClick={send} disabled={!text.trim() || sending} size={44} aria-label={t("chat") || "Send"}
              style={{ backgroundColor: text.trim() && !sending ? theme.primary : theme.bgTertiary, color: text.trim() && !sending ? theme.textInverse : theme.textTertiary, boxShadow: text.trim() && !sending ? theme.shadowMd : "none" }}>
              <Send size={18} strokeWidth={2.4} />
            </UIconBtn>
          </div>
          {text.length > MAX_MSG_LEN * 0.9 && (
            <div style={{ fontSize: "10px", color: text.length >= MAX_MSG_LEN ? theme.error : theme.textTertiary, textAlign: "right", marginTop: "4px" }}>{text.length}/{MAX_MSG_LEN}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;