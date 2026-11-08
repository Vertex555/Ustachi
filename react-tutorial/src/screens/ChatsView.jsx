import React, { useState, useEffect, useCallback } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { attachSocket } from "../services/socket";
import { displayName } from "../utils/display";

function fmtTime(dateStr, t, lang) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today - day) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return t("yesterday");
  const loc = lang === "uz" ? "uz-UZ" : lang === "ru" ? "ru-RU" : "en-US";
  return d.toLocaleDateString(loc, { day: "numeric", month: "short" });
}

export const ChatsView = ({ user, onOpenChat, onBadgeRefresh }) => {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const myId = user?.id ? String(user.id) : "";

  const CHAT_PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/chat/my?page=1&limit=${CHAT_PAGE_SIZE}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setThreads(data.data);
        setPage(1);
        setHasMore(!!data.pagination && data.pagination.page < data.pagination.pages);
      }
    } catch {}
    setLoading(false);
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetch(apiUrl(`/api/chat/my?page=${next}&limit=${CHAT_PAGE_SIZE}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setThreads((list) => [...list, ...data.data]);
        setPage(next);
        setHasMore(!!data.pagination && data.pagination.page < data.pagination.pages);
      }
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, hasMore, page]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = useCallback(async () => {
    try {
      await fetch(apiUrl("/api/chat/read"), {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {}
    if (onBadgeRefresh) onBadgeRefresh();
  }, [onBadgeRefresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await markAllRead();
      if (!cancelled) load();
    })();
    return () => { cancelled = true; };
  }, [markAllRead, load]);

  useEffect(() => {
    const { detach } = attachSocket({
      onChatNew: () => { markAllRead(); load(); },
    });
    return detach;
  }, [markAllRead, load]);

  return (
    <div style={{ padding: "16px", boxSizing: "border-box", width: "100%", maxWidth: "100%", margin: "0 auto", backgroundColor: theme.bg, minHeight: "80vh" }}>
      <h1 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 2px 0", color: theme.text }}>{t("chatTitle")}</h1>
      <p style={{ fontSize: "12px", color: theme.textSecondary, margin: "0 0 14px 0", fontWeight: "500" }}>
        {user?.isMaster ? t("sizUsta") : t("roleUser")}
      </p>

      {loading && <p style={{ color: theme.textSecondary, textAlign: "center" }}>...</p>}
      {!loading && threads.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: theme.textTertiary }}>
          <div style={{ width: "72px", height: "72px", borderRadius: theme.radius.full, backgroundColor: theme.surface, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: theme.shadowMd }}>
            <img src="https://api.iconify.design/lucide:message-circle.svg?color=%2394a3b8" width="32" height="32" alt="" />
          </div>
          <p style={{ fontSize: "14px", fontWeight: "700", margin: "14px 0 0 0", color: theme.textSecondary }}>{t("noChats")}</p>
        </div>
      )}

      <div className="ust-list-grid">
        {threads.map((c, i) => {
          const peer = c.peer || {};
          const peerRole = peer.role === "master" ? "master" : "user";
          const peerName = displayName(peer.name, peer.phone) || t("chatPeer");
          const last = c.lastMessage || "";
          const isMe = myId && c.lastSenderId && String(c.lastSenderId) === myId;
          const photo = peer.photo ? (peer.photo.startsWith("data:") || peer.photo.startsWith("http") ? peer.photo : apiUrl(peer.photo)) : "";
          const accent = peerRole === "master" ? theme.info : theme.primary;
          return (
            <button key={c.id} onClick={() => onOpenChat({ chatId: c.id, peerName })}
              className="ust-screen-up"
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg, padding: "13px 14px", cursor: "pointer", color: theme.text, display: "flex", alignItems: "center", gap: "12px", textAlign: "left", boxShadow: theme.shadowSm, animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: "46px", height: "46px", borderRadius: "50%", backgroundColor: accent, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", flexShrink: 0, fontSize: "16px", overflow: "hidden", border: `2px solid ${theme.surface}`, boxShadow: theme.shadowSm }}>
                  {photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (peer.avatarCh || peerName.charAt(0) || "?").toUpperCase()}
                </div>
                {c.unread && <span style={{ position: "absolute", top: "-2px", right: "-2px", width: "13px", height: "13px", borderRadius: theme.radius.full, backgroundColor: theme.error, border: `2px solid ${theme.surface}` }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ fontSize: "14px", fontWeight: "800", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{peerName}</span>
                  <span style={{ fontSize: "9px", fontWeight: "800", letterSpacing: "0.4px", textTransform: "uppercase", padding: "2px 7px", borderRadius: theme.radius.full, backgroundColor: peerRole === "master" ? theme.infoLight : theme.primaryLight, color: peerRole === "master" ? theme.info : theme.primary, flexShrink: 0 }}>
                    {peerRole === "master" ? t("roleMaster") : t("buyurtmachi")}
                  </span>
                </div>
                <div style={{ fontSize: "12px", color: theme.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                  {isMe && last && <span style={{ fontWeight: "700", color: theme.textTertiary }}>{t("you")}: </span>}{last || t("chat")}
                </div>
              </div>
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
                <span style={{ fontSize: "10px", color: theme.textTertiary, fontWeight: "600", whiteSpace: "nowrap" }}>{fmtTime(c.lastActivity, t, lang)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore} className="btn-act"
          style={{ width: "100%", marginTop: "14px", backgroundColor: theme.surface, color: theme.primary, border: `1.5px solid ${theme.border}`, borderRadius: theme.radius.full, padding: "12px", fontSize: "13px", fontWeight: "800", cursor: loadingMore ? "default" : "pointer" }}>
          {loadingMore ? "..." : t("loadMore")}
        </button>
      )}
    </div>
  );
};

export default ChatsView;