import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import Icon from "./Icon";

// Yagona kartochka — avval har ekranda boshqa radius/soya/border ishlatilgan.
// Endi barcha ro'yxat kartalari shu komponent orqali chiziladi.

// variant: "card" (asosiy) | "alt" (ikkilamchi) | "inset" | "glass" (glassmorphism)
function Card({
  children,
  onPress,
  variant = "card",
  padding,
  radius,
  accent,
  style,
  disabled,
  ...rest
}) {
  const { theme } = useTheme();
  const isPressable = typeof onPress === "function";

  const surface =
    variant === "alt" ? theme.cardAlt
      : variant === "inset" ? theme.cardInset
        : variant === "glass" ? theme.glassFill
          : theme.card;

  const body = (
    <View
      style={[
        styles.base,
        {
          backgroundColor: surface,
          borderRadius: radius ?? (variant === "glass" ? theme.cardGeom.radiusLg : theme.cardGeom.radius),
          borderColor: variant === "glass" ? theme.glassBorder : theme.border,
          padding: padding ?? theme.cardGeom.padding,
        },
        // Kartochka foni bilan real soya (floating effekt)
        theme.mode === "dark"
          ? { borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.34, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5 }
          : { borderWidth: 1, shadowColor: "#0F172A", shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
        // Rangli chap chegara — "vibrant" kayfiyat
        accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (!isPressable) return body;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        { borderRadius: radius ?? theme.cardGeom.radius, transform: [{ scale: pressed ? 0.985 : 1 }] },
        pressed && { opacity: 0.94 },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: "100%", overflow: "hidden" },
});

export default Card;
