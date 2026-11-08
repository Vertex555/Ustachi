import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { apiUrl } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";

export function NoInternet({ onRetry }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleManualRetry = async () => {
    setIsRetrying(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    let online = false;
    try {
      const res = await fetch(apiUrl("/api/health"));
      online = res.ok;
    } catch {}
    setIsRetrying(false);
    if (online && typeof onRetry === "function") onRetry();
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg, padding: theme.spacing.xl }}>
      <View style={{ backgroundColor: theme.neumorph.surface, paddingVertical: theme.spacing.xxxl, paddingHorizontal: theme.spacing.xxl, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raised, width: "100%", maxWidth: 380, alignItems: "center", gap: 20 }}>

        <View style={{ width: 200, height: 200, alignItems: "center", justifyContent: "center" }}>
          <Icon name="wifi" size={130} color={theme.textTertiary} style={{ opacity: 0.5 }} />
        </View>

        <View style={{ alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, textAlign: "center" }}>
            Internet aloqasi yo'q
          </Text>
          <Text style={{ fontSize: theme.font.sm, color: theme.textSecondary, textAlign: "center", lineHeight: 19 }}>
            Iltimos, internet tarmog'iga ulanganingizni tekshiring va qaytadan urinib ko'ring.
          </Text>
        </View>

        <Pressable
          onPress={handleManualRetry}
          disabled={isRetrying}
          style={({ pressed }) => [
            {
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderRadius: theme.radius.md,
              backgroundColor: isRetrying ? theme.primaryHover : theme.primary,
              opacity: isRetrying ? 0.7 : 1,
              ...theme.shadowSm,
              shadowColor: theme.primary,
              shadowOpacity: theme.mode === "dark" ? 0.3 : 0.3,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={{ color: theme.textInverse, fontSize: theme.font.md, fontWeight: theme.font.bold }}>
            {isRetrying ? "Tekshirilmoqda..." : t("retry")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export default NoInternet;