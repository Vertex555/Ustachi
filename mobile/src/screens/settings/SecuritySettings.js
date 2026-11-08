import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../../components/settings/SettingsScreen";
import { SettingsSection, SettingsRow } from "../../components/settings/SettingsRow";
import { InfoNote } from "../../components/settings/Controls";
import AppButton from "../../components/AppButton";
import Icon from "../../components/Icon";
import { setToken } from "../../services/api";
import { clearAuth, getAuthUser } from "../../services/authStore";
import {
  listSessions,
  revokeSession,
  logoutAll,
  getDeletionPreview,
  requestAccountDeletion,
  confirmAccountDeletion,
} from "../../services/settingsApi";

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function SecuritySettings() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const user = getAuthUser();

  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [codeInput, setCodeInput] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [s, p] = await Promise.all([listSessions(), getDeletionPreview()]);
      setSessions(Array.isArray(s?.data) ? s.data : []);
      setPreview(p?.data || null);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onLogoutAll() {
    Alert.alert(t("logoutAll"), t("activeSessionsNote"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("confirm"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            const res = await logoutAll();
            // Server joriy qurilmaga yangi token beradi — foydalanuvchi chiqmasin
            if (res?.token) setToken(res.token);
            await load();
          } catch (err) {
            Alert.alert(t("error"), err.message);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  async function onRevoke(s) {
    try {
      await revokeSession(s.id);
      await load();
    } catch (err) {
      Alert.alert(t("error"), err.message);
    }
  }

  async function onRequestDeletion() {
    setBusy(true);
    try {
      const res = await requestAccountDeletion();
      // Development muhitida kod javobda qaytadi (Telegram yo'q bo'lsa)
      setDevCode(res?.devCode || "");
      setDeleteOpen(true);
    } catch (err) {
      Alert.alert(t("error"), err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmDeletion() {
    if (!codeInput.trim()) return;
    setBusy(true);
    try {
      await confirmAccountDeletion(codeInput.trim());
      setDeleteOpen(false);
      clearAuth();
    } catch (err) {
      Alert.alert(t("error"), err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("security")} subtitle={t("securityNote")} />

      <SettingsScroll refreshing={loading} onRefresh={load}>
        <SettingsSection title={t("profile")}>
          <SettingsRow icon="phone" title={t("phoneNumber")} value={user?.phone || "—"} disabled />
          <SettingsRow
            icon="key"
            title={t("changePhone")}
            onPress={() => Alert.alert(t("changePhone"), t("securityNote"))}
            last
          />
        </SettingsSection>

        <SettingsSection title={t("activeSessions")} note={t("activeSessionsNote")}>
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : !sessions || sessions.length === 0 ? (
            <SettingsRow title={t("activeSessions")} value="—" disabled last />
          ) : (
            sessions.map((s, i) => (
              <SettingsRow
                key={s.id || i}
                icon="smartphone"
                title={s.device || t("currentSession")}
                subtitle={[
                  s.platform,
                  s.isCurrent ? t("currentSession") : null,
                  s.createdAt ? formatDate(s.createdAt) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                last={i === sessions.length - 1}
                right={
                  s.isCurrent ? (
                    <View style={[styles.tag, { backgroundColor: theme.primaryLight }]}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: theme.primary }}>
                        {t("currentSession")}
                      </Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => onRevoke(s)} style={styles.revokeBtn} accessibilityLabel={t("revokeSession")}>
                      <Icon name="log-out" size={15} color={theme.danger || "#E11D48"} />
                    </Pressable>
                  )
                }
              />
            ))
          )}
        </SettingsSection>

        <AppButton
          label={busy ? t("loading") : t("logoutAll")}
          icon="log-out"
          onPress={onLogoutAll}
          loading={busy}
          variant="secondary"
        />

        <View style={{ height: 26 }} />

        {/* Hisobni o'chirish */}
        <SettingsSection title={t("deleteAccount")}>
          <View style={styles.deleteCard}>
            <InfoNote tone="danger">
              {t("deleteAccountWarning")}
            </InfoNote>
            {preview ? (
              <View style={styles.stats}>
                <Stat label={t("myOrders")} value={preview.orders} />
                <Stat label={t("chats")} value={preview.chats} />
                <Stat label={t("paymentCards")} value={preview.cards} />
                <Stat label={t("activeSessions")} value={preview.sessions} />
              </View>
            ) : null}
            <AppButton
              label={t("deleteAccount")}
              icon="trash-outline"
              onPress={onRequestDeletion}
              loading={busy}
              variant="danger"
              style={{ marginTop: 12 }}
            />
          </View>
        </SettingsSection>

        {deleteOpen ? (
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={{ fontSize: theme.font.base, fontWeight: "800", color: theme.text }}>
              {t("deleteAccountConfirm")}
            </Text>
            <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 6 }}>
              {t("deleteAccountSent")}
            </Text>
            {devCode ? (
              <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.primary, marginTop: 8 }}>
                DEV: {devCode}
              </Text>
            ) : null}
            <View style={styles.codeRow}>
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                placeholder="0000"
                placeholderTextColor={theme.textTertiary}
                keyboardType="number-pad"
                maxLength={6}
                style={[styles.codeInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.bgSecondary }]}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AppButton label={t("cancel")} variant="ghost" full={false} onPress={() => setDeleteOpen(false)} style={{ flex: 1 }} />
              <AppButton label={t("deleteAccount")} variant="danger" full={false} onPress={onConfirmDeletion} loading={busy} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}
      </SettingsScroll>
    </View>
  );
}

function Stat({ label, value }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.bgSecondary, borderColor: theme.border }]}>
      <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text }}>{value ?? 0}</Text>
      <Text style={{ fontSize: 10, color: theme.textTertiary, textAlign: "center" }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  revokeBtn: { padding: 8 },
  deleteCard: { padding: 14 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  stat: {
    flexGrow: 1,
    minWidth: 70,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  modalCard: {
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  codeRow: { marginVertical: 12 },
  codeInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 6,
  },
});
