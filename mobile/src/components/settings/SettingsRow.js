import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import Card from "../Card";
import Icon from "../Icon";

// Sozlamalar ekrani uchun umumiy qismlar: sarlavha + qator.
// Barcha qatorlar bitta kartochka ichida, oraliqda ingichka ajratkich bilan.

export function SettingsSection({ title, children, note }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 22 }}>
      {title ? (
        <Text
          style={{
            fontSize: theme.font.sm,
            fontWeight: "800",
            color: theme.textTertiary,
            textTransform: "uppercase",
            letterSpacing: 0.8,
            marginBottom: 10,
            paddingHorizontal: 4,
          }}
        >
          {title}
        </Text>
      ) : null}
      <Card padding={0}>
        <View style={styles.sectionBody}>{children}</View>
      </Card>
      {note ? (
        <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 8, paddingHorizontal: 4 }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

export function SettingsRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onPress,
  right,
  danger,
  disabled,
  last,
}) {
  const { theme, reduceMotion } = useTheme();
  const isPressable = typeof onPress === "function" && !disabled;
  const color = danger ? theme.danger || "#E11D48" : theme.text;

  const body = (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.border,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      {icon ? (
        <View style={[styles.iconBox, { backgroundColor: theme.bgTertiary, borderColor: theme.border }]}>
          <Icon name={icon} size={17} color={iconColor || (danger ? color : theme.primary)} />
        </View>
      ) : null}

      <View style={styles.rowText}>
        <Text style={{ fontSize: theme.font.base, fontWeight: "600", color }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 2 }} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text style={{ fontSize: theme.font.sm, color: theme.textSecondary }} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {isPressable ? <Icon name="chevron-right" size={18} color={theme.textTertiary} /> : null}
    </View>
  );

  if (!isPressable) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => (pressed && !reduceMotion ? { opacity: 0.85 } : pressed ? { opacity: 0.85 } : null)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionBody: { width: "100%" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 56,
  },
  rowText: { flex: 1 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
