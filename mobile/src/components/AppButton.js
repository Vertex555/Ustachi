import React from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../theme/ThemeContext";
import Icon from "./Icon";

// Yagona tugma — oldin har ekranda boshqa radius/soya/shrift/ikon uslubi.
// variant: "primary" | "secondary" | "ghost" | "danger" | "success"
// size:    "sm" | "md" | "lg"

function AppButton({
  label,
  onPress,
  icon,
  iconRight,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  full = true,
  style,
}) {
  const { theme } = useTheme();
  const off = disabled || loading;

  const sizes = {
    sm: { h: 38, px: 14, fs: 12.5, icon: 14, radius: 12 },
    md: { h: 48, px: 20, fs: 14.5, icon: 17, radius: 16 },
    lg: { h: 56, px: 24, fs: 16, icon: 19, radius: 18 },
  };
  const s = sizes[size] || sizes.md;

  const solid =
    variant === "secondary" ? [theme.secondary, theme.secondaryHover]
      : variant === "danger" ? [theme.error, "#B91C1C"]
        : variant === "success" ? [theme.success, theme.primaryHover]
          : [theme.primary, theme.primaryHover];

  const fg = variant === "ghost" ? theme.primary : theme.textInverse;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {!!icon && <Icon name={icon} size={s.icon} color={fg} />}
          <Text
            numberOfLines={1}
            style={{
              color: fg,
              fontSize: s.fs,
              fontWeight: "800",
              letterSpacing: 0.1,
            }}
          >
            {label}
          </Text>
          {!!iconRight && <Icon name={iconRight} size={s.icon} color={fg} />}
        </>
      )}
    </>
  );

  const inner = (
    <View style={[styles.inner, { height: s.h, paddingHorizontal: s.px, borderRadius: s.radius }]}>
      {content}
    </View>
  );

  // Yumshoq tugmalar — foni bilan birlashtiriladi
  if (variant === "ghost") {
    return (
      <Pressable
        onPress={onPress}
        disabled={off}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          { width: full ? "100%" : undefined, opacity: off ? 0.5 : 1 },
          pressed && { transform: [{ scale: 0.98 }], opacity: 0.8 },
          style,
        ]}
      >
        <View
          style={{
            height: s.h,
            borderRadius: s.radius,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            backgroundColor: theme.cardAlt,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          {content}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        { width: full ? "100%" : undefined, opacity: off ? 0.55 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        {
          borderRadius: s.radius,
          shadowColor: theme.mode === "dark" ? "#000" : solid[1],
          shadowOpacity: theme.mode === "dark" ? 0.45 : 0.32,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 5,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={solid}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: s.radius }}
      >
        {inner}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});

export default AppButton;
