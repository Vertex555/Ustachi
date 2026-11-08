import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../../components/settings/SettingsScreen";
import { SettingsSection } from "../../components/settings/SettingsRow";
import { SwitchRow, InfoNote } from "../../components/settings/Controls";
import { NOTIFICATION_CATEGORIES } from "../../settings/logic";
import { getPrefs, subscribePrefs, updateNotificationCategory, updatePushChannel } from "../../services/prefs";

const CATEGORY_LABEL_KEY = {
  orders: "notificationOrders",
  chat: "notificationChat",
  masters: "notificationMasters",
  payments: "notificationPayments",
  promo: "notificationPromo",
};

export default function NotificationSettings() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [state, setState] = useState(() => getPrefs());
  const [saving, setSaving] = useState(false);
  const [pushOn, setPushOn] = useState(() => getPrefs().notifications?.channels?.push !== false);

  useEffect(() => {
    const unsub = subscribePrefs(({ preferences, notifications }) => setState({ preferences, notifications }));
    return unsub;
  }, []);

  const notifications = state.notifications || {};

  async function toggleCategory(key, value) {
    const prev = notifications[key];
    // Oqilona: UI darhol yangilanadi, server xatosida qaytariladi
    setState((s) => ({ ...s, notifications: { ...s.notifications, [key]: value } }));
    setSaving(true);
    try {
      await updateNotificationCategory(key, value);
    } catch {
      setState((s) => ({ ...s, notifications: { ...s.notifications, [key]: prev } }));
    } finally {
      setSaving(false);
    }
  }

  async function togglePush(value) {
    const prev = pushOn;
    setPushOn(value);
    setSaving(true);
    setState((s) => ({
      ...s,
      notifications: { ...s.notifications, channels: { ...(s.notifications.channels || {}), push: value } },
    }));
    try {
      await updatePushChannel(value);
    } catch {
      setPushOn(prev);
      setState((s) => ({
        ...s,
        notifications: { ...s.notifications, channels: { ...(s.notifications.channels || {}), push: prev } },
      }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("sectionNotifications")} subtitle={t("notifications")} />

      <SettingsScroll>
        <SettingsSection title={t("pushChannel")}>
          <SwitchRow
            icon="bell"
            title={t("pushChannel")}
            value={pushOn}
            onValueChange={togglePush}
            last
          />
        </SettingsSection>

        <SettingsSection note={t("notificationsNote")}>
          {NOTIFICATION_CATEGORIES.map((c, i) => (
            <SwitchRow
              key={c.key}
              icon={c.icon}
              title={t(CATEGORY_LABEL_KEY[c.key])}
              value={notifications[c.key] !== false}
              onValueChange={(v) => toggleCategory(c.key, v)}
              disabled={!pushOn}
              last={i === NOTIFICATION_CATEGORIES.length - 1}
            />
          ))}
        </SettingsSection>

        {!pushOn ? (
          <InfoNote tone="warn">
            {t("notificationsNote")}
          </InfoNote>
        ) : null}

        {saving ? (
          <View style={{ marginTop: 12, alignItems: "center" }}>
            <ActivityIndicator color={theme.primary} size="small" />
          </View>
        ) : null}
      </SettingsScroll>
    </View>
  );
}
