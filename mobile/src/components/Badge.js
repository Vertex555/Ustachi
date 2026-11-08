import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import Icon from "./Icon";

// Yagona "badge"/"chip" komponenti.
// Oldin "Foydalanuvchi" kabi yorliqlar sarlavha yonida 9px shrift bilan
// qo'pol ko'rinardi. Endi izchil pill shaklga ega.

// tone: "primary" | "secondary" | "muted" | "success" | "warning" | "error" | "glass"
function Badge({ label, icon, tone = "muted", size = "md", style }) {
  const { theme } = useTheme();

  const tones = {
    primary:   { bg: theme.primaryLight,   fg: theme.primary,   bd: "transparent" },
    secondary: { bg: theme.secondaryLight, fg: theme.secondary, bd: "transparent" },
    success:   { bg: theme.successLight,   fg: theme.success,   bd: "transparent" },
    warning:   { bg: theme.warningLight,   fg: theme.warning,   bd: "transparent" },
    error:     { bg: theme.errorLight,     fg: theme.error,     bd: "transparent" },
    muted:     { bg: theme.cardAlt,        fg: theme.textSecondary, bd: theme.border },
    glass:     { bg: theme.glassFill,      fg: theme.text,     bd: theme.glassBorder },
  };
  const c = tones[tone] || tones.muted;

  const sm = size === "sm";
  const iconSize = sm ? 10 : 12;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          borderColor: c.bd,
          borderWidth: c.bd === "transparent" ? 0 : 1,
          paddingHorizontal: sm ? 7 : 9,
          paddingVertical: sm ? 2 : 3.5,
        },
        style,
      ]}
    >
      {!!icon && <Icon name={icon} size={iconSize} color={c.fg} />}
      <Text
        numberOfLines={1}
        style={{
          color: c.fg,
          fontSize: sm ? 10 : 11,
          fontWeight: "800",
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
});

export default Badge;
