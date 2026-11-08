import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";

export function OnboardingScreen1({ navigation }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const primaryShadow = {
    ...theme.shadowMd,
    shadowColor: theme.primary,
    shadowOpacity: theme.mode === "dark" ? 0.3 : 0.3,
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xxl, backgroundColor: theme.bg }}>
      <View style={{ alignItems: "center", width: "100%", maxWidth: 380, gap: 36 }}>
        <View style={{ alignItems: "center", gap: 18, width: "100%" }}>
          <View style={{ width: 78, height: 78, borderRadius: 39, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", ...primaryShadow }}>
            <Icon name="wrench" size={38} color={theme.textInverse} style={{ transform: [{ rotate: "-45deg" }] }} />
          </View>

          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: theme.font.xxxl, fontWeight: theme.font.extrabold, color: theme.primary, letterSpacing: -0.5, marginBottom: 6, textAlign: "center" }}>
              Ustachi
            </Text>
            <Text style={{ fontSize: theme.font.base, color: theme.textSecondary, maxWidth: 280, fontWeight: theme.font.semibold, lineHeight: 22, textAlign: "center" }}>
              {t("onboardingDesc")}
            </Text>
          </View>

          <View style={{ width: 320, height: 200, borderRadius: theme.neumorph.radiusLg, backgroundColor: theme.neumorph.surface, alignItems: "center", justifyContent: "center", ...theme.neumorph.raised }}>
            <Icon name="smartphone" size={92} color={theme.primary} />
          </View>
        </View>

        <View style={{ width: "100%", maxWidth: 380, gap: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
            <View style={{ width: 24, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
          </View>

          <Pressable
            onPress={() => navigation.navigate("Onboarding2")}
            style={({ pressed }) => [{ backgroundColor: theme.primary, padding: 16, borderRadius: theme.neumorph.radius, alignItems: "center", ...primaryShadow }, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ color: theme.textInverse, fontWeight: theme.font.bold, fontSize: theme.font.md }}>{t("getStarted")}</Text>
          </Pressable>

          <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, fontWeight: theme.font.bold }}>Trusted</Text>
            <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, fontWeight: theme.font.bold }}>•</Text>
            <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, fontWeight: theme.font.bold }}>Fast</Text>
            <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, fontWeight: theme.font.bold }}>•</Text>
            <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, fontWeight: theme.font.bold }}>Nearby</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default OnboardingScreen1;