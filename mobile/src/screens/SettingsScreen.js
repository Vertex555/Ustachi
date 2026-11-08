import React from "react";
import { View, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../components/settings/SettingsScreen";
import { SettingsSection, SettingsRow } from "../components/settings/SettingsRow";
import AppButton from "../components/AppButton";
import { getAuthUser, clearAuth } from "../services/authStore";
import { settingsSectionsForRole } from "../settings/logic";

// Bo'limlar ro'yxati — rolikka qarab filtrlanadi (logic.js)
// Kalitlar i18n kalitlari bilan 1:1 mos keladi.
const SECTIONS = [
  { key: "appearance", icon: "sun", label: "sectionAppearance", hint: "appearance" },
  { key: "language", icon: "globe", label: "sectionLanguage", hint: "language" },
  { key: "notifications", icon: "bell", label: "sectionNotifications", hint: "notifications" },
  { key: "addresses", icon: "map-pin", label: "sectionAddresses", hint: "addresses" },
  { key: "payments", icon: "credit-card", label: "sectionPayments", hint: "payments" },
  { key: "security", icon: "shield", label: "sectionSecurity", hint: "security" },
  { key: "help", icon: "help-circle", label: "sectionHelp", hint: "helpCenter" },
  { key: "about", icon: "info", label: "sectionAbout", hint: "about" },
  { key: "master", icon: "wrench", label: "sectionMaster", hint: "masterSettings" },
];

const ROUTES = {
  appearance: "AppearanceSettings",
  language: "AppearanceSettings",
  notifications: "NotificationSettings",
  addresses: "AddressSettings",
  payments: "PaymentSettings",
  security: "SecuritySettings",
  help: "HelpCenter",
  about: "AboutSettings",
  master: "MasterSettings",
};

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { theme, mode, fontScale, reduceMotion } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();

  const user = getAuthUser();
  const role = user?.role;
  const allowed = settingsSectionsForRole(role);
  const sections = SECTIONS.filter((s) => allowed.includes(s.key));

  // Bo'limlar sarlavhalarini guruhlarga ajratamiz
  const general = sections.filter((s) => ["appearance", "language", "notifications"].includes(s.key));
  const account = sections.filter((s) => ["addresses", "payments", "security", "master"].includes(s.key));
  const more = sections.filter((s) => ["help", "about"].includes(s.key));

  const valueFor = (key) => {
    if (key === "appearance") return mode === "system" ? t("themeSystem") : mode === "dark" ? t("themeDark") : t("themeLight");
    if (key === "language") return { uz: "O'zbekcha", ru: "Русский", en: "English" }[lang] || lang;
    if (key === "notifications") return null;
    return null;
  };

  function confirmLogout() {
    Alert.alert(t("signOutConfirm"), t("signOut"), [
      { text: t("cancel"), style: "cancel" },
      { text: t("logout"), style: "destructive", onPress: () => clearAuth() },
    ]);
  }

  const group = (title, items) =>
    items.length ? (
      <SettingsSection title={title}>
        {items.map((s, i) => (
          <SettingsRow
            key={s.key}
            icon={s.icon}
            title={t(s.label)}
            subtitle={t(s.hint)}
            value={valueFor(s.key)}
            onPress={() => navigation.navigate(ROUTES[s.key])}
            last={i === items.length - 1}
          />
        ))}
      </SettingsSection>
    ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("settings")} subtitle={t("settingsSubtitle")} />

      <SettingsScroll>
        {group(t("settings"), general)}
        {group(t("profile"), account)}
        {group(t("help"), more)}

        <AppButton
          label={t("signOut")}
          icon="log-out"
          variant="secondary"
          onPress={confirmLogout}
          style={{ marginBottom: 20 }}
        />

        <Text style={{ textAlign: "center", fontSize: theme.font.xs, color: theme.textTertiary, paddingBottom: insets.bottom }}>
          {t("appVersion")} 1.0.0
        </Text>
      </SettingsScroll>
    </View>
  );
}

