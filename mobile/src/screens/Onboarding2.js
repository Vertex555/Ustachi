import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";

const steps = [
  { icon: "image-plus", number: "1", title: "Upload photo", desc: "Upload clear photos of your phone damage" },
  { icon: "user", number: "2", title: "Choose master", desc: "Select the best master near you" },
  { icon: "check-circle", number: "3", title: "Get fixed", desc: "You review the job fixed quickly and reliably" },
];

export function OnboardingScreen2({ navigation }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const primaryShadow = {
    ...theme.shadowMd,
    shadowColor: theme.primary,
    shadowOpacity: theme.mode === "dark" ? 0.3 : 0.3,
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.xxl, backgroundColor: theme.bg }}>
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={8}
        style={({ pressed }) => [{ position: "absolute", top: 56, left: 24, padding: 4, zIndex: 10 }, pressed && { opacity: 0.7 }]}
      >
        <Icon name="arrow-left" size={28} color={theme.text} />
      </Pressable>

      <View style={{ alignItems: "center", width: "100%", maxWidth: 380, gap: 28 }}>
        <View style={{ width: "100%" }}>
          <Text style={{ fontSize: theme.font.xxxl, fontWeight: theme.font.extrabold, letterSpacing: -0.5, color: theme.text, textAlign: "center", marginBottom: 6 }}>
            How Ustachi Works
          </Text>
          <Text style={{ fontSize: theme.font.base, color: theme.textSecondary, textAlign: "center", lineHeight: 21, fontWeight: theme.font.semibold }}>
            Simple steps to get your phone fixed
          </Text>
        </View>

        <View style={{ gap: 12, width: "100%" }}>
          {steps.map((step, index) => (
            <View
              key={index}
              style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 14, paddingHorizontal: 16, borderRadius: theme.neumorph.radiusLg, backgroundColor: theme.neumorph.surface, ...theme.neumorph.raised }}
            >
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: theme.neumorph.surface, alignItems: "center", justifyContent: "center", ...theme.neumorph.raisedSm }}>
                <Icon name={step.icon} size={24} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontWeight: theme.font.extrabold, color: theme.primary, fontSize: theme.font.md }}>{step.number}</Text>
                  <Text style={{ fontWeight: theme.font.bold, color: theme.text, fontSize: theme.font.md }}>{step.title}</Text>
                </View>
                <Text style={{ fontSize: theme.font.sm, color: theme.textSecondary, marginTop: 4, lineHeight: 17 }}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ width: "100%", gap: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
            <View style={{ width: 24, height: 8, borderRadius: 4, backgroundColor: theme.primary }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.textTertiary, opacity: 0.5 }} />
          </View>

          <Pressable
            onPress={() => navigation.navigate("LocationAccess")}
            style={({ pressed }) => [{ backgroundColor: theme.primary, padding: 16, borderRadius: theme.radius.lg, alignItems: "center", ...primaryShadow }, pressed && { opacity: 0.85 }]}
          >
            <Text style={{ color: theme.textInverse, fontWeight: theme.font.bold, fontSize: theme.font.md }}>{t("onboardingNext")}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default OnboardingScreen2;