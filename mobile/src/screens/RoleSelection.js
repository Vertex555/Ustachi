import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { apiUrl } from "../config";
import { authHeaders, getToken } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { setAuth } from "../services/authStore";
import Icon from "../components/Icon";

export function RoleSelectionScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(null);

  const pick = async (role) => {
    if (loading) return;
    setLoading(role);
    setError("");

    try {
      const response = await fetch(apiUrl("/api/users/me"), {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ role }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Rolni yangilashda xatolik");

      const updatedUser = data.user;
      setAuth(getToken(), updatedUser);
      if (updatedUser && updatedUser.role) {
        navigation.replace(updatedUser.role === "master" ? "MasterHome" : "UserHome");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(null);
    }
  };

  const roleCardStyle = ({ pressed }) => [
    {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: theme.radius.md,
      borderWidth: 2,
      borderColor: theme.border,
      backgroundColor: theme.surfaceHover,
      width: "100%",
    },
    pressed && { opacity: 0.85 },
  ];

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg, padding: theme.spacing.lg }}>
      <View style={{ backgroundColor: theme.neumorph.surface, paddingVertical: theme.spacing.xxl, paddingHorizontal: theme.spacing.xl, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raised, width: "100%", maxWidth: 380, alignItems: "center", gap: 20 }}>
        {!!navigation && (
          <Pressable
            onPress={() => navigation.goBack()}
            disabled={!!loading}
            hitSlop={8}
            style={({ pressed }) => [{ alignSelf: "flex-start", padding: 4 }, pressed && { opacity: 0.7 }]}
          >
            <Icon name="chevron-left" size={26} color={theme.text} />
          </Pressable>
        )}

        <View style={{ alignItems: "center", gap: 8 }}>
          <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
            <Icon name="wrench" size={26} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.primary, textAlign: "center" }}>Ustachi</Text>
          <Text style={{ fontSize: theme.font.sm, color: theme.textSecondary, textAlign: "center" }}>Davom etish uchun o'z rolingizni tanlang</Text>
          {!!error && <Text style={{ fontSize: theme.font.xs, color: theme.error, fontWeight: theme.font.bold, textAlign: "center" }}>{error}</Text>}
        </View>

        <View style={{ gap: 12, width: "100%" }}>
          <Pressable
            onPress={() => pick("user")}
            disabled={!!loading}
            style={roleCardStyle}
          >
            <View style={{ backgroundColor: theme.successLight, padding: 10, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center" }}>
              <Icon name="user" size={24} color={theme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: theme.font.md, fontWeight: theme.font.extrabold, color: theme.text, marginBottom: 2 }}>Foydalanuvchi</Text>
              <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>Qurilmamni ta'mirlatish uchun usta qidiraman</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => pick("master")}
            disabled={!!loading}
            style={roleCardStyle}
          >
            <View style={{ backgroundColor: theme.successLight, padding: 10, borderRadius: theme.radius.sm, alignItems: "center", justifyContent: "center" }}>
              <Icon name="hammer" size={24} color={theme.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: theme.font.md, fontWeight: theme.font.extrabold, color: theme.text, marginBottom: 2 }}>Usta</Text>
              <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary }}>Buyurtmalarni ko'rib chiqish va qabul qilish</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default RoleSelectionScreen;