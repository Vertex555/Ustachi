import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import Icon from "./Icon";

// Yagona sarlavha bloki — ro'yxatli sahifalar (Saqlangan / Buyurtmalar / Xabarlar)
// oldin "oddiy veb sahifa" kabi ko'rinardi. Endi har sahifa boy rangli
// gradient sarlavha + pastga chiqadigan "varaq" (sheet) oladi.
//
// Bu komponent orqali sarlavha, ikon, matn ierarxiyasi va ranglar
// butun ilovada bir xil bo'ladi.

function ScreenHeader({
  title,
  subtitle,
  icon,
  accent = "chevron-right",
  count,
  action,
  onAction,
  tone = "auto", // "auto" | "primary" | "secondary" | "dark"
  children,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const palette = (() => {
    if (tone === "primary") return [theme.primary, theme.headerTo];
    if (tone === "secondary") return [theme.secondary, theme.headerTo];
    if (tone === "dark") return [theme.headerTo, theme.bg];
    return [theme.headerFrom, theme.headerTo];
  })();

  return (
    <LinearGradient
      colors={palette}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, { paddingTop: insets.top + 14 }]}
    >
      {/* Dekorativ yorug'lik dog'lari — gradientni jonli qiladi */}
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: theme.headerGlow, top: -70, right: -50 }]} />
      <View pointerEvents="none" style={[styles.glowSmall, { backgroundColor: theme.headerGlow, bottom: -40, left: -30 }]} />

      <View style={styles.row}>
        {!!icon && (
          <View style={styles.iconWrap}>
            <Icon name={icon} size={22} color="#FFFFFF" />
          </View>
        )}

        <View style={styles.textCol}>
          {!!subtitle && <Text style={styles.overline}>{subtitle}</Text>}
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
        </View>

        {(count !== undefined && count !== null) || (!!action && !!onAction) ? (
          <View style={styles.trailing}>
            {count !== undefined && count !== null && (
              <View style={styles.countPill}>
                <Text style={styles.countText}>{count}</Text>
              </View>
            )}
            {!!action && !!onAction && (
              <Pressable
                onPress={onAction}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={action}
                style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75, transform: [{ scale: 0.94 }] }]}
              >
                <Icon name={accent} size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        ) : null}
      </View>

      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  glow: { position: "absolute", width: 190, height: 190, borderRadius: 95, opacity: 0.18 },
  glowSmall: { position: "absolute", width: 120, height: 120, borderRadius: 60, opacity: 0.12 },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  textCol: { flex: 1, minWidth: 0 },
  overline: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  trailing: { flexDirection: "row", alignItems: "center", gap: 8 },
  countPill: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 9,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ScreenHeader;
