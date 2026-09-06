import React, { useState, useEffect, useCallback } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

export const ChatsView = ({ user, onOpenChat, onBadgeRefresh }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/chat/my`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setThreads(data.data);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Bo'lim ochilganda barcha chatlarni "o'qildi" deb belgilaymiz (badge o'chadi)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetch(apiUrl("/api/chat/read"), {
          method: "POST",
          headers: authHeaders(),
        });
      } catch {}
      if (!cancelled && onBadgeRefresh) onBadgeRefresh();
    })();
    return () => { cancelled = true; };
  }, [onBadgeRefresh]);

  return (
    <div style={{ padding: "16px", boxSizing: "border-box", width: "100%", maxWidth: "800px", margin: "0 auto", backgroundColor: theme.bg, minHeight: "80vh" }}>
      <h1 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 16px 0", color: theme.text }}>{t("chatTitle")}</h1>

      {loading && <p style={{ color: theme.textSecondary, textAlign: "center" }}>...</p>}
      {!loading && threads.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 0", color: theme.textTertiary }}>
          <img src="https://api.iconify.design/lucide:message-circle.svg?color=%2394a3b8" width="48" height="48" alt="" />
          <p style={{ fontSize: "14px", fontWeight: "600", margin: "12px 0 0 0" }}>{t("noChats")}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {threads.map((c) => {
          const peer = c.peer || {};
          const peerName = peer.name || peer.phone || t("chatPeer");
          const last = c.lastMessage || "";
          return (
            <button key={c.id} onClick={() => onOpenChat({ chatId: c.id, peerName })}
              style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.md, padding: "12px 14px", cursor: "pointer", color: theme.text, display: "flex", alignItems: "center", gap: "12px", textAlign: "left" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", flexShrink: 0, fontSize: "16px", overflow: "hidden", border: `1px solid ${theme.border}` }}>
                {peer.photo ? <img src={peer.photo && (peer.photo.startsWith("data:") || peer.photo.startsWith("http")) ? peer.photo : apiUrl(peer.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (peer.avatarCh || peerName.charAt(0) || "?").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{peerName}</div>
                <div style={{ fontSize: "12px", color: theme.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{last || t("chat")}</div>
              </div>
              <img src={`https://api.iconify.design/lucide:message-circle.svg?color=${encodeURIComponent(theme.primary)}`} width="22" height="22" alt="" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChatsView;
