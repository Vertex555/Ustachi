import React from "react";
import { View, Text, Switch, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import Icon from "../Icon";
import { SettingsRow } from "./SettingsRow";

/** Switch bilan boshqariladigan qator. */
export function SwitchRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
  disabledNote,
  last,
}) {
  const { theme } = useTheme();
  return (
    <SettingsRow
      icon={icon}
      title={title}
      subtitle={subtitle}
      disabled={disabled}
      last={last}
      right={
        <Switch
          value={!!value}
          onValueChange={disabled ? undefined : onValueChange}
          disabled={!!disabled}
          trackColor={{ false: theme.border, true: theme.primary }}
          thumbColor="#FFFFFF"
          accessibilityLabel={title}
        />
      }
    />
  );
}

/**
 * Bir necha variantdan tanlash (segmented control).
 * Single source of truth — `value` va `options` ni ota komponent boshqaradi.
 */
export function SegmentedControl({ value, options, onChange, style }) {
  const { theme, reduceMotion } = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: theme.bgTertiary, borderColor: theme.border }, style]}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.segmentItem,
              {
                backgroundColor: selected ? theme.primary : "transparent",
                borderRadius: 9,
                opacity: pressed && !reduceMotion ? 0.85 : 1,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                fontSize: theme.font.sm,
                fontWeight: "700",
                color: selected ? theme.textInverse : theme.textSecondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Ko'p variantli tanlov (gorizontal chiqish). */
export function OptionList({ options, value, onChange, columns }) {
  const { theme } = useTheme();
  return (
    <View style={styles.optionGrid}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.option,
              {
                width: columns ? `${100 / columns - 1}%` : "100%",
                backgroundColor: selected ? theme.primaryLight : theme.bgSecondary,
                borderColor: selected ? theme.primary : theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.optionTextWrap}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: theme.font.sm,
                  fontWeight: "700",
                  color: selected ? theme.primary : theme.text,
                }}
              >
                {opt.label}
              </Text>
              {opt.description ? (
                <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 2 }} numberOfLines={2}>
                  {opt.description}
                </Text>
              ) : null}
            </View>
            {selected ? <Icon name="check" size={16} color={theme.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Yordamchi matn bilan guruh sarlavhasi (bo'lim ichida). */
export function SubLabel({ children, style }) {
  const { theme } = useTheme();
  return (
    <Text style={[{ fontSize: theme.font.sm, fontWeight: "700", color: theme.textSecondary, marginBottom: 8 }, style]}>
      {children}
    </Text>
  );
}

/** Eslatma/ogohlantirish bloklari. */
export function InfoNote({ children, tone = "info" }) {
  const { theme } = useTheme();
  const colors = {
    info: { bg: theme.primaryLight, border: theme.primary, text: theme.textSecondary },
    warn: { bg: theme.warningLight || "#FEF3C7", border: "#F59E0B", text: theme.textSecondary },
    danger: { bg: "#FEE2E2", border: "#DC2626", text: "#991B1B" },
  };
  const c = colors[tone] || colors.info;
  return (
    <View style={[styles.note, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={{ fontSize: theme.font.xs, color: c.text, lineHeight: 17 }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    paddingHorizontal: 4,
  },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  optionTextWrap: { flex: 1 },
  note: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginTop: 10,
  },
});
