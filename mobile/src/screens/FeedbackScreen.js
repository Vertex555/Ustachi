import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { apiUrl, authHeaders } from "../services/api";

const TYPES = ["suggestion", "complaint", "question", "praise"];

export function FeedbackScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const [type, setType] = useState(TYPES[0]);
  const [text, setText] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState(null);
  const [histPage, setHistPage] = useState(1);
  const [histHasMore, setHistHasMore] = useState(false);

  const loadHistory = useCallback(async (p = 1, append = false) => {
    try {
      const res = await fetch(apiUrl(`/api/feedback/my?page=${p}&limit=50`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setHistory((prev) => (append ? [...(prev || []), ...data.data] : data.data));
        setHistPage(p);
        setHistHasMore(!!(data.pagination && data.pagination.page < data.pagination.pages));
      }
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, [sentMsg, loadHistory]);

  const typeColor = (tp) => {
    if (tp === "complaint") return { icon: "alert-triangle", color: theme.error, bg: theme.errorLight };
    if (tp === "question") return { icon: "help-circle", color: theme.info, bg: theme.infoLight };
    if (tp === "praise") return { icon: "thumbs-up", color: theme.success, bg: theme.successLight };
    return { icon: "lightbulb", color: theme.warning, bg: theme.warningLight };
  };

  const autoMessage = (resType) => {
    if (resType === "praise") return t("fb_auto_praise");
    if (resType === "complaint") return t("fb_auto_complaint");
    if (resType === "question") return t("fb_auto_question");
    return t("fb_auto_suggestion");
  };

  const submit = async () => {
    if (!text.trim()) {
      setError(t("fb_empty"));
      return;
    }
    setError("");
    setSending(true);
    try {
      const res = await fetch(apiUrl("/api/feedback"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ type, text: text.trim(), contact: contact.trim() || undefined, lang }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSentMsg(autoMessage(type));
        setText("");
        setContact("");
        setTimeout(() => setSentMsg(""), 5000);
      } else {
        setError(data.message || t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setSending(false);
    }
  };

  const statusColor = (s) => {
    if (s === "answered") return { bg: theme.successLight, color: theme.success, label: t("fb_answered") };
    if (s === "viewed") return { bg: theme.infoLight, color: theme.info, label: t("fb_viewed") };
    return { bg: theme.warningLight, color: theme.warning, label: t("fb_new") };
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.85 }]}>
          <Icon name="chevron-left" size={26} color={theme.text} />
        </Pressable>
        <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text }}>{t("feedback")}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ ...theme.neumorph.raised, backgroundColor: theme.neumorph.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, marginBottom: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Icon name="message-square" size={18} color={theme.primary} />
            <Text style={{ fontSize: theme.font.base, fontWeight: "600", color: theme.text }}>{t("fb_type")}</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {TYPES.map((tp) => {
              const active = type === tp;
              const meta = typeColor(tp);
              return (
                <Pressable
                  key={tp}
                  onPress={() => setType(tp)}
                  style={({ pressed }) => [
                    ...theme.neumorph.raisedSm,
                    {
                      flexDirection: "row", alignItems: "center", gap: 6,
                      paddingVertical: 9, paddingHorizontal: 12, borderRadius: theme.radius.md,
                      borderColor: active ? meta.color : theme.border,
                      backgroundColor: active ? meta.bg : theme.bgSecondary,
                    },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Icon name={meta.icon} size={14} color={active ? meta.color : theme.textSecondary} />
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "600", color: active ? meta.color : theme.textSecondary }}>{t(`fb_type_${tp}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, ...theme.neumorph.raisedSm, backgroundColor: theme.bgSecondary, borderRadius: theme.radius.md, padding: 10, marginBottom: 12 }}>
          <Icon name={typeColor(type).icon} size={15} color={typeColor(type).color} style={{ marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>{autoMessage(type)}</Text>
          </View>
        </View>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("fb_placeholder")}
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={5}
          maxLength={2000}
          style={{ minHeight: 110, textAlignVertical: "top", backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, padding: 12, color: theme.text, fontSize: theme.font.base, marginBottom: 12 }}
        />

        <TextInput
          value={contact}
          onChangeText={setContact}
          placeholder={t("fb_contact")}
          placeholderTextColor={theme.textTertiary}
          style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm, padding: 12, color: theme.text, fontSize: theme.font.base, marginBottom: 12 }}
        />

        {!!error && <Text style={{ fontSize: theme.font.sm, color: theme.error, marginBottom: 12 }}>{error}</Text>}
        {!!sentMsg && (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: theme.successLight, borderWidth: 1, borderColor: theme.success, borderRadius: theme.radius.md, padding: 10, marginBottom: 12 }}>
            <Icon name="badge-check" size={16} color={theme.success} style={{ marginTop: 2 }} />
            <Text style={{ flex: 1, fontSize: theme.font.sm, color: theme.success, fontWeight: "600" }}>{sentMsg}</Text>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={sending}
          style={({ pressed }) => [
            { width: "100%", paddingVertical: 14, borderRadius: theme.radius.lg, backgroundColor: theme.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: sending ? 0.6 : 1 },
            pressed && { opacity: 0.85 },
          ]}
        >
          {sending ? <ActivityIndicator color={theme.textInverse} /> : <Icon name="send" size={18} color={theme.textInverse} />}
          <Text style={{ fontSize: theme.font.base, fontWeight: "700", color: theme.textInverse }}>{sending ? "... " : t("fb_send")}</Text>
        </Pressable>

        <View style={{ marginTop: 24 }}>
          <Text style={{ fontSize: theme.font.base, fontWeight: "600", color: theme.text, marginBottom: 10 }}>{t("fb_history")}</Text>
          {history && history.length === 0 && (
            <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, textAlign: "center", padding: 20 }}>{t("fb_emptyHistory")}</Text>
          )}
          {(history || []).map((f) => {
            const st = statusColor(f.status);
            const meta = typeColor(f.type);
            return (
              <View key={f.id} style={{ ...theme.neumorph.raisedSm, backgroundColor: theme.neumorph.surface, borderRadius: theme.radius.md, padding: 12, marginBottom: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <Icon name={meta.icon} size={14} color={meta.color} />
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "600", color: theme.text }}>{t(`fb_type_${f.type}`)}</Text>
                  <View style={{ backgroundColor: st.bg, borderRadius: 12, paddingVertical: 2, paddingHorizontal: 8 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: st.color }}>{st.label}</Text>
                  </View>
                  <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginLeft: "auto" }}>
                    {new Date(f.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={{ fontSize: theme.font.base, color: theme.text }}>{f.text}</Text>
                {!!f.adminNote && (
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, marginTop: 8, padding: 9, backgroundColor: theme.bgSecondary, borderRadius: theme.radius.sm, borderLeftWidth: 3, borderLeftColor: theme.primary }}>
                    <Icon name={f.status === "answered" ? "shield-check" : "info"} size={14} color={f.status === "answered" ? theme.success : theme.info} style={{ marginTop: 1 }} />
                    <Text style={{ flex: 1, fontSize: theme.font.sm, color: theme.textSecondary }}>{f.adminNote}</Text>
                  </View>
                )}
              </View>
            );
          })}
          {history && histHasMore && (
            <Pressable
              onPress={() => loadHistory(histPage + 1, true)}
              style={({ pressed }) => [
                {
                  marginTop: 14,
                  borderRadius: theme.radius.md,
                  borderWidth: 1.5,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  paddingVertical: 12,
                  alignItems: "center",
                  ...theme.neumorph.raisedSm,
                },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.primary }}>{t("loadMore")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default FeedbackScreen;