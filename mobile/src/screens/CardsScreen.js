import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { apiUrl, authHeaders } from "../services/api";

function sanitizeDigits(s) {
  return String(s || "").replace(/\D/g, "");
}

function luhnOk(num) {
  const digits = sanitizeDigits(num);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

const BRAND_COLORS = {
  visa: ["#1A1F71", "#23278F"],
  mastercard: ["#EB001B", "#F79E1B"],
  amex: ["#0F766E", "#115E59"],
  humo: ["#0B5EA5", "#12304A"],
  uzcard: ["#BC8500", "#856200"],
  card: ["#3730A3", "#4C1D95"],
};

function CardFace({ theme, c }) {
  const colors = BRAND_COLORS[String(c.brand || "").toLowerCase()] || BRAND_COLORS.card;
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 1.586,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors[0],
        padding: 16,
        justifyContent: "space-between",
        ...theme.shadowLg,
      }}
    >
      <View style={{ position: "absolute", top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.08)" }} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 1.5, color: "#fff", opacity: 0.9 }}>USTACHI PAY</Text>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" }}>
          <Icon name="credit-card" size={14} color="#fff" />
        </View>
      </View>
      <Text style={{ fontSize: 18, letterSpacing: 2, fontWeight: "700", color: "#fff" }}>
        {"\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022"} {c.last4}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text style={{ fontSize: 8, color: "#fff", opacity: 0.7, letterSpacing: 1, marginBottom: 2 }}>KARTA EGASI</Text>
          <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}>{c.holderName || "\u2014"}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 8, color: "#fff", opacity: 0.7, letterSpacing: 1, marginBottom: 2 }}>{c.expMonth}/{c.expYear}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff", textTransform: "uppercase" }}>{c.brand}</Text>
            {c.isDefault ? <Icon name="star-filled" size={12} color="#FBBF24" /> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export function CardsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [cards, setCards] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [num, setNum] = useState("");
  const [holder, setHolder] = useState("");
  const [exp, setExp] = useState("");
  const [cardName, setCardName] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/cards"), { headers: authHeaders() });
      const data = await res.json();
      setCards(data.data || []);
    } catch {
      setCards([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submitAdd = async () => {
    setError("");
    const digits = sanitizeDigits(num);
    if (!luhnOk(digits)) { setError(t("cardInvalid")); return; }
    const expM = sanitizeDigits(exp.slice(0, 2));
    // Backend 4 xonali yilni talab qiladi (2000–2100)
    const expY = sanitizeDigits(exp.slice(2));
    if (!expM || expM < 1 || expM > 12 || String(expY).length !== 4) { setError(t("cardExpInvalid")); return; }
    if (!holder.trim()) { setError(t("cardholderName")); return; }

    setSaving(true);
    try {
      // XAVFSIZLIK: PAN va CVV hech qachon serverga yuborilmaydi.
      // Faqat brend, network va oxirgi 4 raqam saqlanadi.
      const res = await fetch(apiUrl("/api/cards"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          cardName: cardName.trim() || undefined,
          holderName: holder.trim(),
          cardNumber: digits,
          expMonth: expM,
          expYear: expY,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || t("error"));
        return;
      }
      setAddOpen(false);
      setNum(""); setHolder(""); setExp(""); setCardName("");
      load();
    } catch {
      setError(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const removeCard = async (id) => {
    try {
      await fetch(apiUrl(`/api/cards/${id}`), { method: "DELETE", headers: authHeaders() });
      load();
    } catch {}
  };

  const setDefault = async (id) => {
    try {
      await fetch(apiUrl(`/api/cards/${id}/set-default`), { method: "POST", headers: authHeaders() });
      load();
    } catch {}
  };

  const inputStyle = {
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm,
    color: theme.text,
    fontSize: theme.font.base,
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.85 }]}>
            <Icon name="chevron-left" size={26} color={theme.text} />
          </Pressable>
          <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text }}>{t("myCards")}</Text>
        </View>
        <Pressable
          onPress={() => { setError(""); setAddOpen(true); }}
          style={({ pressed }) => [
            { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: theme.radius.md, backgroundColor: theme.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="plus" size={16} color={theme.textInverse} />
          <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.textInverse }}>{t("addCard")}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 }}>
          <Icon name="shield-check" size={14} color={theme.success} />
          <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, flex: 1 }}>{t("cardSecureHint")}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: theme.primaryLight, borderRadius: 12, padding: 12, marginBottom: 16 }}>
          <Icon name="info" size={16} color={theme.primary} />
          <Text style={{ flex: 1, fontSize: theme.font.xs, color: theme.textSecondary, lineHeight: 16 }}>
            {t("cardPaymentsDisabled")}
          </Text>
        </View>

        {cards === null ? (
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : cards.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 50 }}>
            <Icon name="credit-card" size={48} color={theme.textTertiary} />
            <Text style={{ fontSize: theme.font.base, color: theme.textTertiary, marginTop: 12 }}>{t("noCardsTitle")}</Text>
            <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary, marginTop: 4 }}>{t("noCardsHint")}</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {cards.map((c) => (
              <View key={c.id}>
                <CardFace theme={theme} c={c} />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                  {!c.isDefault && (
                    <Pressable
                      onPress={() => setDefault(c.id)}
                      style={({ pressed }) => [
                        { paddingVertical: 7, paddingHorizontal: 12, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm },
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={{ fontSize: theme.font.xs, fontWeight: "600", color: theme.textSecondary }}>{t("makeDefault")}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => removeCard(c.id)}
                    style={({ pressed }) => [
                      { paddingVertical: 7, paddingHorizontal: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.error, backgroundColor: theme.errorLight, flexDirection: "row", alignItems: "center", gap: 4 },
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Icon name="trash-2" size={13} color={theme.error} />
                    <Text style={{ fontSize: theme.font.xs, fontWeight: "600", color: theme.error }}>{t("delete")}</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.6)", alignItems: "center", justifyContent: "center", padding: 16 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={{ width: "100%", maxWidth: 440, backgroundColor: theme.surface, borderRadius: theme.radius.xl, padding: 20, ...theme.shadowXl, maxHeight: "90%" }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text, marginBottom: 16 }}>{t("addCard")}</Text>

              <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, marginBottom: 4 }}>{t("cardNumber")}</Text>
              <TextInput
                value={num}
                onChangeText={(v) => setNum(sanitizeDigits(v).slice(0, 16))}
                placeholder="8600 0000 0000 0000"
                placeholderTextColor={theme.textTertiary}
                keyboardType="number-pad"
                style={[inputStyle, { marginBottom: 12 }]}
              />

              <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, marginBottom: 4 }}>{t("cardholderName")}</Text>
              <TextInput
                value={holder}
                onChangeText={(v) => setHolder(v.toUpperCase())}
                placeholder="JON DOE"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="characters"
                style={[inputStyle, { marginBottom: 12 }]}
              />

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, marginBottom: 4 }}>{t("expiry")}</Text>
                <TextInput
                  value={exp}
                  onChangeText={(v) => setExp(sanitizeDigits(v).slice(0, 6))}
                  placeholder="MMYYYY"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="number-pad"
                  style={inputStyle}
                />
              </View>

              <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginBottom: 12, lineHeight: 16 }}>
                {t("cardNoCvvNote")}
              </Text>

              <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, marginBottom: 4 }}>{t("cardName")}</Text>
              <TextInput
                value={cardName}
                onChangeText={setCardName}
                placeholder="Visa Classic"
                placeholderTextColor={theme.textTertiary}
                style={[inputStyle, { marginBottom: 14 }]}
              />

              {!!error && <Text style={{ fontSize: theme.font.sm, color: theme.error, marginBottom: 10 }}>{error}</Text>}

              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => { setAddOpen(false); setError(""); }}
                  style={({ pressed }) => [
                    { flex: 1, paddingVertical: 12, backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm, alignItems: "center" },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "600", color: theme.text }}>{t("cancel")}</Text>
                </Pressable>
                <Pressable
                  onPress={submitAdd}
                  disabled={saving}
                  style={({ pressed }) => [
                    { flex: 2, paddingVertical: 12, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: "center" },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  {saving ? <ActivityIndicator color={theme.textInverse} /> : <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.textInverse }}>{t("save")}</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

export default CardsScreen;
