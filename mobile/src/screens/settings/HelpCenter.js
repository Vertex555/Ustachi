import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../../components/settings/SettingsScreen";
import { SettingsSection, SettingsRow } from "../../components/settings/SettingsRow";
import Icon from "../../components/Icon";

const FAQ = [
  { q: "faqOrders", a: "faqOrdersAnswer" },
  { q: "faqPayment", a: "faqPaymentAnswer" },
  { q: "faqCancel", a: "faqCancelAnswer" },
  { q: "faqSafety", a: "faqSafetyAnswer" },
];

export default function HelpCenter() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("helpCenter")} subtitle={t("help")} />

      <SettingsScroll>
        <SettingsSection title={t("faq")}>
          {FAQ.map((item, i) => {
            const isOpen = open === i;
            return (
              <View key={item.q} style={[styles.faqItem, { borderBottomColor: theme.border, borderBottomWidth: i === FAQ.length - 1 ? 0 : StyleSheet.hairlineWidth }]}>
                <Pressable
                  onPress={() => setOpen(isOpen ? null : i)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={({ pressed }) => [styles.faqHead, { opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ flex: 1, fontSize: theme.font.base, fontWeight: "700", color: theme.text }}>
                    {t(item.q)}
                  </Text>
                  <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textTertiary} />
                </Pressable>
                {isOpen ? (
                  <Text style={{ fontSize: theme.font.sm, color: theme.textSecondary, lineHeight: 20, paddingBottom: 14 }}>
                    {t(item.a)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </SettingsSection>

        <SettingsSection title={t("contactSupport")}>
          <SettingsRow
            icon="life-buoy"
            title={t("supportRequest")}
            subtitle={t("contactSupport")}
            onPress={() => navigation.navigate("Feedback")}
          />
          <SettingsRow
            icon="help-circle"
            title={t("helpSupport")}
            onPress={() => navigation.navigate("Help")}
            last
          />
        </SettingsSection>
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  faqItem: { paddingHorizontal: 14 },
  faqHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
});
