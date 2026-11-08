import React from "react";
import { View, Text, Linking, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../../components/settings/SettingsScreen";
import { SettingsSection, SettingsRow } from "../../components/settings/SettingsRow";
import Icon from "../../components/Icon";
import Constants from "expo-constants";

const APP_LINKS = {
  privacy: "https://ustachi.uz/privacy",
  terms: "https://ustachi.uz/terms",
};

export default function AboutSettings() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const version =
    Constants.expoConfig?.version ||
    Constants.manifest?.version ||
    "1.0.0";

  function openLink(url) {
    Linking.openURL(url).catch(() => {});
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("about")} subtitle={t("appVersion")} />

      <SettingsScroll>
        <View style={styles.logoBox}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <Icon name="wrench" size={34} color={theme.textInverse} />
          </View>
          <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text, marginTop: 12 }}>Ustachi</Text>
          <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, marginTop: 4 }}>
            {t("appVersion")} {version}
          </Text>
        </View>

        <SettingsSection>
          <SettingsRow icon="file-text" title={t("termsOfService")} onPress={() => openLink(APP_LINKS.terms)} />
          <SettingsRow icon="shield-check" title={t("privacyPolicy")} onPress={() => openLink(APP_LINKS.privacy)} />
          <SettingsRow
            icon="book"
            title={t("openSourceLicenses")}
            subtitle={t("helpSupport")}
            onPress={() => {}}
            disabled
            last
          />
        </SettingsSection>

        <SettingsSection title={t("payments")}>
          <SettingsRow icon="credit-card" title={t("paymentCards")} value={t("cardPaymentsDisabled")} disabled />
          <SettingsRow icon="headphones" title={t("contactSupport")} onPress={() => {}} disabled last />
        </SettingsSection>

        <Text style={{ textAlign: "center", fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 10 }}>
          Ustachi · {t("appVersion")} {version}
        </Text>
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  logoBox: { alignItems: "center", paddingVertical: 26 },
  logo: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
