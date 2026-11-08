import React from "react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UploadScreen } from "./UploadScreen";
import { SavedMastersScreen } from "./SavedMastersScreen";
import { OrdersView } from "./OrdersView";
import { ChatsView } from "./ChatsView";
import { UserProfile } from "./UserProfile";
import { UCard } from "../components/ui";

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
  onOpenFeedback,
  onOpenCards,
  badges,
  onBadgeRefresh,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  let content;
  if (tab === "home") {
    content = (
      <div style={{ width: "100%", padding: "16px", boxSizing: "border-box" }}>
        <UCard style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "14px 18px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: theme.primary, color: theme.textInverse, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: "800", flexShrink: 0 }}>
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "800", color: theme.text }}>{t("homeGreeting")}, {user?.name || t("user")} 👋</div>
              <div style={{ fontSize: "12.5px", color: theme.textSecondary, marginTop: "2px" }}>{t("homeSubtitle")}</div>
            </div>
          </div>
        </UCard>
        <UploadScreen onNext={onNext} onChangeRole={onChangeRole} onOpenSettings={onOpenSettings} />
      </div>
    );
  } else if (tab === "saved") {
    content = <SavedMastersScreen user={user} onOrder={onNext} onViewProfile={onViewProfile} />;
  } else if (tab === "orders") {
    content = <OrdersView user={user} onViewOrder={onOpenOrder} onBadgeRefresh={onBadgeRefresh} />;
  } else if (tab === "chats") {
    content = <ChatsView user={user} onOpenChat={onOpenChat} onBadgeRefresh={onBadgeRefresh} />;
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
        onFeedback={onOpenFeedback}
        onCards={onOpenCards}
      />
    );
  }

  return (
    <div key={tab} className="ust-screen-up ust-tab-right" style={{ flex: 1, minHeight: "100vh", overflowY: "auto", backgroundColor: "transparent", color: theme.text, fontFamily: theme.font.family }}>
      {content}
    </div>
  );
};

export default UserHome;