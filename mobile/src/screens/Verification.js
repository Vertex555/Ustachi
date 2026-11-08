import React, { useState, useEffect, useRef } from "react";
import { View, Text, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRoute } from "@react-navigation/native";
import { apiUrl } from "../config";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { setAuth } from "../services/authStore";
import Icon from "../components/Icon";

export function VerificationScreen({ navigation }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const route = useRoute();
  const { phone, devCode } = route.params ?? {};

  const [code, setCode] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successIndex, setSuccessIndex] = useState(-1);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (code.length === 4 && !verifyingRef.current) {
      verifyingRef.current = true;
      const verifyCodeWithBackend = async () => {
        setIsLoading(true);
        setError("");
        try {
          const response = await fetch(apiUrl("/api/auth/verify"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, code: code.join("") }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || t("codeError"));

          setIsLoading(false);
          setIsSuccess(true);

          let currentIndex = 0;
          const interval = setInterval(() => {
            if (currentIndex < 4) {
              setSuccessIndex(currentIndex);
              currentIndex++;
            } else {
              clearInterval(interval);
              setTimeout(() => {
                setAuth(data.token, data.user);
              }, 300);
            }
          }, 180);
        } catch (err) {
          setError(err.message || t("codeError"));
          setIsLoading(false);
          setCode([]);
          verifyingRef.current = false;
        }
      };

      verifyCodeWithBackend();
    }
  }, [code, phone, t]);

  const handleKeyPress = (num) => {
    if (code.length < 4 && !isLoading && !isSuccess) {
      setCode([...code, num]);
    }
  };

  const handleDelete = () => {
    if (!isLoading && !isSuccess) {
      setCode(code.slice(0, -1));
      setError("");
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      const response = await fetch(apiUrl("/api/auth/send-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || t("tryAgain"));
      if (data.devCode) Alert.alert(t("ver_devCode"), String(data.devCode));
    } catch (err) {
      setError(err.message);
    }
  };

  const keypadButtonStyle = {
    backgroundColor: theme.neumorph.surface,
    borderRadius: theme.neumorph.radius,
    ...theme.neumorph.raisedSm,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...theme.shadowSm,
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ flex: 1, justifyContent: "space-between", padding: 24, backgroundColor: theme.bg }}>
        <View style={{ alignItems: "flex-start" }}>
          <Pressable
            onPress={() => navigation.goBack()}
            disabled={isLoading || isSuccess}
            hitSlop={8}
            style={({ pressed }) => [{ paddingVertical: 4, opacity: isLoading || isSuccess ? 0.4 : 1 }, pressed && { opacity: 0.7 }]}
          >
            <Icon name="chevron-left" size={28} color={theme.text} />
          </Pressable>
        </View>

        <View style={{ marginVertical: 10, alignItems: "center" }}>
          <Text style={{ fontSize: 26, fontWeight: "800", letterSpacing: -0.5, color: theme.text, textAlign: "center", marginBottom: 8 }}>
            {isSuccess ? t("ver_success") : t("ver_title")}
          </Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, textAlign: "center", lineHeight: 20 }}>
            {isSuccess ? t("ver_successDesc") : t("ver_subtitle")}
            {!isSuccess && (
              <Text style={{ fontWeight: "700", color: theme.text }}>{"\n"}{phone}</Text>
            )}
          </Text>

          {!!error && (
            <Text style={{ color: theme.error, fontSize: 14, fontWeight: "600", textAlign: "center", marginTop: 10 }}>{error}</Text>
          )}

          {!!devCode && !isSuccess && (
            <Text style={{ color: theme.info, fontSize: 13, fontWeight: "700", textAlign: "center", marginTop: 10 }}>
              {t("ver_devCode")} {devCode}
            </Text>
          )}

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 12, marginVertical: 28 }}>
            {[0, 1, 2, 3].map((index) => {
              const isActiveSuccess = successIndex >= index;
              return (
                <View
                  key={index}
                  style={{
                    width: 60,
                    height: 64,
                    backgroundColor: isActiveSuccess ? theme.primaryLight : theme.neumorph.insetBg,
                    borderWidth: isActiveSuccess || isActive ? 2 : 0,
                    borderColor: isActiveSuccess ? theme.primary : isActive ? theme.accent : "transparent",
                    borderRadius: theme.neumorph.radius,
                    alignItems: "center",
                    justifyContent: "center",
                    ...(isActiveSuccess || isActive ? { ...theme.neumorph.raisedSm } : theme.neumorph.inset),
                  }}
                >
                  {isLoading && index === 3 ? (
                    <ActivityIndicator size="small" color={theme.textSecondary} />
                  ) : isSuccess && index === 3 ? (
                    <Icon name="check-circle" size={28} color={theme.primary} />
                  ) : (
                    <Text style={{ fontSize: 24, fontWeight: "700", color: isActiveSuccess ? theme.primary : theme.text }}>{code[index] || ""}</Text>
                  )}
                </View>
              );
            })}
          </View>

          {!isSuccess && (
            <Pressable onPress={handleResend} hitSlop={8} style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.7 }]}>
              <Text style={{ color: theme.primary, fontWeight: "700", fontSize: 14, textAlign: "center" }}>{t("resend")}</Text>
            </Pressable>
          )}
        </View>

        <View
          pointerEvents={isLoading || isSuccess ? "none" : "auto"}
          style={{ gap: 10, width: "100%", maxWidth: 340, alignSelf: "center", paddingBottom: 10, opacity: isLoading || isSuccess ? 0.5 : 1 }}
        >
          {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: "row", gap: 10 }}>
              {row.map((num) => (
                <Pressable
                  key={num}
                  onPress={() => handleKeyPress(num)}
                  style={({ pressed }) => [{ flex: 1, ...keypadButtonStyle }, pressed && { opacity: 0.85 }]}
                >
                  <Text style={{ fontSize: 22, fontWeight: "600", color: theme.text }}>{num}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => handleKeyPress("0")}
              style={({ pressed }) => [{ flex: 1, ...keypadButtonStyle }, pressed && { opacity: 0.85 }]}
            >
              <Text style={{ fontSize: 22, fontWeight: "600", color: theme.text }}>0</Text>
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [{ flex: 1, ...keypadButtonStyle }, pressed && { opacity: 0.85 }]}
            >
              <Icon name="delete" size={24} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default VerificationScreen;