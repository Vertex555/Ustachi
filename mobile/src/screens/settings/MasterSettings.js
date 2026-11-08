import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../../components/settings/SettingsScreen";
import { SettingsSection, SettingsRow } from "../../components/settings/SettingsRow";
import { OptionList, InfoNote, SwitchRow } from "../../components/settings/Controls";
import AppButton from "../../components/AppButton";
import { apiUrl, authHeaders } from "../../services/api";
import { updateMySettings, getMyEarnings } from "../../services/settingsApi";
import {
  validateMasterForm,
  MASTER_AVAILABILITY,
  COVERAGE_STEPS,
  MAX_SPECIALTIES,
} from "../../settings/logic";

export default function MasterSettings() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newSpec, setNewSpec] = useState("");
  const [earnings, setEarnings] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/masters/me"), { headers: authHeaders() });
      const data = await res.json();
      const m = data?.data?.master || data?.master || data?.data || null;
      if (m) {
        setForm({
          specialties: Array.isArray(m.specialties) ? m.specialties : [],
          coverageRadiusKm: m.coverageRadiusKm ?? COVERAGE_STEPS[2],
          availability: m.availability || "available",
          isPublished: m.isPublished !== false,
          verification: m.verification?.status || "none",
        });
      }
    } catch {}
    try {
      const e = await getMyEarnings();
      setEarnings(e?.data || null);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    const result = validateMasterForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      await updateMySettings({
        specialties: result.value.specialties,
        coverageRadiusKm: result.value.coverageRadiusKm,
        availability: result.value.availability,
      });
      await load();
    } catch (err) {
      Alert.alert(t("error"), err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(v) {
    setForm((f) => ({ ...f, isPublished: v }));
    try {
      await fetch(apiUrl("/api/masters/me"), {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ isPublished: v }),
      });
    } catch (err) {
      setForm((f) => ({ ...f, isPublished: !v }));
      Alert.alert(t("error"), err.message);
    }
  }

  if (!form) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const availabilityOptions = MASTER_AVAILABILITY.map((v) => ({
    value: v,
    label: t(v === "available" ? "availabilityAvailable" : v === "busy" ? "availabilityBusy" : "availabilityOff"),
  }));

  const coverageOptions = COVERAGE_STEPS.map((km) => ({ value: km, label: `${km} km` }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("masterSettings")} subtitle={t("masterSettingsNote")} />

      <SettingsScroll>
        {/* Profil holati */}
        <SettingsSection title={t("profileStatus")}>
          <SwitchRow
            icon={form.isPublished ? "eye" : "eye-off"}
            title={form.isPublished ? t("profilePublished") : t("profileHidden")}
            value={form.isPublished}
            onValueChange={togglePublished}
          />
          <SettingsRow
            icon={form.verification === "approved" ? "badge-check" : "shield-check"}
            title={t("verification")}
            value={t(`verification_${form.verification}`, form.verification)}
            disabled
            last
          />
        </SettingsSection>

        {/* Holat */}
        <SettingsSection title={t("availability")}>
          <View style={styles.pad}>
            <OptionList options={availabilityOptions} value={form.availability} onChange={(v) => setForm({ ...form, availability: v })} />
          </View>
        </SettingsSection>

        {/* Xizmat turi */}
        <SettingsSection title={t("specialties")} note={t("specialtiesNote")}>
          <View style={styles.pad}>
            <View style={styles.chips}>
              {form.specialties.map((s) => (
                <View key={s} style={[styles.chip, { backgroundColor: theme.primaryLight, borderColor: theme.primary }]}>
                  <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.primary }}>{s}</Text>
                  <Text
                    onPress={() => setForm({ ...form, specialties: form.specialties.filter((x) => x !== s) })}
                    accessibilityRole="button"
                    accessibilityLabel={t("delete")}
                    style={{ fontSize: 15, color: theme.primary, marginLeft: 6, fontWeight: "800" }}
                  >
                    ×
                  </Text>
                </View>
              ))}
              {form.specialties.length === 0 ? (
                <Text style={{ fontSize: theme.font.sm, color: theme.textTertiary }}>—</Text>
              ) : null}
            </View>

            <View style={styles.addRow}>
              <TextInput
                value={newSpec}
                onChangeText={setNewSpec}
                placeholder={t("specialtiesNote")}
                placeholderTextColor={theme.textTertiary}
                maxLength={40}
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
              />
              <AppButton
                label={t("add")}
                size="sm"
                full={false}
                onPress={() => {
                  const v = newSpec.trim();
                  if (!v) return;
                  if (form.specialties.length >= MAX_SPECIALTIES) {
                    setErrors(["specialtiesTooMany"]);
                    return;
                  }
                  if (form.specialties.includes(v)) { setNewSpec(""); return; }
                  setForm({ ...form, specialties: [...form.specialties, v] });
                  setNewSpec("");
                  setErrors([]);
                }}
                style={{ height: 44 }}
              />
            </View>
          </View>
        </SettingsSection>

        {/* Ish radiusi */}
        <SettingsSection title={t("coverageRadius")}>
          <View style={styles.pad}>
            <View style={styles.chips}>
              {coverageOptions.map((o) => {
                const selected = form.coverageRadiusKm === o.value;
                return (
                  <Text
                    key={o.value}
                    onPress={() => setForm({ ...form, coverageRadiusKm: o.value })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.coverage,
                      {
                        backgroundColor: selected ? theme.primaryLight : theme.bgSecondary,
                        borderColor: selected ? theme.primary : theme.border,
                        color: selected ? theme.primary : theme.textSecondary,
                      },
                    ]}
                  >
                    {o.label}
                  </Text>
                );
              })}
            </View>
          </View>
        </SettingsSection>

        {errors.length ? <InfoNote tone="danger">{errors.map((e) => t(e, e)).join("; ")}</InfoNote> : null}

        <AppButton label={saving ? t("loading") : t("save")} onPress={save} loading={saving} />

        {/* Daromad */}
        {earnings ? (
          <>
            <View style={{ height: 24 }} />
            <SettingsSection title={t("earnings")}>
              <SettingsRow icon="banknote" title={t("earningsGross")} value={String(earnings.gross ?? 0)} disabled />
              <SettingsRow icon="percent" title={t("earningsCommission")} value={String(earnings.commission ?? 0)} disabled />
              <SettingsRow
                icon="wallet"
                title={t("earningsNet")}
                value={String(earnings.net ?? 0)}
                disabled
                last
              />
            </SettingsSection>
            <InfoNote>
              {t("earningsPendingNote")}
            </InfoNote>
          </>
        ) : null}
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 14 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  coverage: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: "700",
    overflow: "hidden",
  },
  addRow: { flexDirection: "row", gap: 8, marginTop: 12, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
});
