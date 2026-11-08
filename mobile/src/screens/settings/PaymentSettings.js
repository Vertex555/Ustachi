import React, { useCallback, useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../../components/settings/SettingsScreen";
import { SettingsSection, SettingsRow } from "../../components/settings/SettingsRow";
import { InfoNote } from "../../components/settings/Controls";
import Icon from "../../components/Icon";
import { getPaymentMethods } from "../../services/settingsApi";

const METHOD_META = {
  click: { icon: "smartphone", label: "Click" },
  payme: { icon: "wallet", label: "Payme" },
};

export default function PaymentSettings() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [methods, setMethods] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPaymentMethods();
      const data = res?.data || res || {};
      setMethods({
        list: Array.isArray(data.methods) ? data.methods : [],
        // Server javobi: { methods: [{key,label,kind,configured}], cardStorage, cardPayments }
        cardPaymentsEnabled: data.cardPayments === true,
      });
    } catch {
      setMethods({ list: [], cardPaymentsEnabled: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Faqat SOZLANGAN (configured) usullarni ko'rsatamiz — soxta tanlov bo'lmasin
  const available = (methods?.list || []).filter((m) => m && m.configured);
  const none = !loading && available.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("payments")} subtitle={t("paymentMethods")} />

      <SettingsScroll refreshing={loading} onRefresh={load}>
        <SettingsSection title={t("paymentMethods")}>
          {loading ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : (
            available.map((m, i) => {
              const meta = METHOD_META[m.key] || { icon: "banknote", label: m.key };
              return (
                <SettingsRow
                  key={m.key || i}
                  icon={meta.icon}
                  title={m.label || meta.label}
                  subtitle={t(m.kind === "redirect" ? "paymentMethodRedirect" : "paymentMethodRedirect")}
                  right={<Icon name="check-circle" size={18} color={theme.success} />}
                  last={i === available.length - 1}
                />
              );
            })
          )}
        </SettingsSection>

        {none ? (
          <InfoNote tone="warn">
            {t("noPaymentProviders")}
          </InfoNote>
        ) : null}

        {methods && !methods.cardPaymentsEnabled ? (
          <InfoNote tone="info">
            {t("cardPaymentsDisabled")}
          </InfoNote>
        ) : null}

        <View style={{ height: 12 }} />

        <SettingsSection title={t("payments")}>
          <SettingsRow
            icon="credit-card"
            title={t("paymentCards")}
            onPress={() => navigation.navigate("Cards")}
          />
          <SettingsRow
            icon="receipt"
            title={t("paymentHistory")}
            onPress={() => navigation.navigate("Payment")}
            last
          />
        </SettingsSection>

        <InfoNote>
          {t("faqPaymentAnswer")}
        </InfoNote>
      </SettingsScroll>
    </View>
  );
}
