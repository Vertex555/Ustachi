import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { SettingsHeader, SettingsScroll } from "../../components/settings/SettingsScreen";
import { SettingsSection } from "../../components/settings/SettingsRow";
import { SegmentedControl, SwitchRow, InfoNote, OptionList } from "../../components/settings/Controls";
import Icon from "../../components/Icon";
import { FONT_SCALE_STEPS } from "../../settings/logic";
import { PRESET_PALETTES } from "../../theme/palette";

export default function AppearanceSettings() {
  const { theme, mode, resolvedMode, setTheme, fontScale, setFontScale, reduceMotion, setReduceMotion, custom, setUiColors, resetUiColors } = useTheme();
  const { t, lang, changeLang, languages } = useTranslation();

  const themeOptions = [
    { value: "system", label: t("themeSystem"), icon: "smartphone" },
    { value: "light", label: t("themeLight"), icon: "sun" },
    { value: "dark", label: t("themeDark"), icon: "moon" },
  ];

  const languageOptions = languages.map((l) => ({ value: l.code, label: l.label }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SettingsHeader title={t("sectionAppearance")} subtitle={t("appearance")} />

      <SettingsScroll>
        {/* Mavzu */}
        <SettingsSection title={t("appearance")}>
          <View style={styles.pad}>
            <SegmentedControl
              value={mode}
              options={themeOptions.map((o) => ({ value: o.value, label: o.label }))}
              onChange={setTheme}
            />
            <View style={styles.hintRow}>
              <Icon name={mode === "system" ? "smartphone" : resolvedMode === "dark" ? "moon" : "sun"} size={15} color={theme.textTertiary} />
              <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, flex: 1 }}>
                {mode === "system" ? t("systemThemeNote") : themeOptions.find((o) => o.value === mode)?.label}
              </Text>
            </View>
          </View>
        </SettingsSection>

        {/* Til */}
        <SettingsSection title={t("sectionLanguage")}>
          <View style={styles.pad}>
            <OptionList options={languageOptions} value={lang} onChange={changeLang} columns={3} />
          </View>
        </SettingsSection>

        {/* Shrift o'lchami */}
        <SettingsSection title={t("fontSize")} note={t("fontSizeNote")}>
          <View style={styles.pad}>
            <View style={styles.samplesRow}>
              {FONT_SCALE_STEPS.map((s) => {
                const selected = Math.abs(s - fontScale) < 0.001;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setFontScale(s)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.sample,
                      {
                        backgroundColor: selected ? theme.primaryLight : theme.bgSecondary,
                        borderColor: selected ? theme.primary : theme.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: Math.round(theme.font.base * s), fontWeight: "800", color: theme.text }}>A</Text>
                    <Text style={{ fontSize: 10, color: theme.textTertiary, marginTop: 2 }}>{Math.round(s * 100)}%</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SettingsSection>

        {/* Harakatni kamaytirish */}
        <SettingsSection>
          <SwitchRow
            icon="motion"
            title={t("reduceMotion")}
            subtitle={t("reduceMotionNote")}
            value={reduceMotion}
            onValueChange={setReduceMotion}
            last
          />
        </SettingsSection>

        {/* Asosiy rang */}
        <SettingsSection title={t("accentColor")}>
          <View style={styles.pad}>
            <View style={styles.paletteWrap}>
              {PRESET_PALETTES.map((p) => {
                const selected = (custom.accent || "").toUpperCase() === p.accent;
                return (
                  <Pressable
                    key={p.accent}
                    onPress={() => setUiColors({ accent: p.accent })}
                    accessibilityRole="button"
                    accessibilityLabel={p.label}
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.swatch,
                      {
                        backgroundColor: p.accent,
                        borderColor: selected ? theme.text : "transparent",
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  />
                );
              })}
            </View>
            <View style={styles.resetRow}>
              <Pressable onPress={resetUiColors} style={({ pressed }) => [styles.resetBtn, { opacity: pressed ? 0.7 : 1 }]}>
                <Icon name="refresh-cw" size={14} color={theme.textSecondary} />
                <Text style={{ fontSize: theme.font.sm, color: theme.textSecondary, marginLeft: 6 }}>
                  {t("reset")}
                </Text>
              </Pressable>
            </View>
          </View>
        </SettingsSection>

        <InfoNote tone="info">
          {t("settingsSubtitle")}
        </InfoNote>
      </SettingsScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 14 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  samplesRow: { flexDirection: "row", gap: 8 },
  sample: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  paletteWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 3 },
  resetRow: { marginTop: 14, alignItems: "flex-start" },
  resetBtn: { flexDirection: "row", alignItems: "center" },
});
