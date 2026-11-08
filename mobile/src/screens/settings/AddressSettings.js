import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll, EmptyBlock } from "../../components/settings/SettingsScreen";
import { SettingsSection, SettingsRow } from "../../components/settings/SettingsRow";
import { InfoNote, SubLabel } from "../../components/settings/Controls";
import AppButton from "../../components/AppButton";
import Icon from "../../components/Icon";
import { validateAddress } from "../../settings/logic";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../../services/settingsApi";

const EMPTY = { id: null, label: "", line: "", city: "", note: "", lat: "", lng: "", isDefault: false };

export default function AddressSettings() {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // null = yopiq, {id?} = forma ochiq
  const [errors, setErrors] = useState([]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await listAddresses();
      const rows = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setList(rows);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startAdd() {
    setErrors([]);
    setEditing(EMPTY);
  }

  function startEdit(a) {
    setErrors([]);
    setEditing({
      id: a.id,
      label: a.label || "",
      line: a.line || "",
      city: a.city || "",
      note: a.note || "",
      lat: a.lat == null ? "" : String(a.lat),
      lng: a.lng == null ? "" : String(a.lng),
      isDefault: !!a.isDefault,
    });
  }

  async function save() {
    const result = validateAddress(editing, { partial: false });
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    setSaving(true);
    try {
      const payload = {
        label: result.value.label,
        line: result.value.line,
        city: result.value.city,
        note: result.value.note,
        lat: result.value.lat ?? null,
        lng: result.value.lng ?? null,
      };
      if (editing.id) await updateAddress(editing.id, payload);
      else await createAddress(payload);
      setEditing(null);
      await load();
    } catch (err) {
      setErrors([err.message]);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(a) {
    Alert.alert(t("deleteAddressConfirm"), a.line, [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAddress(a.id);
            if (editing?.id === a.id) setEditing(null);
            await load();
          } catch (err) {
            Alert.alert(t("error"), err.message);
          }
        },
      },
    ]);
  }

  async function makeDefault(a) {
    try {
      await setDefaultAddress(a.id);
      await load();
    } catch (err) {
      Alert.alert(t("error"), err.message);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader
        title={t("addresses")}
        subtitle={t("addressesNote")}
        right={
          !editing ? (
            <Pressable
              onPress={startAdd}
              accessibilityRole="button"
              accessibilityLabel={t("addAddress")}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Icon name="plus" size={20} color={theme.textInverse} />
            </Pressable>
          ) : null
        }
      />

      <SettingsScroll refreshing={loading} onRefresh={load}>
        {/* Forma */}
        {editing ? (
          <View style={styles.form}>
            <SubLabel>{editing.id ? t("editAddress") : t("addAddress")}</SubLabel>

            <Field label={t("fieldAddress")} value={editing.line} onChange={(v) => setEditing({ ...editing, line: v })} placeholder="Toshkent, Chilonzor tumani, 5-uy" />
            <Field label={t("fieldCity")} value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} placeholder="Toshkent" />
            <Field label={t("fieldLabel")} value={editing.label} onChange={(v) => setEditing({ ...editing, label: v })} placeholder="Uy, Ish" />
            <Field label={t("fieldNote")} value={editing.note} onChange={(v) => setEditing({ ...editing, note: v })} placeholder="..." />

            <View style={styles.geoRow}>
              <View style={{ flex: 1 }}>
                <Field label={t("fieldLat")} value={editing.lat} onChange={(v) => setEditing({ ...editing, lat: v })} keyboardType="numeric" placeholder="41.2995" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label={t("fieldLng")} value={editing.lng} onChange={(v) => setEditing({ ...editing, lng: v })} keyboardType="numeric" placeholder="69.2401" />
              </View>
            </View>

            {errors.length ? (
              <InfoNote tone="danger">{errors.map((e) => t(e, e)).join("; ")}</InfoNote>
            ) : null}

            <View style={styles.formActions}>
              <AppButton
                label={t("cancel")}
                variant="ghost"
                full={false}
                onPress={() => {
                  setEditing(null);
                  setErrors([]);
                }}
                style={{ flex: 1 }}
              />
              <AppButton label={saving ? t("loading") : t("save")} full={false} onPress={save} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        {/* Ro'yxat */}
        {loading && !list.length ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
        ) : list.length === 0 && !editing ? (
          <EmptyBlock
            icon="map-pin"
            title={t("addressEmpty")}
            description={t("addressesNote")}
            action={<AppButton title={t("addAddress")} onPress={startAdd} icon="plus" />}
          />
        ) : list.length ? (
          <SettingsSection>
            {list.map((a, i) => (
              <SettingsRow
                key={a.id}
                icon={a.isDefault ? "check-circle" : "map-pin"}
                iconColor={a.isDefault ? theme.success : theme.textTertiary}
                title={a.label || a.line}
                subtitle={[a.line, a.city].filter(Boolean).join(" · ")}
                onPress={() => startEdit(a)}
                last={i === list.length - 1}
                right={
                  <View style={styles.rowActions}>
                    {!a.isDefault ? (
                      <Pressable onPress={() => makeDefault(a)} style={styles.iconBtn} accessibilityLabel={t("setDefault")}>
                        <Icon name="star" size={16} color={theme.primary} />
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => confirmDelete(a)} style={styles.iconBtn} accessibilityLabel={t("delete")}>
                      <Icon name="trash-outline" size={16} color={theme.danger || "#E11D48"} />
                    </Pressable>
                  </View>
                }
              />
            ))}
          </SettingsSection>
        ) : null}
      </SettingsScroll>
    </View>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginBottom: 6, marginLeft: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        style={[
          styles.input,
          { backgroundColor: theme.card, borderColor: theme.border, color: theme.text, fontSize: theme.font.base },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  form: { marginBottom: 20 },
  geoRow: { flexDirection: "row", gap: 10 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  formActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  rowActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 8 },
});
