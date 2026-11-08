import React from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";

export function ConfirmLogoutModal({ open, onCancel, onConfirm, title, message }) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}>
        <Pressable
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onCancel}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ width: "100%", maxWidth: 360, backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: 20, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ fontSize: 16, fontWeight: "800", color: theme.text, textAlign: "center", marginBottom: 8 }}>
            {title || t("logout")}
          </Text>
          {!!message && (
            <Text style={{ fontSize: 13, color: theme.textSecondary, textAlign: "center", lineHeight: 19, marginBottom: 16 }}>
              {message}
            </Text>
          )}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, alignItems: "center" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>{t("cancel")}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, backgroundColor: theme.error, alignItems: "center" },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: 14, fontWeight: "800", color: "#FFFFFF" }}>{t("logoutConfirm") || t("logout")}</Text>
            </Pressable>
          </View>
        </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default ConfirmLogoutModal;