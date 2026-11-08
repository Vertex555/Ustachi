import React, { useState, useRef } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView, Linking } from "react-native";
import { apiUrl } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { setAuth } from "../services/authStore";
import Icon from "../components/Icon";

export function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [linkState, setLinkState] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const stopLinkingRef = useRef(false);

  const rnDevCode = Platform.OS === "android" ? "rn-android" : Platform.OS === "ios" ? "rn-ios" : null;

  const requestCode = async (phone) => {
    const response = await fetch(apiUrl("/api/auth/send-code"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || t("error"));
    return data;
  };

  const waitForTelegramLink = (phone) => {
    return new Promise((resolve) => {
      let tries = 0;
      const timer = setInterval(async () => {
        if (stopLinkingRef.current) { clearInterval(timer); resolve(false); return; }
        tries += 1;
        try {
          const res = await fetch(apiUrl(`/api/auth/telegram-status?phone=${encodeURIComponent(phone)}`));
          const data = await res.json();
          if (data.success && data.linked) { clearInterval(timer); resolve(true); return; }
        } catch {}
        if (tries >= 150) { clearInterval(timer); resolve(false); }
      }, 2000);
    });
  };

  const goVerify = (fullPhoneNumber) => {
    navigation.navigate("Verification", { phone: fullPhoneNumber, devCode: rnDevCode });
  };

  const handleSendCode = async () => {
    setIsLoading(true);
    setError("");
    setInfoMessage("");
    stopLinkingRef.current = false;

    const cleanNumber = phoneNumber.replace(/\s/g, "");
    if (cleanNumber.length !== 9) {
      setError(t("phoneError"));
      setIsLoading(false);
      return;
    }
    const fullPhoneNumber = `+998${cleanNumber}`;

    try {
      const data = await requestCode(fullPhoneNumber);
      if (data.needTelegram) {
        setLinkState({
          phone: fullPhoneNumber,
          deepLink: data.deepLink || `https://t.me/${data.botUsername}?start=${data.linkToken}`,
        });
        setInfoMessage(t("telegramNeedStart"));
        setIsLinking(true);
        const linked = await waitForTelegramLink(fullPhoneNumber);
        setIsLinking(false);
        if (linked) {
          stopLinkingRef.current = false;
          await requestCode(fullPhoneNumber);
          goVerify(fullPhoneNumber);
        } else if (!stopLinkingRef.current) {
          setError(t("error"));
          setLinkState(null);
        }
      } else {
        goVerify(fullPhoneNumber);
      }
    } catch (err) {
      setError(err.message || t("error"));
    } finally {
      setIsLoading(false);
    }
  };

  const cancelLinking = () => {
    stopLinkingRef.current = true;
    setIsLinking(false);
    setLinkState(null);
    setInfoMessage("");
  };

  const handleGuest = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/guest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("error"));
      setAuth(data.token, data.user);
    } catch (err) {
      Alert.alert(t("error"), err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={8}
            style={({ pressed }) => [{ padding: 4, marginBottom: 16, alignSelf: "flex-start" }, pressed && { opacity: 0.7 }]}
          >
            <Icon name="chevron-left" size={28} color={theme.text} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 24, flex: 1, justifyContent: "center", width: "100%", maxWidth: 360, alignSelf: "center" }}>
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: theme.font.xxxl, fontWeight: theme.font.extrabold, letterSpacing: -0.5, color: theme.text, marginBottom: 8, textAlign: "left" }}>
              {t("welcomeBack")} 👋
            </Text>
            <Text style={{ fontSize: theme.font.base, color: theme.textSecondary, lineHeight: 21 }}>
              {t("loginDesc")}
            </Text>
          </View>

          {!!error && (
            <View style={{ backgroundColor: theme.errorLight, padding: 10, borderRadius: theme.radius.sm, marginBottom: 15, borderWidth: 1, borderColor: theme.error }}>
              <Text style={{ color: theme.error, fontSize: theme.font.sm, fontWeight: theme.font.semibold, textAlign: "center" }}>{error}</Text>
            </View>
          )}

          {!error && !!infoMessage && (
            <View style={{ backgroundColor: theme.infoLight, padding: 10, borderRadius: theme.radius.sm, marginBottom: 15, borderWidth: 1, borderColor: theme.info }}>
              <Text style={{ color: theme.info, fontSize: theme.font.sm, fontWeight: theme.font.semibold, textAlign: "center" }}>{infoMessage}</Text>
            </View>
          )}

          {!!linkState && (
            <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, padding: theme.spacing.lg, marginBottom: 16, ...theme.shadowMd }}>
              <Text style={{ fontSize: theme.font.base, fontWeight: theme.font.extrabold, color: theme.text, marginBottom: 10 }}>
                🔐 {t("telegramLink")}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: theme.font.sm, lineHeight: 21, marginBottom: 4 }}>
                {`${1}. ${t("telegramStep1")}`}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: theme.font.sm, lineHeight: 21, marginBottom: 14 }}>
                {`${2}. ${t("telegramStep2")}`}
              </Text>
              <Pressable
                onPress={() => { if (linkState.deepLink) Linking.openURL(linkState.deepLink).catch(() => {}); }}
                style={({ pressed }) => [{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: 14, borderRadius: theme.radius.md, backgroundColor: "#229ED9" }, pressed && { opacity: 0.85 }]}
              >
                <Icon name="send" size={18} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontWeight: theme.font.bold, fontSize: theme.font.base }}>{t("telegramOpenInTelegram")}</Text>
              </Pressable>
              <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 12, textAlign: "center" }}>
                {isLinking ? t("telegramWaiting") : t("telegramNeedStart")}
              </Text>
              <Pressable
                onPress={cancelLinking}
                disabled={!isLinking}
                style={({ pressed }) => [{ marginTop: 6, alignSelf: "center", opacity: isLinking ? 1 : 0.4 }, pressed && { opacity: 0.6 }]}
              >
                <Text style={{ color: theme.textTertiary, fontSize: theme.font.sm, fontWeight: theme.font.bold, textDecorationLine: "underline", textAlign: "center" }}>
                  {t("cancel")}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={{ gap: 10, marginBottom: 20 }}>
            <Text style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold, color: theme.text }}>{t("phoneNumber")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radiusLg, ...theme.neumorph.raisedSm, paddingVertical: 14, paddingHorizontal: 18, ...theme.shadowSm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRightWidth: 1, borderRightColor: theme.border, paddingRight: 14, marginRight: 14 }}>
                <View style={{ width: 28, height: 18, borderRadius: 3, overflow: "hidden", borderWidth: 1, borderColor: theme.border }}>
                  <View style={{ height: "33%", backgroundColor: "#0099ff" }} />
                  <View style={{ height: "34%", backgroundColor: "#FFFFFF" }} />
                  <View style={{ height: "33%", backgroundColor: "#33cc33" }} />
                </View>
                <Text style={{ fontSize: theme.font.md, fontWeight: theme.font.bold, color: theme.text }}>+998</Text>
              </View>
              <TextInput
                value={phoneNumber}
                onChangeText={(v) => setPhoneNumber(v.replace(/\D/g, ""))}
                placeholder="90 123 45 67"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                maxLength={9}
                editable={!isLoading}
                style={{ flex: 1, padding: 0, fontSize: theme.font.lg, fontWeight: theme.font.semibold, color: theme.text }}
              />
            </View>
          </View>

          <Pressable
            onPress={handleSendCode}
            disabled={isLoading}
            style={({ pressed }) => [
              {
                backgroundColor: isLoading ? theme.primaryHover : theme.primary,
                paddingVertical: 18,
                borderRadius: theme.radius.xl,
                alignItems: "center",
                justifyContent: "center",
                ...theme.shadowMd,
                shadowColor: theme.primary,
                shadowOpacity: theme.mode === "dark" ? 0.3 : 0.3,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            {isLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ActivityIndicator size="small" color={theme.textInverse} />
                <Text style={{ color: theme.textInverse, fontWeight: theme.font.bold, fontSize: theme.font.lg }}>
                  {isLinking ? t("telegramWaiting") : t("loading")}
                </Text>
              </View>
            ) : (
              <Text style={{ color: theme.textInverse, fontWeight: theme.font.bold, fontSize: theme.font.lg }}>{t("sendCode")}</Text>
            )}
          </Pressable>

          <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 24 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
            <Text style={{ paddingHorizontal: 14, fontSize: theme.font.base, color: theme.textTertiary, fontWeight: theme.font.semibold }}>{t("or")}</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
          </View>

          <Pressable
            onPress={handleGuest}
            disabled={isLoading}
            style={({ pressed }) => [
              {
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.border,
                paddingVertical: 18,
                borderRadius: theme.radius.xl,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                ...theme.shadowSm,
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="user" size={22} color={theme.textSecondary} />
            <Text style={{ color: theme.text, fontWeight: theme.font.bold, fontSize: theme.font.md }}>{t("continueAsGuest")}</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 16, alignItems: "center" }}>
          <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, textAlign: "center", lineHeight: 18 }}>
            {t("byContinuing")}{"\n"}
            <Text style={{ color: theme.primary, fontWeight: theme.font.bold }}>{t("terms")}</Text> {t("and")}{" "}
            <Text style={{ color: theme.primary, fontWeight: theme.font.bold }}>{t("privacy")}</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default LoginScreen;