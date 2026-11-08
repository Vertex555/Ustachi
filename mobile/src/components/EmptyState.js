import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "./Icon";
import AppButton from "./AppButton";

// Umumiy bo'sh holat (Empty State).
// Bitta komponent — "xabarlar yo'q", "saqlangan ustalar yo'q", "buyurtma yo'q".
// Oldin: kichik doira + ikki qator matn (quruq, chegarasiz).
// Endi: glass kartochka, katta bezak doirasi, iyerarxiyali matn va to'ldirilgan CTA.

function EmptyState({
  theme: themeProp,
  icon = "package",
  title,
  subtitle,
  compact = false,
  action,
  onAction,
  actionIcon = "sparkles",
  tone,
}) {
  const ctx = useTheme();
  const theme = themeProp || ctx.theme;
  const { t } = useTranslation();

  const accent =
    tone === "secondary" ? theme.secondary
      : tone === "warning" ? theme.warning
        : theme.primary;

  return (
    <View style={[styles.wrap, { paddingVertical: compact ? 14 : 22, paddingHorizontal: compact ? 14 : 18 }]}>
      {/* Glass kartochka */}
      <LinearGradient
        colors={
          theme.mode === "dark"
            ? [theme.card, theme.cardAlt]
            : ["rgba(255,255,255,0.95)", theme.cardAlt]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card,
          theme.mode === "dark"
            ? { borderColor: theme.glassBorder, shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 }
            : { borderColor: "rgba(255,255,255,0.95)", shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
        ]}
      >
        {/* Bezak nuri */}
        <View pointerEvents="none" style={[styles.glow, { backgroundColor: accent, opacity: theme.mode === "dark" ? 0.16 : 0.1 }]} />

        {/* Ikona — halqa + markaz */}
        <View style={styles.iconStage}>
          <View
            style={[
              styles.iconRing,
              { borderColor: accent, backgroundColor: theme.mode === "dark" ? "transparent" : "rgba(255,255,255,0.7)" },
            ]}
          />
          <View style={[styles.iconDisc, { backgroundColor: accent, shadowColor: accent, shadowOpacity: 0.45 }]}>
            <Icon name={icon} size={compact ? 26 : 32} color="#FFFFFF" />
          </View>
        </View>

        {!!title && (
          <Text style={[theme.type.title, styles.title, { color: theme.text }]}>
            {title}
          </Text>
        )}

        {!!subtitle && (
          <View style={[styles.hintWrap, { backgroundColor: theme.mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.035)" }]}>
            <Text style={[theme.type.bodySm, styles.subtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          </View>
        )}

        {!!onAction && (
          <AppButton
            label={action || t("emptyAction")}
            onPress={onAction}
            icon={actionIcon}
            size={compact ? "sm" : "md"}
            style={styles.action}
          />
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%", alignItems: "center" },
  card: {
    width: "100%",
    alignItems: "center",
    borderRadius: 26,
    borderWidth: 1,
    paddingVertical: 26,
    paddingHorizontal: 22,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -110,
    right: -60,
  },
  iconStage: { alignItems: "center", justifyContent: "center", marginBottom: 16 },
  iconRing: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    opacity: 0.5,
  },
  iconDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  title: { textAlign: "center", marginBottom: 10 },
  hintWrap: {
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 15,
    marginBottom: 18,
  },
  subtitle: { textAlign: "center" },
  action: { alignSelf: "stretch" },
});

export default EmptyState;
