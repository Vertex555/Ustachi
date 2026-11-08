import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { getAuthUser } from "../services/authStore";

export default function HelpScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();

  const isMaster = getAuthUser()?.role === "master";

  const steps = isMaster
    ? [
        { num: 1, title: t("mhelpStep1Title"), desc: t("mhelpStep1Desc"), icon: "user" },
        { num: 2, title: t("mhelpStep2Title"), desc: t("mhelpStep2Desc"), icon: "clipboard-list" },
        { num: 3, title: t("mhelpStep3Title"), desc: t("mhelpStep3Desc"), icon: "bell" },
        { num: 4, title: t("mhelpStep4Title"), desc: t("mhelpStep4Desc"), icon: "check-circle" },
        { num: 5, title: t("mhelpStep5Title"), desc: t("mhelpStep5Desc"), icon: "message-circle" },
        { num: 6, title: t("mhelpStep6Title"), desc: t("mhelpStep6Desc"), icon: "star" },
      ]
    : [
        { num: 1, title: t("helpStep1Title"), desc: t("helpStep1Desc"), icon: "smartphone" },
        { num: 2, title: t("helpStep2Title"), desc: t("helpStep2Desc"), icon: "alert-circle" },
        { num: 3, title: t("helpStep3Title"), desc: t("helpStep3Desc"), icon: "map-pin" },
        { num: 4, title: t("helpStep4Title"), desc: t("helpStep4Desc"), icon: "shopping-cart" },
        { num: 5, title: t("helpStep5Title"), desc: t("helpStep5Desc"), icon: "map" },
        { num: 6, title: t("helpStep6Title"), desc: t("helpStep6Desc"), icon: "star" },
      ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              {
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
                justifyContent: "center",
                ...theme.shadowSm,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="chevron-left" size={18} color={theme.text} />
          </Pressable>
          <Text style={{ fontSize: 18, fontWeight: "800", color: theme.text }}>{t("helpTitle")}</Text>
        </View>

        <View style={{ gap: 14 }}>
          {steps.map((step) => (
            <View
              key={step.num}
              style={{
                backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm,
                padding: 16,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 14,
                ...theme.shadowSm,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: theme.primaryLight,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={step.icon} size={22} color={theme.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: theme.text, marginBottom: 4 }}>
                  {step.title}
                </Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}