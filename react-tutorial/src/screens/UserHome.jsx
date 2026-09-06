import React, { useState, useEffect, useCallback } from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { apiUrl, authHeaders } from "../services/api";
import { fetchSavedMasters } from "../services/savedMasters";
import { attachSocket } from "../services/socket";
import { UploadScreen } from "./UploadScreen";
import { SavedMastersScreen } from "./SavedMastersScreen";
import { OrdersView } from "./OrdersView";
import { ChatsView } from "./ChatsView";
import { UserProfile } from "./UserProfile";

const TABS = [
  { key: "home", icon: "home", label: "home", badgeKey: null },
  { key: "saved", icon: "bookmark", label: "saved", badgeKey: "saved" },
  { key: "orders", icon: "package", label: "orders", badgeKey: "orders" },
  { key: "chats", icon: "message-circle", label: "chats", badgeKey: "chats" },
  { key: "profile", icon: "user", label: "profile", badgeKey: null },
];

const ACTIVE_ORDER_STATUSES = ["placed", "accepted", "in_progress", "ready"];

export const UserHome = ({
  user,
  tab,
  setTab,
  onOpenOrder,
  onNext,
  onChangeRole,
  onOpenSettings,
  onSaveProfile,
  onOpenChat,
  onLogout,
  onSupport,
  onViewProfile,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [badges, setBadges] = useState({ orders: 0, chats: 0, saved: 0 });

  const refreshBadges = useCallback(async () => {
    const myId = user?.id || localStorage.getItem("ustachi_user_id");
    let orders = 0, chats = 0, saved = 0;
    try {
      const oRes = await fetch(apiUrl("/api/orders"), { headers: authHeaders() });
      const oData = await oRes.json();
      if (oRes.ok && oData.success && Array.isArray(oData.data)) {
        orders = oData.data.filter((o) => ACTIVE_ORDER_STATUSES.includes(o.status) && o.seen !== true).length;
      }
    } catch {}
    try {
      const cRes = await fetch(apiUrl("/api/chat/my"), { headers: authHeaders() });
      const cData = await cRes.json();
      if (cRes.ok && cData.success && Array.isArray(cData.data)) {
        chats = cData.data.filter((c) => c.unread ?? (c.lastSenderId && c.lastSenderId !== myId)).length;
      }
    } catch {}
    try {
      const savedList = await fetchSavedMasters();
      saved = (savedList || []).length;
    } catch {}
    setBadges({ orders, chats, saved });
  }, [user?.id]);

  useEffect(() => { refreshBadges(); }, [refreshBadges]);

  useEffect(() => { refreshBadges(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    attachSocket({
      onOrderNew: refreshBadges,
      onOrderUpdate: refreshBadges,
      onChatNew: refreshBadges,
    });
  }, [refreshBadges]);

  let content;
  if (tab === "home") {
    content = (
      <UploadScreen
        onNext={onNext}
        onChangeRole={onChangeRole}
        onOpenSettings={onOpenSettings}
      />
    );
  } else if (tab === "saved") {
    content = <SavedMastersScreen user={user} onOrder={onNext} onViewProfile={onViewProfile} />;
  } else if (tab === "orders") {
    content = <OrdersView user={user} onViewOrder={onOpenOrder} onBadgeRefresh={refreshBadges} />;
  } else if (tab === "chats") {
    content = <ChatsView user={user} onOpenChat={onOpenChat} onBadgeRefresh={refreshBadges} />;
  } else {
    content = (
      <UserProfile
        user={user}
        onMyOrders={() => setTab("orders")}
        onSaved={() => setTab("saved")}
        onSettings={onOpenSettings}
        onSupport={onSupport}
        onLogout={onLogout}
        onSaveProfile={onSaveProfile}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: theme.bg, color: theme.text, fontFamily: theme.font.family }}>
      <div style={{ flex: 1, overflowY: "auto" }}>{content}</div>

      <div style={{ position: "sticky", bottom: 0, width: "100%", maxWidth: "800px", margin: "0 auto", backgroundColor: theme.surface, borderTop: `1px solid ${theme.border}`, boxSizing: "border-box", display: "flex", justifyContent: "space-around", padding: "8px 0 10px 0", zIndex: 50, boxShadow: "0 -2px 12px rgba(0,0,0,0.06)" }}>
        {TABS.map((item) => {
          const isActive = tab === item.key;
          const color = isActive ? theme.primary : theme.textTertiary;
          const count = item.badgeKey ? badges[item.badgeKey] || 0 : 0;
          return (
            <button key={item.key} onClick={() => setTab(item.key)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", padding: "2px 12px", color, position: "relative" }}>
              <div style={{ position: "relative" }}>
                <img src={`https://api.iconify.design/lucide:${item.icon}.svg?color=${encodeURIComponent(color)}`} width="22" height="22" alt="" />
                {count > 0 && (
                  <span style={{ position: "absolute", top: "-6px", right: "-10px", minWidth: "16px", height: "16px", borderRadius: "8px", backgroundColor: "#dc2626", color: "#ffffff", fontSize: "9px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", boxSizing: "border-box", lineHeight: 1, border: `2px solid ${theme.surface}` }}>
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "10px", fontWeight: isActive ? "800" : "600", color }}>{t(item.label)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UserHome;